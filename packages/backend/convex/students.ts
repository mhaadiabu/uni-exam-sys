import { mutation, query } from "./_generated/server";
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
      throw new Error("Student profile not found");
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

    const existingStudentId = await ctx.db
      .query("students")
      .withIndex("by_university_student_id", (q) =>
        q.eq("universityId", universityId).eq("studentId", args.studentId),
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
      studentId: args.studentId,
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

      const studentId = row.studentId || row.student_id || row.id;
      const indexNumber = row.indexNumber || row.index_number || row.index;
      const fullName = row.fullName || row.full_name || row.name;

      if (!studentId || !indexNumber || !fullName) {
        result.errors.push({
          rowNumber,
          message: "Required columns missing (studentId, indexNumber, fullName)",
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
