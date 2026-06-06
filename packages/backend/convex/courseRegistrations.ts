import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { getScopedUniversityId, requireRole, requireSessionUser, requireUniversityScope } from "./lib/auth";

export const listAvailableCourses = query({
  handler: async (ctx) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["student", "super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, session.user.universityId);
    const students = await ctx.db
      .query("students")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();
    const student = students.find((candidate) => candidate.userId === session.user._id);
    if (!student) {
      return { student: null, available: [] };
    }

    const courses = await ctx.db.query("courses").collect();
    const eligible = courses.filter(
      (course) =>
        course.universityId === scoped &&
        course.programId === student.programId &&
        course.semester === student.semester,
    );

    const registrations = await ctx.db
      .query("courseRegistrations")
      .withIndex("by_student_term", (q) =>
        q
          .eq("studentId", student._id)
          .eq("academicYear", student.academicYear)
          .eq("semester", student.semester),
      )
      .collect();

    const program = await ctx.db.get(student.programId);

    const available = eligible.map((course) => {
      const reg = registrations.find(
        (r) => r.studentId === student._id && r.courseId === course._id && r.status === "registered",
      );
      return { course, program, alreadyRegistered: Boolean(reg) };
    });

    return { student, available };
  },
});

export const listMyRegistrations = query({
  handler: async (ctx) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["student", "super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, session.user.universityId);
    const students = await ctx.db
      .query("students")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();
    const student = students.find((candidate) => candidate.userId === session.user._id);
    if (!student) {
      return [];
    }

    const regs = await ctx.db
      .query("courseRegistrations")
      .withIndex("by_student_term", (q) => q.eq("studentId", student._id))
      .collect();

    const enriched = await Promise.all(
      regs.map(async (reg) => {
        const course = await ctx.db.get(reg.courseId);
        return { ...reg, course };
      }),
    );

    return enriched.sort((a, b) => b.registeredAt - a.registeredAt);
  },
});

export const registerForCourse = mutation({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["student", "super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, session.user.universityId);
    const students = await ctx.db
      .query("students")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();
    const student = students.find((candidate) => candidate.userId === session.user._id);
    if (!student) {
      throw new Error("Student profile not found");
    }
    if (student.feeStatus === "outstanding" && !student.lateRegistration) {
      throw new Error("You must clear your fees or request late registration before registering");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Course not found");
    }
    requireUniversityScope(session.user, course.universityId);
    if (course.programId !== student.programId || course.semester !== student.semester) {
      throw new Error("This course is not in your program/semester");
    }

    const existing = await ctx.db
      .query("courseRegistrations")
      .withIndex("by_student_course", (q) => q.eq("studentId", student._id).eq("courseId", args.courseId))
      .collect();

    const active = existing.find((r) => r.status === "registered");
    if (active) {
      return active._id;
    }

    const now = Date.now();
    const id = await ctx.db.insert("courseRegistrations", {
      universityId: scoped,
      studentId: student._id,
      courseId: args.courseId,
      academicYear: student.academicYear,
      semester: student.semester,
      status: "registered",
      registeredAt: now,
    });

    await writeAuditLog(ctx, {
      action: "course.registered",
      entityType: "courseRegistrations",
      entityId: id,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
      context: { courseId: args.courseId, studentId: student._id },
    });

    return id;
  },
});

export const dropCourse = mutation({
  args: {
    registrationId: v.id("courseRegistrations"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["student", "super_admin", "university_admin"]);

    const reg = await ctx.db.get(args.registrationId);
    if (!reg) {
      throw new Error("Registration not found");
    }
    requireUniversityScope(session.user, reg.universityId);

    const scoped = getScopedUniversityId(session.user, reg.universityId);
    const students = await ctx.db
      .query("students")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();
    const student = students.find((candidate) => candidate.userId === session.user._id);
    if (!student || reg.studentId !== student._id) {
      throw new Error("You can only drop your own registrations");
    }

    if (reg.status === "dropped") {
      return reg._id;
    }

    const now = Date.now();
    await ctx.db.patch(args.registrationId, {
      status: "dropped",
      droppedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "course.dropped",
      entityType: "courseRegistrations",
      entityId: args.registrationId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: reg.universityId,
    });

    return args.registrationId;
  },
});
