import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { parseCsvRows } from "./lib/csv";
import {
  getScopedUniversityId,
  requireRole,
  requireSessionUser,
  requireUniversityScope,
} from "./lib/auth";

const feeStatusValidator = v.union(v.literal("cleared"), v.literal("outstanding"));

async function applyUniversityPrefix(
  ctx: { db: { get: (id: Id<"universities">) => Promise<{ prefix?: string } | null> } },
  universityId: Id<"universities">,
  rawStudentId: string,
): Promise<string> {
  const trimmed = rawStudentId.trim();
  if (!trimmed) return trimmed;
  const university = await ctx.db.get(universityId);
  const prefix = university?.prefix?.trim();
  if (!prefix) return trimmed;
  if (trimmed.toUpperCase().startsWith(prefix.toUpperCase())) return trimmed;
  return `${prefix}${trimmed}`;
}

export const listStudents = query({
  args: {
    universityId: v.optional(v.id("universities")),
    programId: v.optional(v.id("programs")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const universityId = getScopedUniversityId(session.user, args.universityId);

    const rows = await ctx.db
      .query("students")
      .withIndex("by_university", (q) => q.eq("universityId", universityId))
      .collect();

    return rows.filter((row) => {
      if (args.programId && row.programId !== args.programId) {
        return false;
      }

      if (args.search) {
        const term = args.search.toLowerCase();
        const combined = `${row.fullName} ${row.studentId} ${row.indexNumber}`.toLowerCase();
        if (!combined.includes(term)) {
          return false;
        }
      }

      return true;
    });
  },
});

export const getStudentDashboard = query({
  args: {
    studentUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);

    let userId = session.user._id;
    if (args.studentUserId && session.user.role !== "student") {
      requireRole(session.user, ["super_admin", "university_admin", "finance", "invigilator"]);
      userId = args.studentUserId;
    }

    const student = (await ctx.db.query("students").collect()).find((row) => row.userId === userId);
    if (!student) {
      return {
        student: null,
        program: null,
        idCard: null,
        complaints: [],
        timetable: [],
      };
    }

    requireUniversityScope(session.user, student.universityId);

    const [program, idCard, complaints, seatAssignments] = await Promise.all([
      ctx.db.get(student.programId),
      ctx.db
        .query("studentIdCards")
        .withIndex("by_student", (q) => q.eq("studentId", student._id))
        .unique(),
      ctx.db
        .query("complaints")
        .withIndex("by_university", (q) => q.eq("universityId", student.universityId))
        .collect(),
      ctx.db.query("seatingAssignments").collect(),
    ]);

    const myComplaints = complaints.filter((complaint) => complaint.submittedByUserId === userId);
    const mySeats = seatAssignments.filter((seat) => seat.studentId === student._id);

    const timetableItems = await Promise.all(
      mySeats.map(async (seat) => {
        const schedule = await ctx.db.get(seat.examScheduleId);
        if (!schedule) {
          return null;
        }
        const course = await ctx.db.get(schedule.courseId);
        const room = await ctx.db.get(seat.roomId);
        return {
          seatNumber: seat.seatNumber,
          examDate: schedule.examDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          courseCode: course?.code ?? "Unknown",
          courseName: course?.name ?? "Unknown Course",
          roomName: room?.name ?? "Unknown Room",
        };
      }),
    );

    return {
      student,
      program,
      idCard,
      complaints: myComplaints,
      timetable: timetableItems.filter((item) => item !== null),
    };
  },
});

