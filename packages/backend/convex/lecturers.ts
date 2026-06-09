import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import {
  getScopedUniversityId,
  requireRole,
  requireSessionUser,
  requireUniversityScope,
} from "./lib/auth";

const courseRoleValidator = v.union(
  v.literal("primary"),
  v.literal("co_lecturer"),
  v.literal("assistant"),
);

const resultStatusValidator = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("approved"),
  v.literal("rejected"),
);

function computeGrade(percentage: number) {
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 45) return "D";
  if (percentage >= 40) return "E";
  return "F";
}

async function resolveLecturerForUser(
  ctx: QueryCtx | MutationCtx,
  userId: import("./_generated/dataModel").Id<"users">,
  scopedUniversityId: import("./_generated/dataModel").Id<"universities">,
) {
  const lecturers = await ctx.db
    .query("lecturers")
    .withIndex("by_university", (q: any) => q.eq("universityId", scopedUniversityId))
    .collect();

  return lecturers.find((lecturer) => lecturer.userId === userId) ?? null;
}

export const listLecturerProfiles = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    return await ctx.db
      .query("lecturers")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();
  },
});

export const getMyLecturerProfile = query({
  args: {},
  handler: async (ctx) => {
    const session = await requireSessionUser(ctx);
    if (session.user.role !== "lecturer") {
      return null;
    }

    if (!session.user.universityId) {
      return null;
    }

    return await resolveLecturerForUser(ctx, session.user._id, session.user.universityId);
  },
});

export const listMyCourses = query({
  args: {
    academicYear: v.optional(v.string()),
    semester: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["lecturer", "super_admin", "university_admin"]);

    if (!session.user.universityId) {
      return [];
    }

    const lecturer = await resolveLecturerForUser(ctx, session.user._id, session.user.universityId);
    if (!lecturer) {
      return [];
    }

    const assignments = await ctx.db
      .query("courseLecturers")
      .withIndex("by_lecturer", (q) => q.eq("lecturerId", lecturer._id))
      .collect();

    const filtered = assignments.filter((assignment) => {
      if (args.academicYear && assignment.academicYear !== args.academicYear) {
        return false;
      }
      if (args.semester !== undefined && assignment.semester !== args.semester) {
        return false;
      }
      return true;
    });

    return await Promise.all(
      filtered.map(async (assignment) => {
        const course = await ctx.db.get(assignment.courseId);
        const program = course ? await ctx.db.get(course.programId) : null;
        return {
          ...assignment,
          course,
          program,
        };
      }),
    );
  },
});

export const assignLecturerToCourse = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    lecturerId: v.id("lecturers"),
    courseId: v.id("courses"),
    academicYear: v.string(),
    semester: v.number(),
    role: courseRoleValidator,
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);
    const [lecturer, course] = await Promise.all([
      ctx.db.get(args.lecturerId),
      ctx.db.get(args.courseId),
    ]);

    if (!lecturer || !course) {
      throw new Error("Lecturer or course not found");
    }

    if (lecturer.universityId !== scoped || course.universityId !== scoped) {
      throw new Error("Cross-tenant access denied");
    }

    const duplicate = await ctx.db
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

    if (duplicate) {
      throw new Error("Lecturer is already assigned to this course for the same term");
    }

    const assignmentId = await ctx.db.insert("courseLecturers", {
      universityId: scoped,
      courseId: args.courseId,
      lecturerId: args.lecturerId,
      academicYear: args.academicYear,
      semester: args.semester,
      role: args.role,
      createdAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "lecturer.course_assigned",
      entityType: "courseLecturers",
      entityId: assignmentId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
      context: {
        courseId: args.courseId,
        lecturerId: args.lecturerId,
        academicYear: args.academicYear,
        semester: args.semester,
        role: args.role,
      },
    });

    if (lecturer.userId) {
      const courseLabel = `${course.code} — ${course.name}`;
      const roleLabel = args.role === "primary" ? "Primary" : args.role === "co_lecturer" ? "Co-lecturer" : "Assistant";
      await ctx.db.insert("notifications", {
        universityId: scoped,
        userId: lecturer.userId,
        roleScope: "lecturer",
        title: `New course assignment: ${course.code}`,
        body: `You have been assigned as ${roleLabel} for ${courseLabel} (${args.academicYear} · Semester ${args.semester}).`,
        readAt: undefined,
        createdAt: Date.now(),
      });
    }

    return assignmentId;
  },
});

