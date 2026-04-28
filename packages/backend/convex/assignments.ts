import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { getScopedUniversityId, requireRole, requireSessionUser, requireUniversityScope } from "./lib/auth";

export const listInvigilatorProfiles = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    return await ctx.db
      .query("invigilators")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();
  },
});

export const listInvigilatorAssignments = query({
  args: {
    universityId: v.optional(v.id("universities")),
    invigilatorId: v.optional(v.id("invigilators")),
    examScheduleId: v.optional(v.id("examSchedules")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const rows = args.examScheduleId
      ? await ctx.db
          .query("invigilatorAssignments")
          .withIndex("by_exam", (q) => q.eq("examScheduleId", args.examScheduleId!))
          .collect()
      : await ctx.db.query("invigilatorAssignments").collect();

    const scopedRows = rows.filter((row) => row.universityId === scoped);
    const filtered = args.invigilatorId
      ? scopedRows.filter((row) => row.invigilatorId === args.invigilatorId)
      : scopedRows;

    return await Promise.all(
      filtered.map(async (row) => {
        const [invigilator, schedule, room] = await Promise.all([
          ctx.db.get(row.invigilatorId),
          ctx.db.get(row.examScheduleId),
          ctx.db.get(row.roomId),
        ]);

        return {
          ...row,
          invigilator,
          schedule,
          room,
        };
      }),
    );
  },
});

export const createInvigilatorAssignment = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    examScheduleId: v.id("examSchedules"),
    invigilatorId: v.id("invigilators"),
    roomId: v.id("rooms"),
    assignmentDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);
    const [schedule, invigilator, room] = await Promise.all([
      ctx.db.get(args.examScheduleId),
      ctx.db.get(args.invigilatorId),
      ctx.db.get(args.roomId),
    ]);

    if (!schedule || !invigilator || !room) {
      throw new Error("Schedule, invigilator, or room not found");
    }

    if (
      schedule.universityId !== scoped ||
      invigilator.universityId !== scoped ||
      room.universityId !== scoped
    ) {
      throw new Error("Cross-tenant access denied");
    }

    const existing = await ctx.db
      .query("invigilatorAssignments")
      .withIndex("by_invigilator", (q) => q.eq("invigilatorId", args.invigilatorId))
      .collect();

    const conflicting = existing.find((row) => {
      if (row.assignmentDate !== args.assignmentDate) {
        return false;
      }
      return row.examScheduleId !== args.examScheduleId;
    });

    if (conflicting) {
      throw new Error("Invigilator already assigned on this date");
    }

    const assignmentId = await ctx.db.insert("invigilatorAssignments", {
      universityId: scoped,
      examScheduleId: args.examScheduleId,
      invigilatorId: args.invigilatorId,
      roomId: args.roomId,
      assignmentDate: args.assignmentDate,
      notes: args.notes,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.examScheduleId, {
      invigilatorId: args.invigilatorId,
      roomId: args.roomId,
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "invigilator.assigned",
      entityType: "invigilatorAssignments",
      entityId: assignmentId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
      context: {
        examScheduleId: args.examScheduleId,
        roomId: args.roomId,
      },
    });

    return assignmentId;
  },
});

export const deleteInvigilatorAssignment = mutation({
  args: {
    assignmentId: v.id("invigilatorAssignments"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    requireUniversityScope(session.user, assignment.universityId);

    await ctx.db.delete(args.assignmentId);

    await writeAuditLog(ctx, {
      action: "invigilator.unassigned",
      entityType: "invigilatorAssignments",
      entityId: args.assignmentId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: assignment.universityId,
    });

    return args.assignmentId;
  },
});
