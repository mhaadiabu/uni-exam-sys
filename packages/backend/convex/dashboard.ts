import { query } from "./_generated/server";
import { v } from "convex/values";

import { computeAttendanceCounters } from "./lib/attendance";
import { getOptionalScopedUniversityId, getScopedUniversityId, requireRole, requireSessionUser } from "./lib/auth";

export const adminDashboard = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);

    const [students, invigilators, rooms, complaints, schedules, notifications, registers] = await Promise.all([
      ctx.db
        .query("students")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
      ctx.db
        .query("invigilators")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
      ctx.db
        .query("rooms")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
      ctx.db
        .query("complaints")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
      ctx.db
        .query("examSchedules")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
      ctx.db
        .query("notifications")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
      ctx.db
        .query("attendanceRegisters")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
    ]);

    const attendanceRows = await Promise.all(
      registers.map(async (register) => {
        const rows = await ctx.db
          .query("examAttendance")
          .withIndex("by_register", (q) => q.eq("registerId", register._id))
          .collect();

        const counters = computeAttendanceCounters(rows, rows.length || 1);
        return {
          registerId: register._id,
          status: register.status,
          counters,
          finalizedAt: register.finalizedAt,
          roomId: register.roomId,
        };
      }),
    );

    const lowAttendanceRooms = attendanceRows
      .filter((row) => row.counters.presentEquivalent + row.counters.absent > 0)
      .map((row) => {
        const denominator = row.counters.presentEquivalent + row.counters.absent;
        const rate = denominator === 0 ? 0 : (row.counters.presentEquivalent / denominator) * 100;
        return {
          ...row,
          attendanceRate: Number(rate.toFixed(2)),
        };
      })
      .filter((row) => row.attendanceRate < 70)
      .sort((a, b) => a.attendanceRate - b.attendanceRate)
      .slice(0, 5);

    const absentStudents = await Promise.all(
      registers.map(async (register) => {
        const rows = await ctx.db
          .query("examAttendance")
          .withIndex("by_register", (q) => q.eq("registerId", register._id))
          .collect();

        const absentRows = rows.filter((row) => row.status === "absent");
        return await Promise.all(
          absentRows.map(async (row) => {
            const student = await ctx.db.get(row.studentId);
            return {
              registerId: register._id,
              studentId: student?.studentId ?? "Unknown",
              fullName: student?.fullName ?? "Unknown",
            };
          }),
        );
      }),
    );

    return {
      metrics: {
        totalStudents: students.length,
        totalInvigilators: invigilators.length,
        totalRooms: rooms.length,
        pendingComplaints: complaints.filter((complaint) => complaint.status !== "resolved").length,
        seatingStatus: schedules.filter((schedule) => schedule.frozenSeating).length,
        notifications: notifications.length,
      },
      attendance: {
        registers: attendanceRows,
        lowAttendanceRooms,
        absentStudents: absentStudents.flat(),
      },
    };
  },
});