export const removeLecturerAssignment = mutation({
  args: {
    assignmentId: v.id("courseLecturers"),
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
      action: "lecturer.course_unassigned",
      entityType: "courseLecturers",
      entityId: args.assignmentId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: assignment.universityId,
    });

    return args.assignmentId;
  },
});

export const listCourseAssignments = query({
  args: {
    universityId: v.optional(v.id("universities")),
    courseId: v.optional(v.id("courses")),
    lecturerId: v.optional(v.id("lecturers")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const rows = await ctx.db
      .query("courseLecturers")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const filtered = rows.filter((row) => {
      if (args.courseId && row.courseId !== args.courseId) {
        return false;
      }
      if (args.lecturerId && row.lecturerId !== args.lecturerId) {
        return false;
      }
      return true;
    });

    return await Promise.all(
      filtered.map(async (assignment) => {
        const [course, lecturer] = await Promise.all([
          ctx.db.get(assignment.courseId),
          ctx.db.get(assignment.lecturerId),
        ]);
        return {
          ...assignment,
          course,
          lecturer,
        };
      }),
    );
  },
});

export const listCourseStudents = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["lecturer", "super_admin", "university_admin"]);

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    if (session.user.role === "lecturer") {
      if (!session.user.universityId) {
        throw new Error("User has no assigned university");
      }
      const lecturer = await resolveLecturerForUser(ctx, session.user._id, session.user.universityId);
      if (!lecturer) {
        throw new Error("Lecturer profile not found");
      }

      const ownsCourse = await ctx.db
        .query("courseLecturers")
        .withIndex("by_lecturer", (q) => q.eq("lecturerId", lecturer._id))
        .collect()
        .then((rows) => rows.some((row) => row.courseId === args.courseId));

      if (!ownsCourse) {
        throw new Error("You are not assigned to this course");
      }
    } else {
      requireUniversityScope(session.user, course.universityId);
    }

    const students = await ctx.db
      .query("students")
      .withIndex("by_program", (q) => q.eq("programId", course.programId))
      .collect();

    const eligible = students.filter((student) => {
      if (student.semester !== course.semester) {
        return false;
      }
      if (student.universityId !== course.universityId) {
        return false;
      }
      return true;
    });

    return await Promise.all(
      eligible.map(async (student) => {
        const existingResult = await ctx.db
          .query("courseResults")
          .withIndex("by_course_student", (q) =>
            q.eq("courseId", args.courseId).eq("studentId", student._id),
          )
          .unique();

        return {
          student,
          existingResult,
        };
      }),
    );
  },
});

export const listCourseResults = query({
  args: {
    courseId: v.id("courses"),
    academicYear: v.optional(v.string()),
    semester: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["lecturer", "super_admin", "university_admin"]);

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    if (session.user.role === "lecturer") {
      if (!session.user.universityId) {
        throw new Error("User has no assigned university");
      }
      const lecturer = await resolveLecturerForUser(ctx, session.user._id, session.user.universityId);
      if (!lecturer) {
        throw new Error("Lecturer profile not found");
      }
    } else {
      requireUniversityScope(session.user, course.universityId);
    }

    const rows = await ctx.db
      .query("courseResults")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const filtered = rows.filter((row) => {
      if (args.academicYear && row.academicYear !== args.academicYear) {
        return false;
      }
      if (args.semester !== undefined && row.semester !== args.semester) {
        return false;
      }
      return true;
    });

    return await Promise.all(
      filtered.map(async (row) => {
        const [student, lecturer, examSchedule] = await Promise.all([
          ctx.db.get(row.studentId),
          ctx.db.get(row.lecturerId),
          row.examScheduleId ? ctx.db.get(row.examScheduleId) : Promise.resolve(null),
        ]);
        return {
          ...row,
          student,
          lecturer,
          examSchedule,
        };
      }),
    );
  },
});