export const createStudent = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    studentId: v.string(),
    indexNumber: v.string(),
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    programId: v.id("programs"),
    semester: v.number(),
    academicYear: v.string(),
    feeStatus: feeStatusValidator,
    outstandingBalance: v.number(),
    lateRegistration: v.boolean(),
    photoUrl: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const universityId = getScopedUniversityId(session.user, args.universityId);
    const finalStudentId = await applyUniversityPrefix(ctx, universityId, args.studentId);

    const existingStudentId = await ctx.db
      .query("students")
      .withIndex("by_university_student_id", (q) =>
        q.eq("universityId", universityId).eq("studentId", finalStudentId),
      )
      .unique();

    if (existingStudentId) {
      throw new Error("Student ID already exists in this university");
    }

    const existingIndex = await ctx.db
      .query("students")
      .withIndex("by_university_index_number", (q) =>
        q.eq("universityId", universityId).eq("indexNumber", args.indexNumber),
      )
      .unique();

    if (existingIndex) {
      throw new Error("Index number already exists in this university");
    }

    const now = Date.now();
    const studentDocId = await ctx.db.insert("students", {
      universityId,
      userId: args.userId,
      studentId: finalStudentId,
      indexNumber: args.indexNumber,
      fullName: args.fullName,
      email: args.email,
      phone: args.phone,
      programId: args.programId,
      semester: args.semester,
      academicYear: args.academicYear,
      feeStatus: args.feeStatus,
      outstandingBalance: args.outstandingBalance,
      lateRegistration: args.lateRegistration,
      photoUrl: args.photoUrl,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "student.created",
      entityType: "students",
      entityId: studentDocId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId,
      context: {
        programId: args.programId,
        lateRegistration: args.lateRegistration,
      },
    });

    return studentDocId;
  },
});

export const updateStudent = mutation({
  args: {
    studentDocId: v.id("students"),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    semester: v.optional(v.number()),
    feeStatus: v.optional(feeStatusValidator),
    outstandingBalance: v.optional(v.number()),
    lateRegistration: v.optional(v.boolean()),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const existing = await ctx.db.get(args.studentDocId);

    if (!existing) {
      throw new Error("Student not found");
    }

    requireUniversityScope(session.user, existing.universityId);

    if (session.user.role === "student") {
      const ownRecord = (await ctx.db.query("students").collect()).find(
        (candidate) => candidate.userId === session.user._id,
      );

      if (!ownRecord || ownRecord._id !== args.studentDocId) {
        throw new Error("You can only edit your own profile");
      }

      await ctx.db.patch(args.studentDocId, {
        fullName: args.fullName ?? existing.fullName,
        email: args.email ?? existing.email,
        phone: args.phone ?? existing.phone,
        photoUrl: args.photoUrl ?? existing.photoUrl,
        updatedAt: Date.now(),
      });
    } else {
      requireRole(session.user, ["super_admin", "university_admin", "finance"]);
      await ctx.db.patch(args.studentDocId, {
        fullName: args.fullName ?? existing.fullName,
        email: args.email ?? existing.email,
        phone: args.phone ?? existing.phone,
        semester: args.semester ?? existing.semester,
        feeStatus: args.feeStatus ?? existing.feeStatus,
        outstandingBalance: args.outstandingBalance ?? existing.outstandingBalance,
        lateRegistration: args.lateRegistration ?? existing.lateRegistration,
        photoUrl: args.photoUrl ?? existing.photoUrl,
        updatedAt: Date.now(),
      });
    }

    await writeAuditLog(ctx, {
      action: "student.updated",
      entityType: "students",
      entityId: args.studentDocId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: existing.universityId,
    });

    return args.studentDocId;
  },
});

