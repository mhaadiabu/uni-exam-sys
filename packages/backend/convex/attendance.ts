import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { computeAttendanceCounters } from "./lib/attendance";
import { getScopedUniversityId, requireRole, requireSessionUser, requireUniversityScope } from "./lib/auth";

const attendanceStatusValidator = v.union(
  v.literal("present"),
  v.literal("absent"),
  v.literal("late"),
  v.literal("excused"),
);

export const getRegisterForExamRoom = query({
  args: {
    examScheduleId: v.id("examSchedules"),
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const schedule = await ctx.db.get(args.examScheduleId);
    const room = await ctx.db.get(args.roomId);

    if (!schedule || !room) {
      throw new Error("Exam schedule or room not found");
    }

    requireUniversityScope(session.user, schedule.universityId);

    const register = await ctx.db
      .query("attendanceRegisters")
      .withIndex("by_exam_room", (q) =>
        q.eq("examScheduleId", args.examScheduleId).eq("roomId", args.roomId),
      )
      .unique();

    if (!register) {
      return null;
    }

    const attendanceRows = await ctx.db
      .query("examAttendance")
      .withIndex("by_register", (q) => q.eq("registerId", register._id))
      .collect();

    const counters = computeAttendanceCounters(attendanceRows, attendanceRows.length || 1);
    const students = await Promise.all(
      attendanceRows.map(async (row) => {
        const student = await ctx.db.get(row.studentId);
        return {
          attendanceId: row._id,
          studentDocId: row.studentId,
          studentId: student?.studentId ?? "Unknown",
          fullName: student?.fullName ?? "Unknown",
          indexNumber: student?.indexNumber ?? "Unknown",
          status: row.status,
          note: row.note,
          markedAt: row.markedAt,
        };
      }),
    );

    return {
      register,
      counters,
      students,
    };
  },
});

export const createRegister = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    examScheduleId: v.id("examSchedules"),
    roomId: v.id("rooms"),
    invigilatorId: v.id("invigilators"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin", "invigilator"]);

    const schedule = await ctx.db.get(args.examScheduleId);
    const room = await ctx.db.get(args.roomId);
    const invigilator = await ctx.db.get(args.invigilatorId);

    if (!schedule || !room || !invigilator) {
      throw new Error("Schedule, room, or invigilator not found");
    }

    const scoped = getScopedUniversityId(session.user, args.universityId);
    if (schedule.universityId !== scoped || room.universityId !== scoped || invigilator.universityId !== scoped) {
      throw new Error("Cross-tenant access denied");
    }

    const existing = await ctx.db
      .query("attendanceRegisters")
      .withIndex("by_exam_room", (q) =>
        q.eq("examScheduleId", args.examScheduleId).eq("roomId", args.roomId),
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    const registerId = await ctx.db.insert("attendanceRegisters", {
      universityId: scoped,
      examScheduleId: args.examScheduleId,
      roomId: args.roomId,
      invigilatorId: args.invigilatorId,
      status: "draft",
      signature: undefined,
      finalizedAt: undefined,
      submittedToAdminAt: undefined,
      createdAt: now,
      updatedAt: now,
    });

    const assignments = await ctx.db
      .query("seatingAssignments")
      .withIndex("by_exam_room", (q) =>
        q.eq("examScheduleId", args.examScheduleId).eq("roomId", args.roomId),
      )
      .collect();

    for (const assignment of assignments) {
      await ctx.db.insert("examAttendance", {
        universityId: scoped,
        registerId,
        examScheduleId: args.examScheduleId,
        roomId: args.roomId,
        studentId: assignment.studentId,
        status: "absent",
        note: undefined,
        markedAt: now,
        markedByInvigilatorId: args.invigilatorId,
      });
    }

    await writeAuditLog(ctx, {
      action: "attendance.register_created",
      entityType: "attendanceRegisters",
      entityId: registerId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
      context: {
        examScheduleId: args.examScheduleId,
        roomId: args.roomId,
      },
    });

    return registerId;
  },
});

export const markAttendance = mutation({
  args: {
    registerId: v.id("attendanceRegisters"),
    studentId: v.id("students"),
    status: attendanceStatusValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin", "invigilator"]);

    const register = await ctx.db.get(args.registerId);
    if (!register) {
      throw new Error("Attendance register not found");
    }

    requireUniversityScope(session.user, register.universityId);

    if (register.status === "finalized" && session.user.role === "invigilator") {
      throw new Error("Finalized attendance cannot be changed by invigilator");
    }

    const row = await ctx.db
      .query("examAttendance")
      .withIndex("by_register_student", (q) => q.eq("registerId", args.registerId).eq("studentId", args.studentId))
      .unique();

    if (!row) {
      throw new Error("Attendance row not found");
    }

    const invigilatorProfile =
      session.user.role === "invigilator"
        ? (await ctx.db.query("invigilators").collect()).find((candidate) => candidate.userId === session.user._id)
        : await ctx.db.get(register.invigilatorId);

    if (!invigilatorProfile) {
      throw new Error("Invigilator profile not found");
    }

    await ctx.db.patch(row._id, {
      status: args.status,
      note: args.note,
      markedAt: Date.now(),
      markedByInvigilatorId: invigilatorProfile._id,
    });

    await ctx.db.insert("attendanceActionLogs", {
      universityId: register.universityId,
      registerId: args.registerId,
      studentId: args.studentId,
      oldStatus: row.status,
      newStatus: args.status,
      reason: args.note,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      createdAt: Date.now(),
      isOverride: session.user.role !== "invigilator",
    });

    await ctx.db.patch(register._id, {
      updatedAt: Date.now(),
    });

    return row._id;
  },
});