export const upsertCourseResult = mutation({
  args: {
    courseId: v.id("courses"),
    studentId: v.id("students"),
    examScheduleId: v.optional(v.id("examSchedules")),
    academicYear: v.string(),
    semester: v.number(),
    score: v.number(),
    maxScore: v.number(),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["lecturer", "super_admin", "university_admin"]);

    if (args.score < 0) {
      throw new Error("Score cannot be negative");
    }
    if (args.maxScore <= 0) {
      throw new Error("Maximum score must be positive");
    }
    if (args.score > args.maxScore) {
      throw new Error("Score cannot exceed the maximum");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    if (student.universityId !== course.universityId) {
      throw new Error("Cross-tenant access denied");
    }

    let lecturer: Awaited<ReturnType<typeof resolveLecturerForUser>>;
    if (session.user.role === "lecturer") {
      if (!session.user.universityId) {
        throw new Error("User has no assigned university");
      }
      lecturer = await resolveLecturerForUser(ctx, session.user._id, session.user.universityId);
      if (!lecturer) {
        throw new Error("Lecturer profile not found");
      }

      const ownsCourse = await ctx.db
        .query("courseLecturers")
        .withIndex("by_lecturer", (q) => q.eq("lecturerId", lecturer!._id))
        .collect()
        .then((rows) => rows.some((row) => row.courseId === args.courseId));

      if (!ownsCourse) {
        throw new Error("You are not assigned to this course");
      }
    } else {
      requireUniversityScope(session.user, course.universityId);
      if (!args.examScheduleId) {
        throw new Error("An exam schedule is required when an admin enters results");
      }
      const existingLecturer = await ctx.db
        .query("courseLecturers")
        .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
        .collect()
        .then((rows) => rows[0]);

      if (!existingLecturer) {
        throw new Error("Assign a lecturer to this course first");
      }
      lecturer = await ctx.db.get(existingLecturer.lecturerId);
      if (!lecturer) {
        throw new Error("Assigned lecturer profile not found");
      }
    }

    const existing = await ctx.db
      .query("courseResults")
      .withIndex("by_course_student", (q) =>
        q.eq("courseId", args.courseId).eq("studentId", args.studentId),
      )
      .unique();

    const percentage = (args.score / args.maxScore) * 100;
    const grade = computeGrade(percentage);

    const now = Date.now();

    if (existing) {
      if (existing.status === "approved") {
        throw new Error("Approved results cannot be edited");
      }

      await ctx.db.patch(existing._id, {
        lecturerId: lecturer._id,
        examScheduleId: args.examScheduleId ?? existing.examScheduleId,
        score: args.score,
        maxScore: args.maxScore,
        grade,
        remarks: args.remarks,
        status: "draft",
        submittedAt: undefined,
        reviewedAt: undefined,
        reviewedByUserId: undefined,
        reviewerNote: undefined,
        updatedAt: now,
      });

      await writeAuditLog(ctx, {
        action: "result.updated",
        entityType: "courseResults",
        entityId: existing._id,
        actorUserId: session.user._id,
        actorRole: session.user.role,
        universityId: course.universityId,
        context: {
          courseId: args.courseId,
          studentId: args.studentId,
          score: args.score,
        },
      });

      return existing._id;
    }

    const resultId = await ctx.db.insert("courseResults", {
      universityId: course.universityId,
      courseId: args.courseId,
      studentId: args.studentId,
      lecturerId: lecturer._id,
      examScheduleId: args.examScheduleId,
      academicYear: args.academicYear,
      semester: args.semester,
      score: args.score,
      maxScore: args.maxScore,
      grade,
      remarks: args.remarks,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "result.created",
      entityType: "courseResults",
      entityId: resultId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: course.universityId,
      context: {
        courseId: args.courseId,
        studentId: args.studentId,
        score: args.score,
      },
    });

    return resultId;
  },
});