export const invigilatorDashboard = query({
  args: {
    universityId: v.optional(v.id("universities")),
    todayDate: v.string(),
    invigilatorId: v.optional(v.id("invigilators")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["invigilator", "super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);

    const invigilators = await ctx.db
      .query("invigilators")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const invigilator = args.invigilatorId
      ? invigilators.find((candidate) => candidate._id === args.invigilatorId)
      : invigilators.find((candidate) => candidate.userId === session.user._id);

    if (!invigilator || invigilator.universityId !== scoped) {
      throw new Error("Invigilator profile not found");
    }

    const assignments = await ctx.db
      .query("invigilatorAssignments")
      .withIndex("by_invigilator", (q) => q.eq("invigilatorId", invigilator._id))
      .collect();

    const todayAssignments = assignments.filter((assignment) => assignment.assignmentDate === args.todayDate);

    const assignmentRows = await Promise.all(
      assignments.map(async (assignment) => {
        const [schedule, room, register] = await Promise.all([
          ctx.db.get(assignment.examScheduleId),
          ctx.db.get(assignment.roomId),
          ctx.db
            .query("attendanceRegisters")
            .withIndex("by_exam_room", (q) =>
              q.eq("examScheduleId", assignment.examScheduleId).eq("roomId", assignment.roomId),
            )
            .unique(),
        ]);

        return {
          assignment,
          schedule,
          room,
          attendanceStatus: register?.status ?? "draft",
        };
      }),
    );

    return {
      todayAssignments: assignmentRows.filter((row) => row.assignment.assignmentDate === args.todayDate),
      upcomingAssignments: assignmentRows.filter((row) => row.assignment.assignmentDate > args.todayDate),
      history: assignmentRows.filter((row) => row.assignment.assignmentDate < args.todayDate),
    };
  },
});

export const studentDashboard = query({
  args: {
    universityId: v.optional(v.id("universities")),
    studentDocId: v.optional(v.id("students")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["student", "super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);
    const students = await ctx.db
      .query("students")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const student = args.studentDocId
      ? students.find((candidate) => candidate._id === args.studentDocId)
      : students.find((candidate) => candidate.userId === session.user._id);

    if (!student || student.universityId !== scoped) {
      return null;
    }

    const [program, allSeats, complaints, idCard] = await Promise.all([
      ctx.db.get(student.programId),
      ctx.db.query("seatingAssignments").collect(),
      ctx.db.query("complaints").withIndex("by_submitter", (q) => q.eq("submittedByUserId", session.user._id)).collect(),
      ctx.db
        .query("studentIdCards")
        .withIndex("by_student", (q) => q.eq("studentId", student._id))
        .unique(),
    ]);

    const mySeats = allSeats.filter((seat) => seat.studentId === student._id);

    const timetable = await Promise.all(
      mySeats.map(async (seat) => {
        const schedule = await ctx.db.get(seat.examScheduleId);
        const [course, room] = await Promise.all([
          schedule ? ctx.db.get(schedule.courseId) : Promise.resolve(null),
          ctx.db.get(seat.roomId),
        ]);

        return {
          seatNumber: seat.seatNumber,
          examDate: schedule?.examDate,
          startTime: schedule?.startTime,
          endTime: schedule?.endTime,
          courseCode: course?.code,
          courseName: course?.name,
          roomName: room?.name,
        };
      }),
    );

    return {
      student,
      program,
      feeStatus: {
        status: student.feeStatus,
        outstandingBalance: student.outstandingBalance,
      },
      timetable,
      complaints,
      idCard,
      isAutoEnrolled: student.createdAt === student.updatedAt,
    };
  },
});

export const financeDashboard = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["finance", "super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);

    const [students, payments] = await Promise.all([
      ctx.db
        .query("students")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
      ctx.db
        .query("paymentRecords")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
    ]);

    return {
      clearance: {
        totalStudents: students.length,
        cleared: students.filter((student) => student.feeStatus === "cleared").length,
        outstanding: students.filter((student) => student.feeStatus === "outstanding").length,
      },
      payments,
    };
  },
});

export const superAdminDashboard = query({
  args: {},
  handler: async (ctx) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin"]);

    const [universities, users, audit] = await Promise.all([
      ctx.db.query("universities").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("auditLogs").collect(),
    ]);

    const usageByTenant = universities.map((university) => {
      const tenantUsers = users.filter((user) => user.universityId === university._id);
      const tenantAudit = audit.filter((log) => log.universityId === university._id);
      return {
        universityId: university._id,
        universityName: university.name,
        active: university.isActive,
        users: tenantUsers.length,
        auditEvents: tenantAudit.length,
      };
    });

    return {
      totalUniversities: universities.length,
      totalUsers: users.length,
      usageByTenant,
      latestAudit: audit
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20),
    };
  },
});

export const listAuditLogs = query({
  args: {
    universityId: v.optional(v.id("universities")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const scoped = getOptionalScopedUniversityId(session.user, args.universityId);
    const limit = Math.min(args.limit ?? 200, 500);

    const query = scoped
      ? ctx.db.query("auditLogs").withIndex("by_university", (q) =>
          q.eq("universityId", scoped),
        )
      : ctx.db.query("auditLogs");

    const logs = await query.order("desc").take(limit);

    const actorIds = Array.from(
      new Set(logs.map((log) => log.actorUserId).filter((id): id is NonNullable<typeof id> => id !== undefined)),
    );
    const actors = await Promise.all(actorIds.map((id) => ctx.db.get(id)));
    const actorMap = new Map(actorIds.map((id, i) => [id, actors[i]]));

    return logs.map((log) => ({
      ...log,
      actor: log.actorUserId
        ? (actorMap.get(log.actorUserId)
            ? { _id: log.actorUserId, fullName: actorMap.get(log.actorUserId)?.fullName ?? null, role: actorMap.get(log.actorUserId)?.role ?? null }
            : null)
        : null,
    }));
  },
});
