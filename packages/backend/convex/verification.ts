import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

import { writeAuditLog } from "./lib/audit";
import {
  getCurrentYearWindow,
  getScopedUniversityId,
  requireRole,
  requireSessionUser,
  requireUniversityScope,
} from "./lib/auth";
import { getThresholdState } from "./lib/penalties";

export const searchStudentsForVerification = query({
  args: {
    universityId: v.optional(v.id("universities")),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin", "invigilator"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);
    const term = args.searchTerm.toLowerCase();

    const rows = await ctx.db
      .query("students")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const matches = rows
      .filter((student) => {
        const composite = `${student.fullName} ${student.studentId} ${student.indexNumber}`.toLowerCase();
        return composite.includes(term);
      })
      .slice(0, 15);

    return await Promise.all(
      matches.map(async (student) => {
        const [program, card] = await Promise.all([
          ctx.db.get(student.programId),
          ctx.db
            .query("studentIdCards")
            .withIndex("by_student", (q) => q.eq("studentId", student._id))
            .unique(),
        ]);

        return {
          student,
          program,
          idCard: card,
        };
      }),
    );
  },
});

export const verifyStudent = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    examScheduleId: v.optional(v.id("examSchedules")),
    studentDocId: v.id("students"),
    searchTerm: v.string(),
    reason: v.string(),
    applyPenalty: v.boolean(),
    penaltyPoints: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["invigilator", "super_admin", "university_admin"]);

    const student = await ctx.db.get(args.studentDocId);
    if (!student) {
      throw new Error("Student not found");
    }

    const scoped = getScopedUniversityId(session.user, args.universityId);
    if (student.universityId !== scoped) {
      throw new Error("Cross-tenant access denied");
    }

    const invigilator =
      session.user.role === "invigilator"
        ? (await ctx.db.query("invigilators").collect()).find((candidate) => candidate.userId === session.user._id)
        : null;

    const invigilatorId = invigilator?._id;

    if (session.user.role === "invigilator" && !invigilatorId) {
      throw new Error("Invigilator profile not found");
    }

    const points = args.applyPenalty ? (args.penaltyPoints ?? 1) : 0;
    const now = Date.now();

    const verificationId = await ctx.db.insert("idVerificationLogs", {
      universityId: scoped,
      examScheduleId: args.examScheduleId,
      invigilatorId: invigilatorId ?? (await findFallbackInvigilator(ctx, scoped)),
      studentId: args.studentDocId,
      searchTerm: args.searchTerm,
      reason: args.reason,
      penaltyApplied: args.applyPenalty,
      penaltyPoints: points,
      timestamp: now,
    });

    if (args.applyPenalty && points > 0) {
      const termKey = {
        semester: student.semester,
        academicYear: student.academicYear || getCurrentYearWindow(now),
      };

      const existing = await ctx.db
        .query("studentPenalties")
        .withIndex("by_student_term", (q) =>
          q
            .eq("studentId", student._id)
            .eq("semester", termKey.semester)
            .eq("academicYear", termKey.academicYear),
        )
        .unique();

      if (existing) {
        const nextPoints = existing.totalPoints + points;
        const thresholds = getThresholdState(nextPoints, existing);
        await ctx.db.patch(existing._id, {
          totalPoints: nextPoints,
          warningSent: thresholds.warning,
          adminReviewTriggered: thresholds.adminReview,
          disciplinaryFlag: thresholds.disciplinary,
          updatedAt: now,
        });
      } else {
        const thresholds = getThresholdState(points);
        await ctx.db.insert("studentPenalties", {
          universityId: scoped,
          studentId: student._id,
          semester: termKey.semester,
          academicYear: termKey.academicYear,
          totalPoints: points,
          warningSent: thresholds.warning,
          adminReviewTriggered: thresholds.adminReview,
          disciplinaryFlag: thresholds.disciplinary,
          updatedAt: now,
        });
      }
    }

    await writeAuditLog(ctx, {
      action: "verification.logged",
      entityType: "idVerificationLogs",
      entityId: verificationId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
      context: {
        penaltyApplied: args.applyPenalty,
        penaltyPoints: points,
        reason: args.reason,
      },
    });

    return verificationId;
  },
});

export const verificationHistory = query({
  args: {
    universityId: v.optional(v.id("universities")),
    studentDocId: v.optional(v.id("students")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const rows = await ctx.db
      .query("idVerificationLogs")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const filtered = args.studentDocId
      ? rows.filter((row) => row.studentId === args.studentDocId)
      : rows;

    const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);

    return await Promise.all(
      sorted.map(async (row) => {
        const [student, invigilator] = await Promise.all([
          row.studentId ? ctx.db.get(row.studentId) : Promise.resolve(null),
          ctx.db.get(row.invigilatorId),
        ]);

        return {
          ...row,
          student,
          invigilator,
        };
      }),
    );
  },
});

export const penaltyOverview = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    return await ctx.db
      .query("studentPenalties")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();
  },
});

export const resetPenalty = mutation({
  args: {
    penaltyRecordId: v.id("studentPenalties"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const record = await ctx.db.get(args.penaltyRecordId);
    if (!record) {
      throw new Error("Penalty record not found");
    }

    requireUniversityScope(session.user, record.universityId);

    await ctx.db.patch(args.penaltyRecordId, {
      totalPoints: 0,
      warningSent: false,
      adminReviewTriggered: false,
      disciplinaryFlag: false,
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "penalty.reset",
      entityType: "studentPenalties",
      entityId: args.penaltyRecordId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: record.universityId,
      context: {
        reason: args.reason,
      },
    });

    return args.penaltyRecordId;
  },
});

async function findFallbackInvigilator(
  ctx: MutationCtx,
  universityId: Id<"universities">,
) {
  const invigilators = await ctx.db
    .query("invigilators")
    .withIndex("by_university", (q) => q.eq("universityId", universityId))
    .collect();

  const active = invigilators.find((item) => item.isActive);
  if (!active) {
    throw new Error("No invigilator profile available for verification logging");
  }

  return active._id;
}