export const deleteStudent = mutation({
  args: {
    studentDocId: v.id("students"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const existing = await ctx.db.get(args.studentDocId);
    if (!existing) {
      throw new Error("Student not found");
    }

    requireUniversityScope(session.user, existing.universityId);

    await ctx.db.delete(args.studentDocId);

    await writeAuditLog(ctx, {
      action: "student.deleted",
      entityType: "students",
      entityId: args.studentDocId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: existing.universityId,
    });

    return args.studentDocId;
  },
});

export const setStudentFeeStatus = mutation({
  args: {
    studentDocId: v.id("students"),
    feeStatus: feeStatusValidator,
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin", "finance"]);

    const existing = await ctx.db.get(args.studentDocId);
    if (!existing) {
      throw new Error("Student not found");
    }

    requireUniversityScope(session.user, existing.universityId);

    if (existing.feeStatus === args.feeStatus) {
      return args.studentDocId;
    }

    const previousStatus = existing.feeStatus;
    await ctx.db.patch(args.studentDocId, {
      feeStatus: args.feeStatus,
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "student.fee_status_changed",
      entityType: "students",
      entityId: args.studentDocId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: existing.universityId,
      context: {
        from: previousStatus,
        to: args.feeStatus,
      },
    });

    return args.studentDocId;
  },
});

export const setStudentLateRegistration = mutation({
  args: {
    studentDocId: v.id("students"),
    lateRegistration: v.boolean(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const existing = await ctx.db.get(args.studentDocId);
    if (!existing) {
      throw new Error("Student not found");
    }

    requireUniversityScope(session.user, existing.universityId);

    if (existing.lateRegistration === args.lateRegistration) {
      return args.studentDocId;
    }

    const previousValue = existing.lateRegistration;
    await ctx.db.patch(args.studentDocId, {
      lateRegistration: args.lateRegistration,
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "student.late_registration_changed",
      entityType: "students",
      entityId: args.studentDocId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: existing.universityId,
      context: {
        from: previousValue,
        to: args.lateRegistration,
      },
    });

    return args.studentDocId;
  },
});

/**
 * Idempotently ensure that the currently signed-in user (a student) has
 * a `students` row linked to their user. If one already exists it is
 * returned as-is. Otherwise a placeholder row is created with the lowest-
 * impact defaults so the student dashboard never throws:
 *   - programId: first program in the university (or fails loudly)
 *   - semester: 1
 *   - academicYear: current year window
 *   - feeStatus: "outstanding" (admin must clear)
 *   - lateRegistration: false
 *   - studentId / indexNumber: derived from the email local-part + university prefix
 *
 * The mutation is intentionally a no-op for non-student roles and for
 * users with no matched university.
 */
export const ensureStudentProfileForCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const session = await requireSessionUser(ctx);
    const sessionUser = session.user;

    if (sessionUser.role !== "student") {
      return { student: null, created: false };
    }

    const universityId = sessionUser.universityId;
    if (!universityId) {
      return { student: null, created: false };
    }

    const existing = (await ctx.db
      .query("students")
      .withIndex("by_university", (q) => q.eq("universityId", universityId))
      .collect())
      .find((candidate) => candidate.userId === sessionUser._id);

    if (existing) {
      return { student: existing, created: false };
    }

    const email = sessionUser.email;
    const emailLocalPart = email.includes("@")
      ? (email.split("@")[0] ?? "").trim()
      : email.trim();

    if (!emailLocalPart) {
      throw new Error("Cannot derive a student ID from your account email");
    }

    const university = await ctx.db.get(universityId);
    const prefix = university?.prefix?.trim();
    const finalStudentId = prefix && !emailLocalPart.toUpperCase().startsWith(prefix.toUpperCase())
      ? `${prefix}${emailLocalPart}`
      : emailLocalPart;

    const collision = await ctx.db
      .query("students")
      .withIndex("by_university_student_id", (q) =>
        q.eq("universityId", universityId).eq("studentId", finalStudentId),
      )
      .unique();

    if (collision) {
      throw new Error(
        `A student record with ID "${finalStudentId}" already exists in this university. ` +
          `Please ask your admin to merge or rename it.`,
      );
    }

    const programs = await ctx.db
      .query("programs")
      .withIndex("by_university", (q) => q.eq("universityId", universityId))
      .collect();

    const program = programs[0];
    if (!program) {
      throw new Error(
        "Your university has no programs configured. Ask your admin to set up at least one program before signing in.",
      );
    }

    const academicYear = (() => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth() + 1;
      return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
    })();

    const now = Date.now();
    const studentId = await ctx.db.insert("students", {
      universityId,
      userId: sessionUser._id,
      studentId: finalStudentId,
      indexNumber: finalStudentId,
      fullName: sessionUser.fullName,
      email,
      phone: sessionUser.phone ?? undefined,
      programId: program._id,
      semester: 1,
      academicYear,
      feeStatus: "outstanding",
      outstandingBalance: 0,
      lateRegistration: false,
      photoUrl: undefined,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "student.auto_enrolled",
      entityType: "students",
      entityId: studentId,
      actorUserId: sessionUser._id,
      actorRole: sessionUser.role,
      universityId,
      context: {
        source: "signup",
        email,
        matchedEmailDomain: email.split("@")[1] ?? null,
      },
    });

    const row = await ctx.db.get(studentId);
    return { student: row, created: true };
  },
});

