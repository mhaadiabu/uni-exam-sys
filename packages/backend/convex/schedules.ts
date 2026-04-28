import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { getScopedUniversityId, requireRole, requireSessionUser, requireUniversityScope } from "./lib/auth";
import { rangesOverlap } from "./lib/time";

const scheduleStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("ongoing"),
  v.literal("completed"),
);

export const listSchedules = query({
  args: {
    universityId: v.optional(v.id("universities")),
    programId: v.optional(v.id("programs")),
    examDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const rows = await ctx.db
      .query("examSchedules")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const filtered = rows.filter((row) => {
      if (args.programId && row.programId !== args.programId) {
        return false;
      }
      if (args.examDate && row.examDate !== args.examDate) {
        return false;
      }
      return true;
    });

    const enriched = await Promise.all(
      filtered.map(async (row) => {
        const [course, program, room, invigilator] = await Promise.all([
          ctx.db.get(row.courseId),
          ctx.db.get(row.programId),
          row.roomId ? ctx.db.get(row.roomId) : Promise.resolve(null),
          row.invigilatorId ? ctx.db.get(row.invigilatorId) : Promise.resolve(null),
        ]);

        return {
          ...row,
          course,
          program,
          room,
          invigilator,
        };
      }),
    );

    return enriched;
  },
});

export const getRoleTimetable = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const schedules = await ctx.db
      .query("examSchedules")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    let visibleSchedules = schedules;

    if (session.user.role === "student") {
      const student = (await ctx.db.query("students").collect()).find(
        (candidate) => candidate.userId === session.user._id,
      );

      if (!student) {
        return [];
      }

      visibleSchedules = schedules.filter((schedule) => schedule.programId === student.programId);
    } else if (session.user.role === "invigilator") {
      const profile = (await ctx.db.query("invigilators").collect()).find(
        (candidate) => candidate.userId === session.user._id,
      );

      if (!profile) {
        return [];
      }

      visibleSchedules = schedules.filter((schedule) => schedule.invigilatorId === profile._id);
    }

    return await Promise.all(
      visibleSchedules.map(async (schedule) => {
        const [course, program, room, invigilator] = await Promise.all([
          ctx.db.get(schedule.courseId),
          ctx.db.get(schedule.programId),
          schedule.roomId ? ctx.db.get(schedule.roomId) : Promise.resolve(null),
          schedule.invigilatorId ? ctx.db.get(schedule.invigilatorId) : Promise.resolve(null),
        ]);

        return {
          ...schedule,
          course,
          program,
          room,
          invigilator,
        };
      }),
    );
  },
});

