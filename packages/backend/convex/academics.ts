import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { getScopedUniversityId, requireRole, requireSessionUser, requireUniversityScope } from "./lib/auth";

export const listPrograms = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    return await ctx.db
      .query("programs")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();
  },
});

export const createProgram = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    code: v.string(),
    name: v.string(),
    durationSemesters: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const existing = await ctx.db
      .query("programs")
      .withIndex("by_university_code", (q) => q.eq("universityId", scoped).eq("code", args.code))
      .unique();

    if (existing) {
      throw new Error("Program code already exists in this university");
    }

    const now = Date.now();
    const programId = await ctx.db.insert("programs", {
      universityId: scoped,
      code: args.code,
      name: args.name,
      durationSemesters: args.durationSemesters,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "program.created",
      entityType: "programs",
      entityId: programId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
    });

    return programId;
  },
});

export const updateProgram = mutation({
  args: {
    programId: v.id("programs"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    durationSemesters: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new Error("Program not found");
    }

    requireUniversityScope(session.user, program.universityId);

    if (args.code && args.code !== program.code) {
      const nextCode = args.code as string;
      const duplicate = await ctx.db
        .query("programs")
        .withIndex("by_university_code", (q) =>
          q.eq("universityId", program.universityId).eq("code", nextCode),
        )
        .unique();

      if (duplicate) {
        throw new Error("Program code already exists in this university");
      }
    }

    await ctx.db.patch(args.programId, {
      code: args.code ?? program.code,
      name: args.name ?? program.name,
      durationSemesters: args.durationSemesters ?? program.durationSemesters,
      isActive: args.isActive ?? program.isActive,
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "program.updated",
      entityType: "programs",
      entityId: args.programId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: program.universityId,
    });

    return args.programId;
  },
});

export const listCourses = query({
  args: {
    universityId: v.optional(v.id("universities")),
    programId: v.optional(v.id("programs")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const rows = await ctx.db
      .query("courses")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    if (!args.programId) {
      return rows;
    }

    return rows.filter((row) => row.programId === args.programId);
  },
});

export const createCourse = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    programId: v.id("programs"),
    code: v.string(),
    name: v.string(),
    semester: v.number(),
    creditHours: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);
    const program = await ctx.db.get(args.programId);
    if (!program || program.universityId !== scoped) {
      throw new Error("Program does not belong to selected university");
    }

    const duplicate = await ctx.db
      .query("courses")
      .withIndex("by_university_code", (q) => q.eq("universityId", scoped).eq("code", args.code))
      .unique();
    if (duplicate) {
      throw new Error("Course code already exists in this university");
    }

    const now = Date.now();
    const courseId = await ctx.db.insert("courses", {
      universityId: scoped,
      programId: args.programId,
      code: args.code,
      name: args.name,
      semester: args.semester,
      creditHours: args.creditHours,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "course.created",
      entityType: "courses",
      entityId: courseId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
    });

    return courseId;
  },
});

export const updateCourse = mutation({
  args: {
    courseId: v.id("courses"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    semester: v.optional(v.number()),
    creditHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    requireUniversityScope(session.user, course.universityId);

    if (args.code && args.code !== course.code) {
      const nextCode = args.code as string;
      const duplicate = await ctx.db
        .query("courses")
        .withIndex("by_university_code", (q) =>
          q.eq("universityId", course.universityId).eq("code", nextCode),
        )
        .unique();

      if (duplicate) {
        throw new Error("Course code already exists in this university");
      }
    }

    await ctx.db.patch(args.courseId, {
      code: args.code ?? course.code,
      name: args.name ?? course.name,
      semester: args.semester ?? course.semester,
      creditHours: args.creditHours ?? course.creditHours,
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "course.updated",
      entityType: "courses",
      entityId: args.courseId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: course.universityId,
    });

    return args.courseId;
  },
});