export const importStudentsCsv = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    csvContent: v.string(),
    defaultProgramId: v.id("programs"),
    defaultSemester: v.number(),
    defaultAcademicYear: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const universityId = getScopedUniversityId(session.user, args.universityId);
    const rows = parseCsvRows(args.csvContent);

    const result: {
      imported: number;
      errors: Array<{ rowNumber: number; message: string }>;
    } = {
      imported: 0,
      errors: [],
    };

    const now = Date.now();

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;

      const rawStudentId = row.studentId || row.student_id || row.id;
      const studentId = await applyUniversityPrefix(ctx, universityId, rawStudentId);
      const indexNumber = row.indexNumber || row.index_number || row.index || studentId;
      const fullName = row.fullName || row.full_name || row.name;

      if (!studentId || !fullName) {
        result.errors.push({
          rowNumber,
          message: "Required columns missing (studentId, fullName)",
        });
        continue;
      }

      const existingStudentId = await ctx.db
        .query("students")
        .withIndex("by_university_student_id", (q) =>
          q.eq("universityId", universityId).eq("studentId", studentId),
        )
        .unique();

      if (existingStudentId) {
        result.errors.push({
          rowNumber,
          message: `Student ID ${studentId} already exists`,
        });
        continue;
      }

      const existingIndex = await ctx.db
        .query("students")
        .withIndex("by_university_index_number", (q) =>
          q.eq("universityId", universityId).eq("indexNumber", indexNumber),
        )
        .unique();

      if (existingIndex) {
        result.errors.push({
          rowNumber,
          message: `Index number ${indexNumber} already exists`,
        });
        continue;
      }

      const feeStatusRaw = (row.feeStatus || row.fee_status || "cleared").toLowerCase();
      const feeStatus = feeStatusRaw === "outstanding" ? "outstanding" : "cleared";
      const balanceRaw = row.outstandingBalance || row.outstanding_balance || "0";
      const outstandingBalance = Number.parseFloat(balanceRaw);

      if (Number.isNaN(outstandingBalance)) {
        result.errors.push({
          rowNumber,
          message: `Invalid outstanding balance value: ${balanceRaw}`,
        });
        continue;
      }

      await ctx.db.insert("students", {
        universityId,
        userId: undefined,
        studentId,
        indexNumber,
        fullName,
        email: row.email || undefined,
        phone: row.phone || undefined,
        programId: args.defaultProgramId,
        semester: args.defaultSemester,
        academicYear: args.defaultAcademicYear,
        feeStatus,
        outstandingBalance,
        lateRegistration: (row.lateRegistration || row.late_registration || "false") === "true",
        photoUrl: row.photoUrl || row.photo_url || undefined,
        createdAt: now,
        updatedAt: now,
      });

      result.imported += 1;
    }

    await writeAuditLog(ctx, {
      action: "student.csv_imported",
      entityType: "students",
      entityId: universityId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId,
      context: result,
    });

    return result;
  },
});

export const listMyResults = query({
  args: {
    academicYear: v.optional(v.string()),
    semester: v.optional(v.number()),
    includeUnapproved: v.optional(v.boolean()),
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
      return [];
    }

    let results = await ctx.db
      .query("courseResults")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();

    // Students only see approved results. Admins can opt in to
    // viewing every status (used for review/transcript generation).
    const isAdminViewer = session.user.role === "super_admin" || session.user.role === "university_admin";
    if (!isAdminViewer && !args.includeUnapproved) {
      results = results.filter((r) => r.status === "approved");
    }

    if (args.academicYear) {
      results = results.filter((r) => r.academicYear === args.academicYear);
    }
    if (typeof args.semester === "number") {
      results = results.filter((r) => r.semester === args.semester);
    }

    const enriched = await Promise.all(
      results.map(async (r) => {
        const [course, lecturer, examSchedule] = await Promise.all([
          ctx.db.get(r.courseId),
          ctx.db.get(r.lecturerId),
          r.examScheduleId ? ctx.db.get(r.examScheduleId) : Promise.resolve(null),
        ]);
        return {
          ...r,
          course,
          lecturer,
          examSchedule,
        };
      }),
    );

    return enriched;
  },
});

export const listMyPayments = query({
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

    const payments = await ctx.db
      .query("paymentRecords")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();

    return payments.sort((a, b) => b.createdAt - a.createdAt);
  },
});