export const bulkMarkAttendance = mutation({
  args: {
    registerId: v.id("attendanceRegisters"),
    status: attendanceStatusValidator,
    studentIds: v.array(v.id("students")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin", "invigilator"]);

    const register = await ctx.db.get(args.registerId);
    if (!register) {
      throw new Error("Attendance register not found");
    }

    requireUniversityScope(session.user, register.universityId);

    if (register.status === "finalized" && session.user.role === "invigilator") {
      throw new Error("Finalized attendance cannot be changed by invigilator");
    }

    const invigilatorProfile =
      session.user.role === "invigilator"
        ? (await ctx.db.query("invigilators").collect()).find((candidate) => candidate.userId === session.user._id)
        : await ctx.db.get(register.invigilatorId);

    if (!invigilatorProfile) {
      throw new Error("Invigilator profile not found");
    }

    const now = Date.now();

    for (const studentId of args.studentIds) {
      const row = await ctx.db
        .query("examAttendance")
        .withIndex("by_register_student", (q) => q.eq("registerId", args.registerId).eq("studentId", studentId))
        .unique();

      if (!row) {
        continue;
      }

      await ctx.db.patch(row._id, {
        status: args.status,
        note: args.note,
        markedAt: now,
        markedByInvigilatorId: invigilatorProfile._id,
      });

      await ctx.db.insert("attendanceActionLogs", {
        universityId: register.universityId,
        registerId: args.registerId,
        studentId,
        oldStatus: row.status,
        newStatus: args.status,
        reason: args.note,
        actorUserId: session.user._id,
        actorRole: session.user.role,
        createdAt: now,
        isOverride: session.user.role !== "invigilator",
      });
    }

    await ctx.db.insert("attendanceBulkActions", {
      universityId: register.universityId,
      registerId: args.registerId,
      actionType: "bulk_mark",
      payload: JSON.stringify({ status: args.status, studentIds: args.studentIds.length }),
      performedByUserId: session.user._id,
      createdAt: now,
    });

    await ctx.db.patch(register._id, {
      updatedAt: now,
    });

    return {
      updated: args.studentIds.length,
    };
  },
});

export const queueOfflineAction = mutation({
  args: {
    registerId: v.id("attendanceRegisters"),
    invigilatorId: v.id("invigilators"),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["invigilator"]);

    const register = await ctx.db.get(args.registerId);
    const invigilator = await ctx.db.get(args.invigilatorId);
    if (!register || !invigilator) {
      throw new Error("Register or invigilator not found");
    }

    requireUniversityScope(session.user, register.universityId);

    return await ctx.db.insert("attendanceSyncQueue", {
      universityId: register.universityId,
      registerId: args.registerId,
      invigilatorId: args.invigilatorId,
      payload: args.payload,
      status: "pending",
      createdAt: Date.now(),
      syncedAt: undefined,
    });
  },
});

export const syncOfflineQueue = mutation({
  args: {
    registerId: v.id("attendanceRegisters"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["invigilator", "super_admin", "university_admin"]);

    const register = await ctx.db.get(args.registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    requireUniversityScope(session.user, register.universityId);

    const queue = await ctx.db
      .query("attendanceSyncQueue")
      .withIndex("by_register", (q) => q.eq("registerId", args.registerId))
      .collect();

    const pending = queue.filter((item) => item.status === "pending");
    const now = Date.now();

    for (const item of pending) {
      if (register.status === "finalized") {
        await ctx.db.patch(item._id, {
          status: "conflict",
          syncedAt: now,
        });
        continue;
      }

      await ctx.db.patch(item._id, {
        status: "synced",
        syncedAt: now,
      });
    }

    return {
      pending: pending.length,
      synced: pending.filter((item) => register.status !== "finalized").length,
      conflicts: pending.filter((item) => register.status === "finalized").length,
    };
  },
});

export const finalizeAttendance = mutation({
  args: {
    registerId: v.id("attendanceRegisters"),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["invigilator", "super_admin", "university_admin"]);

    const register = await ctx.db.get(args.registerId);
    if (!register) {
      throw new Error("Register not found");
    }

    requireUniversityScope(session.user, register.universityId);

    if (register.status === "finalized") {
      throw new Error("Attendance already finalized");
    }

    const now = Date.now();
    await ctx.db.patch(register._id, {
      status: "finalized",
      signature: args.signature,
      finalizedAt: now,
      submittedToAdminAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "attendance.finalized",
      entityType: "attendanceRegisters",
      entityId: register._id,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: register.universityId,
      context: {
        signatureLength: args.signature.length,
      },
    });

    return register._id;
  },
});

export const attendanceSummary = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const registers = await ctx.db
      .query("attendanceRegisters")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const rows = await Promise.all(
      registers.map(async (register) => {
        const attendanceRows = await ctx.db
          .query("examAttendance")
          .withIndex("by_register", (q) => q.eq("registerId", register._id))
          .collect();
        const counters = computeAttendanceCounters(attendanceRows, attendanceRows.length || 1);
        const room = await ctx.db.get(register.roomId);
        const schedule = await ctx.db.get(register.examScheduleId);
        return {
          registerId: register._id,
          examScheduleId: register.examScheduleId,
          roomId: register.roomId,
          invigilatorId: register.invigilatorId,
          roomName: room?.name ?? "Unknown Room",
          status: register.status,
          counters,
          finalizedAt: register.finalizedAt,
          examDate: schedule?.examDate,
          startTime: schedule?.startTime,
          endTime: schedule?.endTime,
        };
      }),
    );

    const totals = rows.reduce(
      (acc, row) => {
        acc.present += row.counters.present;
        acc.absent += row.counters.absent;
        acc.late += row.counters.late;
        acc.excused += row.counters.excused;
        return acc;
      },
      {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      },
    );

    return {
      totals,
      rows,
    };
  },
});
