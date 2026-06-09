import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import {
  getOptionalScopedUniversityId,
  getScopedUniversityId,
  requireRole,
  requireSessionUser,
  requireUniversityScope,
} from "./lib/auth";

const ratingsValidator = v.object({
  teaching: v.number(),
  content: v.number(),
  engagement: v.number(),
  punctuality: v.number(),
  fairness: v.number(),
});

const RATING_KEYS = ["teaching", "content", "engagement", "punctuality", "fairness"] as const;

type Ratings = Record<(typeof RATING_KEYS)[number], number>;

function assertValidRatings(value: unknown): asserts value is Ratings {
  if (!value || typeof value !== "object") {
    throw new Error("Ratings are required");
  }
  const obj = value as Record<string, unknown>;
  for (const key of RATING_KEYS) {
    const v = obj[key];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(`Rating for ${key} must be a number`);
    }
    if (v < 1 || v > 5) {
      throw new Error(`Rating for ${key} must be between 1 and 5`);
    }
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

async function findStudentForUser(
  ctx: QueryCtx | MutationCtx,
  universityId: Id<"universities">,
  userId: Id<"users">,
) {
  const rows = await ctx.db
    .query("students")
    .withIndex("by_university", (q) => q.eq("universityId", universityId))
    .collect();
  return rows.find((r) => r.userId === userId) ?? null;
}

async function findLecturerForUser(
  ctx: QueryCtx | MutationCtx,
  universityId: Id<"universities">,
  userId: Id<"users">,
) {
  const rows = await ctx.db
    .query("lecturers")
    .withIndex("by_university", (q) => q.eq("universityId", universityId))
    .collect();
  return rows.find((r) => r.userId === userId) ?? null;
}

export const submitEvaluation = mutation({
  args: {
    courseId: v.id("courses"),
    lecturerId: v.id("lecturers"),
    academicYear: v.string(),
    semester: v.number(),
    ratings: ratingsValidator,
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["student"]);

    if (!session.user.universityId) {
      throw new Error("You are not assigned to a university");
    }

    assertValidRatings(args.ratings);

    const trimmedComment = args.comment?.trim();
    if (trimmedComment && trimmedComment.length > 1000) {
      throw new Error("Comment must be 1000 characters or fewer");
    }

    const student = await findStudentForUser(ctx, session.user.universityId, session.user._id);
    if (!student) {
      throw new Error("You do not have a student profile");
    }

    const [course, lecturer] = await Promise.all([
      ctx.db.get(args.courseId),
      ctx.db.get(args.lecturerId),
    ]);
    if (!course || course.universityId !== session.user.universityId) {
      throw new Error("Course not found in your university");
    }
    if (!lecturer || lecturer.universityId !== session.user.universityId) {
      throw new Error("Lecturer not found in your university");
    }

    const assignment = await ctx.db
      .query("courseLecturers")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect()
      .then((rows) =>
        rows.find(
          (row) =>
            row.lecturerId === args.lecturerId &&
            row.academicYear === args.academicYear &&
            row.semester === args.semester,
        ),
      );
    if (!assignment) {
      throw new Error("This lecturer did not teach this course in the selected term");
    }

    if (student.semester !== course.semester) {
      throw new Error("This course is not for your current semester");
    }

    const existing = await ctx.db
      .query("lecturerEvaluations")
      .withIndex("by_course_student_term", (q) =>
        q
          .eq("courseId", args.courseId)
          .eq("studentId", student._id)
          .eq("academicYear", args.academicYear)
          .eq("semester", args.semester),
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lecturerId: args.lecturerId,
        ratings: args.ratings,
        comment: trimmedComment || undefined,
        updatedAt: now,
      });
      await writeAuditLog(ctx, {
        action: "lecturer_evaluation.updated",
        entityType: "lecturerEvaluations",
        entityId: existing._id,
        actorUserId: session.user._id,
        actorRole: session.user.role,
        universityId: session.user.universityId,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("lecturerEvaluations", {
      universityId: session.user.universityId,
      courseId: args.courseId,
      lecturerId: args.lecturerId,
      studentId: student._id,
      academicYear: args.academicYear,
      semester: args.semester,
      ratings: args.ratings,
      comment: trimmedComment || undefined,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "lecturer_evaluation.submitted",
      entityType: "lecturerEvaluations",
      entityId: id,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: session.user.universityId,
    });

    return id;
  },
});

export const deleteMyEvaluation = mutation({
  args: {
    evaluationId: v.id("lecturerEvaluations"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["student"]);

    const row = await ctx.db.get(args.evaluationId);
    if (!row) {
      throw new Error("Evaluation not found");
    }

    const student = await findStudentForUser(ctx, row.universityId, session.user._id);
    if (!student || student._id !== row.studentId) {
      throw new Error("You can only remove your own evaluation");
    }

    await ctx.db.delete(args.evaluationId);

    await writeAuditLog(ctx, {
      action: "lecturer_evaluation.deleted",
      entityType: "lecturerEvaluations",
      entityId: args.evaluationId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: row.universityId,
    });

    return args.evaluationId;
  },
});

export const listMyEvaluations = query({
  args: {
    academicYear: v.optional(v.string()),
    semester: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["student"]);

    if (!session.user.universityId) return [];

    const student = await findStudentForUser(ctx, session.user.universityId, session.user._id);
    if (!student) return [];

    let rows = await ctx.db
      .query("lecturerEvaluations")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();

    if (args.academicYear) rows = rows.filter((r) => r.academicYear === args.academicYear);
    if (typeof args.semester === "number") rows = rows.filter((r) => r.semester === args.semester);

    const enriched = await Promise.all(
      rows.map(async (r) => {
        const [course, lecturer] = await Promise.all([
          ctx.db.get(r.courseId),
          ctx.db.get(r.lecturerId),
        ]);
        return { ...r, course, lecturer };
      }),
    );

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const listMyEvaluationTargets = query({
  args: {
    academicYear: v.optional(v.string()),
    semester: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["student"]);

    if (!session.user.universityId) return [];

    const student = await findStudentForUser(ctx, session.user.universityId, session.user._id);
    if (!student) return [];

    const scopedUniversity = getOptionalScopedUniversityId(session.user, session.user.universityId);
    if (!scopedUniversity) return [];

    const courseAssignments = await ctx.db
      .query("courseLecturers")
      .withIndex("by_university", (q) => q.eq("universityId", scopedUniversity))
      .collect();

    const filteredAssignments = courseAssignments.filter((a) => {
      if (args.academicYear && a.academicYear !== args.academicYear) return false;
      if (typeof args.semester === "number" && a.semester !== args.semester) return false;
      return true;
    });

    const coursesInSemester = (
      await Promise.all(filteredAssignments.map((a) => ctx.db.get(a.courseId)))
    ).filter((c): c is NonNullable<typeof c> => c !== null && c.semester === student.semester);

    const seen = new Set<string>();
    const unique = coursesInSemester.filter((c) => {
      if (seen.has(c._id)) return false;
      seen.add(c._id);
      return true;
    });

    const existing = await ctx.db
      .query("lecturerEvaluations")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();

    const targets = await Promise.all(
      unique.map(async (course) => {
        const assignment = filteredAssignments.find(
          (a) => a.courseId === course._id && a.semester === course.semester,
        );
        if (!assignment) return null;
        const lecturer = await ctx.db.get(assignment.lecturerId);
        if (!lecturer) return null;
        const myEval = existing.find(
          (e) =>
            e.courseId === course._id &&
            e.lecturerId === lecturer._id &&
            e.academicYear === assignment.academicYear &&
            e.semester === assignment.semester,
        );
        return {
          course,
          lecturer,
          academicYear: assignment.academicYear,
          semester: assignment.semester,
          existingEvaluation: myEval ?? null,
        };
      }),
    );

    return targets
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .sort((a, b) => a.course.code.localeCompare(b.course.code));
  },
});

type EvalRowLike = {
  ratings: Ratings;
  comment?: string;
  _id: Id<"lecturerEvaluations">;
  createdAt: number;
};

type AggregateResult = {
  count: number;
  averages: { teaching: number; content: number; engagement: number; punctuality: number; fairness: number };
  overall: number;
  comments: Array<{ id: string; comment: string; createdAt: number }>;
};

function aggregateRows(rows: EvalRowLike[]): AggregateResult {
  const byKey: Record<keyof Ratings, number[]> = {
    teaching: [],
    content: [],
    engagement: [],
    punctuality: [],
    fairness: [],
  };
  for (const r of rows) {
    byKey.teaching.push(r.ratings.teaching);
    byKey.content.push(r.ratings.content);
    byKey.engagement.push(r.ratings.engagement);
    byKey.punctuality.push(r.ratings.punctuality);
    byKey.fairness.push(r.ratings.fairness);
  }
  const averages = {
    teaching: average(byKey.teaching),
    content: average(byKey.content),
    engagement: average(byKey.engagement),
    punctuality: average(byKey.punctuality),
    fairness: average(byKey.fairness),
  };
  const overall = average([
    averages.teaching,
    averages.content,
    averages.engagement,
    averages.punctuality,
    averages.fairness,
  ]);
  const comments = rows
    .filter((r) => r.comment && r.comment.trim().length > 0)
    .map((r) => ({
      id: r._id as unknown as string,
      comment: r.comment as string,
      createdAt: r.createdAt,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
  return {
    count: rows.length,
    averages,
    overall,
    comments,
  };
}

export const listMyEvaluationAggregates = query({
  args: {
    academicYear: v.optional(v.string()),
    semester: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["lecturer", "super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, session.user.universityId);

    let lecturer: Awaited<ReturnType<typeof findLecturerForUser>> = null;
    if (session.user.role === "lecturer") {
      lecturer = await findLecturerForUser(ctx, scoped, session.user._id);
      if (!lecturer) return [];
    }

    let rows = await ctx.db
      .query("lecturerEvaluations")
      .withIndex("by_lecturer", (q) => q.eq("lecturerId", lecturer!._id))
      .collect();
    if (args.academicYear) rows = rows.filter((r) => r.academicYear === args.academicYear);
    if (typeof args.semester === "number") rows = rows.filter((r) => r.semester === args.semester);

    const byCourse = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.courseId;
      const list = byCourse.get(key) ?? [];
      list.push(row);
      byCourse.set(key, list);
    }

    const aggregates: Array<{
      course: unknown;
      aggregate: ReturnType<typeof aggregateRows>;
    }> = [];

    for (const [courseId, list] of byCourse.entries()) {
      const course = await ctx.db.get(courseId as Id<"courses">);
      if (!course) continue;
      const agg = aggregateRows(list);
      aggregates.push({ course, aggregate: agg });
    }

    return aggregates.sort((a, b) => b.aggregate.overall - a.aggregate.overall);
  },
});

export const listAggregatedEvaluations = query({
  args: {
    universityId: v.optional(v.id("universities")),
    academicYear: v.optional(v.string()),
    semester: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const scoped = getOptionalScopedUniversityId(session.user, args.universityId);
    if (!scoped) return [];

    let rows = await ctx.db
      .query("lecturerEvaluations")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    if (args.academicYear) rows = rows.filter((r) => r.academicYear === args.academicYear);
    if (typeof args.semester === "number") rows = rows.filter((r) => r.semester === args.semester);

    const grouped = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = `${r.lecturerId}::${r.courseId}::${r.academicYear}::${r.semester}`;
      const list = grouped.get(key) ?? [];
      list.push(r);
      grouped.set(key, list);
    }

    const aggregates: Array<{
      lecturer: unknown;
      course: unknown;
      academicYear: string;
      semester: number;
      aggregate: ReturnType<typeof aggregateRows>;
    }> = [];

    for (const [key, list] of grouped.entries()) {
      const [lecturerId, courseId, academicYear, semesterStr] = key.split("::");
      const [lecturer, course] = await Promise.all([
        ctx.db.get(lecturerId as Id<"lecturers">),
        ctx.db.get(courseId as Id<"courses">),
      ]);
      if (!lecturer || !course) continue;
      const agg = aggregateRows(list);
      aggregates.push({
        lecturer,
        course,
        academicYear,
        semester: Number(semesterStr),
        aggregate: agg,
      });
    }

    return aggregates.sort((a, b) => b.aggregate.overall - a.aggregate.overall);
  },
});

export const listEvaluationTerms = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    if (!session.user.universityId) return [];

    const rows = await ctx.db
      .query("lecturerEvaluations")
      .withIndex("by_university", (q) => q.eq("universityId", session.user.universityId!))
      .collect();

    const terms = new Map<string, { academicYear: string; semester: number }>();
    for (const r of rows) {
      const key = `${r.academicYear}::${r.semester}`;
      if (!terms.has(key)) {
        terms.set(key, { academicYear: r.academicYear, semester: r.semester });
      }
    }
    return Array.from(terms.values()).sort((a, b) => {
      if (a.academicYear !== b.academicYear) return b.academicYear.localeCompare(a.academicYear);
      return b.semester - a.semester;
    });
  },
});

export { requireUniversityScope };
