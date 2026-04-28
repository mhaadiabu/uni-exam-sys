import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

import { writeAuditLog } from "./lib/audit";
import { getScopedUniversityId, requireRole, requireSessionUser, requireUniversityScope } from "./lib/auth";
import { allocateSeats, orderStudents } from "./lib/seating";

const seatingModeValidator = v.union(v.literal("sequential"), v.literal("shuffled"));

export const generateSeating = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    examScheduleId: v.id("examSchedules"),
    mode: seatingModeValidator,
    seed: v.optional(v.number()),
    roomIds: v.optional(v.array(v.id("rooms"))),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const schedule = await ctx.db.get(args.examScheduleId);
    if (!schedule) {
      throw new Error("Exam schedule not found");
    }

    const scopedUniversityId = getScopedUniversityId(session.user, args.universityId);
    if (schedule.universityId !== scopedUniversityId) {
      throw new Error("Schedule does not belong to selected university");
    }

    if (schedule.frozenSeating) {
      throw new Error("Seating is frozen for this exam");
    }

    const students = await ctx.db
      .query("students")
      .withIndex("by_program", (q) => q.eq("programId", schedule.programId))
      .collect();

    const clearedStudents = students.filter((student) => student.feeStatus === "cleared" || student.lateRegistration);

    const roomIds =
      args.roomIds && args.roomIds.length > 0
        ? args.roomIds
        : await getDefaultRoomIds(ctx, args.examScheduleId, schedule.roomId);

    const rooms = await Promise.all(roomIds.map((roomId) => ctx.db.get(roomId)));
    const roomSlots: Array<{ roomId: Id<"rooms">; roomCode: string; capacity: number }> = [];
    for (const room of rooms) {
      if (!room || room.universityId !== scopedUniversityId || !room.isActive) {
        continue;
      }

      roomSlots.push({
        roomId: room._id,
        roomCode: room.code,
        capacity: room.capacity,
      });
    }

    if (roomSlots.length === 0) {
      throw new Error("No valid rooms found for seating allocation");
    }

    const orderedStudents = orderStudents(
      clearedStudents.map((student) => ({
        studentId: student._id,
        indexNumber: student.indexNumber,
      })),
      args.mode,
      args.seed,
    );

    const assignments = allocateSeats(orderedStudents, roomSlots);

    const existingArrangements = await ctx.db
      .query("seatingArrangements")
      .withIndex("by_exam", (q) => q.eq("examScheduleId", args.examScheduleId))
      .collect();
    const nextVersion = existingArrangements.length + 1;
    const now = Date.now();

    const arrangementId = await ctx.db.insert("seatingArrangements", {
      universityId: scopedUniversityId,
      examScheduleId: args.examScheduleId,
      mode: args.mode,
      seed: args.seed,
      frozen: false,
      version: nextVersion,
      generatedByUserId: session.user._id,
      generatedAt: now,
    });

    const existingAssignments = await ctx.db
      .query("seatingAssignments")
      .withIndex("by_exam", (q) => q.eq("examScheduleId", args.examScheduleId))
      .collect();

    for (const assignment of existingAssignments) {
      await ctx.db.delete(assignment._id);
    }

    for (const assignment of assignments) {
      await ctx.db.insert("seatingAssignments", {
        universityId: scopedUniversityId,
        examScheduleId: args.examScheduleId,
        arrangementId,
        roomId: assignment.roomId,
        studentId: assignment.studentId,
        seatNumber: assignment.seatNumber,
        generatedAt: now,
      });
    }

    await writeAuditLog(ctx, {
      action: existingAssignments.length > 0 ? "seating.regenerated" : "seating.generated",
      entityType: "seatingArrangements",
      entityId: arrangementId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scopedUniversityId,
      context: {
        mode: args.mode,
        seed: args.seed,
        assignments: assignments.length,
        version: nextVersion,
      },
    });

    return {
      arrangementId,
      assignmentsCount: assignments.length,
      studentCount: clearedStudents.length,
      version: nextVersion,
    };
  },
});

export const freezeSeating = mutation({
  args: {
    examScheduleId: v.id("examSchedules"),
    frozen: v.boolean(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const schedule = await ctx.db.get(args.examScheduleId);
    if (!schedule) {
      throw new Error("Exam schedule not found");
    }

    requireUniversityScope(session.user, schedule.universityId);

    await ctx.db.patch(args.examScheduleId, {
      frozenSeating: args.frozen,
      updatedAt: Date.now(),
    });

    const arrangements = await ctx.db
      .query("seatingArrangements")
      .withIndex("by_exam", (q) => q.eq("examScheduleId", args.examScheduleId))
      .collect();

    for (const arrangement of arrangements) {
      await ctx.db.patch(arrangement._id, {
        frozen: args.frozen,
      });
    }

    await writeAuditLog(ctx, {
      action: args.frozen ? "seating.frozen" : "seating.unfrozen",
      entityType: "examSchedules",
      entityId: args.examScheduleId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: schedule.universityId,
    });

    return args.examScheduleId;
  },
});

export const getSeatingChart = query({
  args: {
    examScheduleId: v.id("examSchedules"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const schedule = await ctx.db.get(args.examScheduleId);
    if (!schedule) {
      throw new Error("Exam schedule not found");
    }

    requireUniversityScope(session.user, schedule.universityId);

    const assignments = await ctx.db
      .query("seatingAssignments")
      .withIndex("by_exam", (q) => q.eq("examScheduleId", args.examScheduleId))
      .collect();

    const chart = await Promise.all(
      assignments.map(async (assignment) => {
        const [student, room] = await Promise.all([
          ctx.db.get(assignment.studentId),
          ctx.db.get(assignment.roomId),
        ]);

        return {
          assignmentId: assignment._id,
          studentId: student?.studentId ?? "Unknown",
          studentName: student?.fullName ?? "Unknown",
          indexNumber: student?.indexNumber ?? "Unknown",
          roomName: room?.name ?? "Unknown Room",
          roomCode: room?.code ?? "N/A",
          seatNumber: assignment.seatNumber,
        };
      }),
    );

    const sorted = chart.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));

    return {
      frozen: schedule.frozenSeating,
      rows: sorted,
    };
  },
});

async function getDefaultRoomIds(
  ctx: MutationCtx,
  examScheduleId: Id<"examSchedules">,
  directRoomId?: Id<"rooms">,
) {
  const allocationRows = await ctx.db
    .query("examRoomAllocations")
    .withIndex("by_exam", (q) => q.eq("examScheduleId", examScheduleId))
    .collect();

  const fromAllocations = allocationRows.map((row) => row.roomId);
  if (fromAllocations.length > 0) {
    return fromAllocations;
  }

  if (directRoomId) {
    return [directRoomId];
  }

  throw new Error("No rooms assigned to this exam schedule");
}
