import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { getScopedUniversityId, requireRole, requireSessionUser, requireUniversityScope } from "./lib/auth";

const paymentStatusValidator = v.union(v.literal("pending"), v.literal("approved"), v.literal("paid"));

export const updateStudentClearance = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    studentDocId: v.id("students"),
    feeStatus: v.union(v.literal("cleared"), v.literal("outstanding")),
    outstandingBalance: v.number(),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["finance", "super_admin", "university_admin"]);

    const student = await ctx.db.get(args.studentDocId);
    if (!student) {
      throw new Error("Student not found");
    }

    const scoped = getScopedUniversityId(session.user, args.universityId);
    if (student.universityId !== scoped) {
      throw new Error("Cross-tenant access denied");
    }

    await ctx.db.patch(args.studentDocId, {
      feeStatus: args.feeStatus,
      outstandingBalance: args.outstandingBalance,
      updatedAt: Date.now(),
    });

    const paymentRecordId = await ctx.db.insert("paymentRecords", {
      universityId: scoped,
      studentId: args.studentDocId,
      invigilatorId: undefined,
      type: "student_fee",
      amount: args.outstandingBalance,
      status: args.feeStatus === "cleared" ? "approved" : "pending",
      reference: args.reference,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "finance.clearance_updated",
      entityType: "students",
      entityId: args.studentDocId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
      context: {
        feeStatus: args.feeStatus,
        outstandingBalance: args.outstandingBalance,
      },
    });

    return paymentRecordId;
  },
});

export const createCourseRegPayment = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    studentDocId: v.id("students"),
    amount: v.number(),
    reference: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["finance", "super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);
    const student = await ctx.db.get(args.studentDocId);
    if (!student) {
      throw new Error("Student not found");
    }
    if (student.universityId !== scoped) {
      throw new Error("Cross-tenant access denied");
    }

    const now = Date.now();
    const paymentId = await ctx.db.insert("paymentRecords", {
      universityId: scoped,
      studentId: args.studentDocId,
      type: "course_reg_payment",
      amount: args.amount,
      status: "pending",
      reference: args.reference,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "finance.course_reg_payment_created",
      entityType: "paymentRecords",
      entityId: paymentId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
      context: { studentId: args.studentDocId, amount: args.amount },
    });

    return paymentId;
  },
});

export const listClearanceOverview = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["finance", "super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);
    const students = await ctx.db
      .query("students")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const cleared = students.filter((student) => student.feeStatus === "cleared");
    const outstanding = students.filter((student) => student.feeStatus === "outstanding");

    const totalOutstanding = outstanding.reduce((sum, student) => sum + student.outstandingBalance, 0);

    return {
      totalStudents: students.length,
      cleared: cleared.length,
      outstanding: outstanding.length,
      totalOutstanding,
      rows: students,
    };
  },
});

export const createInvigilatorPayment = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    invigilatorId: v.id("invigilators"),
    sessions: v.number(),
    includeAttendanceBonus: v.boolean(),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["finance", "super_admin", "university_admin"]);

    const invigilator = await ctx.db.get(args.invigilatorId);
    if (!invigilator) {
      throw new Error("Invigilator not found");
    }

    const scoped = getScopedUniversityId(session.user, args.universityId);
    if (invigilator.universityId !== scoped) {
      throw new Error("Cross-tenant access denied");
    }

    const amount =
      invigilator.ratePerSession * args.sessions +
      (args.includeAttendanceBonus ? invigilator.attendanceBonus : 0);

    const recordId = await ctx.db.insert("paymentRecords", {
      universityId: scoped,
      studentId: undefined,
      invigilatorId: args.invigilatorId,
      type: args.includeAttendanceBonus ? "attendance_bonus" : "invigilator_payment",
      amount,
      status: "pending",
      reference: args.reference,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "finance.invigilator_payment_created",
      entityType: "paymentRecords",
      entityId: recordId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
      context: {
        sessions: args.sessions,
        includeAttendanceBonus: args.includeAttendanceBonus,
      },
    });

    return recordId;
  },
});

export const updatePaymentStatus = mutation({
  args: {
    paymentRecordId: v.id("paymentRecords"),
    status: paymentStatusValidator,
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["finance", "super_admin", "university_admin"]);

    const payment = await ctx.db.get(args.paymentRecordId);
    if (!payment) {
      throw new Error("Payment record not found");
    }

    requireUniversityScope(session.user, payment.universityId);

    await ctx.db.patch(args.paymentRecordId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "finance.payment_status_updated",
      entityType: "paymentRecords",
      entityId: args.paymentRecordId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: payment.universityId,
      context: {
        status: args.status,
      },
    });

    return args.paymentRecordId;
  },
});

export const listFinanceReports = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["finance", "super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);

    const [payments, attendanceRows] = await Promise.all([
      ctx.db
        .query("paymentRecords")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
      ctx.db.query("examAttendance").collect(),
    ]);

    const defaulterAttendance = await Promise.all(
      attendanceRows.map(async (row) => {
        const student = await ctx.db.get(row.studentId);
        if (!student || student.universityId !== scoped || student.feeStatus === "cleared") {
          return null;
        }

        return {
          studentId: student.studentId,
          fullName: student.fullName,
          feeStatus: student.feeStatus,
          attendanceStatus: row.status,
        };
      }),
    );

    return {
      payments,
      defaulterAttendance: defaulterAttendance.filter((item) => item !== null),
    };
  },
});