export const createSchedule = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    courseId: v.id("courses"),
    programId: v.id("programs"),
    examDate: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    roomId: v.optional(v.id("rooms")),
    invigilatorId: v.optional(v.id("invigilators")),
    status: scheduleStatusValidator,
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);

    const program = await ctx.db.get(args.programId);
    const course = await ctx.db.get(args.courseId);
    if (!program || program.universityId !== scoped) {
      throw new Error("Program does not belong to selected university");
    }
    if (!course || course.universityId !== scoped) {
      throw new Error("Course does not belong to selected university");
    }

    if (args.roomId) {
      const room = await ctx.db.get(args.roomId);
      if (!room || room.universityId !== scoped) {
        throw new Error("Room does not belong to selected university");
      }

      const roomSchedules = await ctx.db
        .query("examSchedules")
        .withIndex("by_room_exam_date", (q) => q.eq("roomId", args.roomId).eq("examDate", args.examDate))
        .collect();

      const roomConflict = roomSchedules.find((schedule) =>
        rangesOverlap(schedule.startTime, schedule.endTime, args.startTime, args.endTime),
      );

      if (roomConflict) {
        throw new Error("Room scheduling conflict detected");
      }
    }

    if (args.invigilatorId) {
      const invigilator = await ctx.db.get(args.invigilatorId);
      if (!invigilator || invigilator.universityId !== scoped) {
        throw new Error("Invigilator does not belong to selected university");
      }

      const invigilatorSchedules = await ctx.db
        .query("examSchedules")
        .withIndex("by_invigilator_exam_date", (q) =>
          q.eq("invigilatorId", args.invigilatorId).eq("examDate", args.examDate),
        )
        .collect();

      const invigilatorConflict = invigilatorSchedules.find((schedule) =>
        rangesOverlap(schedule.startTime, schedule.endTime, args.startTime, args.endTime),
      );

      if (invigilatorConflict) {
        throw new Error("Invigilator assignment conflict detected");
      }
    }

    const now = Date.now();
    const scheduleId = await ctx.db.insert("examSchedules", {
      universityId: scoped,
      courseId: args.courseId,
      programId: args.programId,
      examDate: args.examDate,
      startTime: args.startTime,
      endTime: args.endTime,
      roomId: args.roomId,
      invigilatorId: args.invigilatorId,
      status: args.status,
      frozenSeating: false,
      createdAt: now,
      updatedAt: now,
    });

    if (args.roomId) {
      const room = await ctx.db.get(args.roomId);
      await ctx.db.insert("examRoomAllocations", {
        universityId: scoped,
        examScheduleId: scheduleId,
        roomId: args.roomId,
        capacityUsed: room?.capacity ?? 0,
        createdAt: now,
      });
    }

    if (args.invigilatorId && args.roomId) {
      await ctx.db.insert("invigilatorAssignments", {
        universityId: scoped,
        examScheduleId: scheduleId,
        invigilatorId: args.invigilatorId,
        roomId: args.roomId,
        assignmentDate: args.examDate,
        notes: undefined,
        createdAt: now,
      });
    }

    await writeAuditLog(ctx, {
      action: "schedule.created",
      entityType: "examSchedules",
      entityId: scheduleId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
      context: {
        programId: args.programId,
        roomId: args.roomId,
        invigilatorId: args.invigilatorId,
      },
    });

    return scheduleId;
  },
});

export const updateSchedule = mutation({
  args: {
    scheduleId: v.id("examSchedules"),
    examDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    roomId: v.optional(v.id("rooms")),
    invigilatorId: v.optional(v.id("invigilators")),
    status: v.optional(scheduleStatusValidator),
    frozenSeating: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule) {
      throw new Error("Schedule not found");
    }

    requireUniversityScope(session.user, schedule.universityId);

    await ctx.db.patch(args.scheduleId, {
      examDate: args.examDate ?? schedule.examDate,
      startTime: args.startTime ?? schedule.startTime,
      endTime: args.endTime ?? schedule.endTime,
      roomId: args.roomId ?? schedule.roomId,
      invigilatorId: args.invigilatorId ?? schedule.invigilatorId,
      status: args.status ?? schedule.status,
      frozenSeating: args.frozenSeating ?? schedule.frozenSeating,
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "schedule.updated",
      entityType: "examSchedules",
      entityId: args.scheduleId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: schedule.universityId,
      context: {
        frozenSeating: args.frozenSeating,
      },
    });

    return args.scheduleId;
  },
});

export const deleteSchedule = mutation({
  args: {
    scheduleId: v.id("examSchedules"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule) {
      throw new Error("Schedule not found");
    }

    requireUniversityScope(session.user, schedule.universityId);

    const seating = await ctx.db
      .query("seatingAssignments")
      .withIndex("by_exam", (q) => q.eq("examScheduleId", args.scheduleId))
      .collect();
    if (seating.length > 0) {
      throw new Error("Cannot delete schedule with existing seating assignments");
    }

    await ctx.db.delete(args.scheduleId);

    await writeAuditLog(ctx, {
      action: "schedule.deleted",
      entityType: "examSchedules",
      entityId: args.scheduleId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: schedule.universityId,
    });

    return args.scheduleId;
  },
});