export const submitCourseResults = mutation({
  args: {
    resultIds: v.array(v.id("courseResults")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["lecturer", "super_admin", "university_admin"]);

    if (args.resultIds.length === 0) {
      throw new Error("No results selected for submission");
    }

    let lecturer = null;
    if (session.user.role === "lecturer") {
      if (!session.user.universityId) {
        throw new Error("User has no assigned university");
      }
      lecturer = await resolveLecturerForUser(ctx, session.user._id, session.user.universityId);
      if (!lecturer) {
        throw new Error("Lecturer profile not found");
      }
    }

    const now = Date.now();
    const submitted: Array<string> = [];

    for (const resultId of args.resultIds) {
      const result = await ctx.db.get(resultId);
      if (!result) {
        continue;
      }

      if (lecturer && result.lecturerId !== lecturer._id) {
        throw new Error("You can only submit results for your own courses");
      }

      requireUniversityScope(session.user, result.universityId);

      if (result.status !== "draft" && result.status !== "rejected") {
        continue;
      }

      await ctx.db.patch(resultId, {
        status: "submitted",
        submittedAt: now,
        reviewedAt: undefined,
        reviewedByUserId: undefined,
        reviewerNote: undefined,
        updatedAt: now,
      });
      submitted.push(resultId);
    }

    if (submitted.length > 0) {
      await writeAuditLog(ctx, {
        action: "result.batch_submitted",
        entityType: "courseResults",
        entityId: submitted[0]!,
        actorUserId: session.user._id,
        actorRole: session.user.role,
        universityId: session.user.universityId,
        context: {
          count: submitted.length,
          resultIds: submitted,
        },
      });
    }

    return { submittedCount: submitted.length };
  },
});

export const reviewCourseResult = mutation({
  args: {
    resultId: v.id("courseResults"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const result = await ctx.db.get(args.resultId);
    if (!result) {
      throw new Error("Result not found");
    }

    requireUniversityScope(session.user, result.universityId);

    const now = Date.now();
    await ctx.db.patch(args.resultId, {
      status: args.decision,
      reviewedAt: now,
      reviewedByUserId: session.user._id,
      reviewerNote: args.note,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: args.decision === "approved" ? "result.approved" : "result.rejected",
      entityType: "courseResults",
      entityId: args.resultId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: result.universityId,
      context: { note: args.note },
    });

    return args.resultId;
  },
});

export const listAllResults = query({
  args: {
    universityId: v.optional(v.id("universities")),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);

    const results = await ctx.db
      .query("courseResults")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const filtered = args.status ? results.filter((r) => r.status === args.status) : results;

    const enriched = await Promise.all(
      filtered.map(async (r) => {
        const [course, lecturer, student, examSchedule] = await Promise.all([
          ctx.db.get(r.courseId),
          ctx.db.get(r.lecturerId),
          ctx.db.get(r.studentId),
          r.examScheduleId ? ctx.db.get(r.examScheduleId) : Promise.resolve(null),
        ]);
        return {
          ...r,
          course,
          lecturer,
          student,
          examSchedule,
        };
      }),
    );

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const lecturerDashboard = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["lecturer", "super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);
    const lecturer = await resolveLecturerForUser(ctx, session.user._id, scoped);
    if (!lecturer) {
      return null;
    }

    const [assignments, results, allSchedules] = await Promise.all([
      ctx.db
        .query("courseLecturers")
        .withIndex("by_lecturer", (q) => q.eq("lecturerId", lecturer._id))
        .collect(),
      ctx.db
        .query("courseResults")
        .withIndex("by_lecturer", (q) => q.eq("lecturerId", lecturer._id))
        .collect(),
      ctx.db
        .query("examSchedules")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
    ]);

    const courseIds = new Set(assignments.map((assignment) => assignment.courseId));
    const upcomingExams = (
      await Promise.all(
        allSchedules
          .filter((schedule) => courseIds.has(schedule.courseId))
          .map(async (schedule) => {
            const course = await ctx.db.get(schedule.courseId);
            return { schedule, course };
          }),
      )
    )
      .filter((row) => row.course)
      .sort((a, b) => a.schedule.examDate.localeCompare(b.schedule.examDate));

    const statusCounts = results.reduce(
      (acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      lecturer,
      coursesCount: assignments.length,
      upcomingExams,
      resultCounts: {
        draft: statusCounts.draft ?? 0,
        submitted: statusCounts.submitted ?? 0,
        approved: statusCounts.approved ?? 0,
        rejected: statusCounts.rejected ?? 0,
      },
      totalResults: results.length,
    };
  },
});
