import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { getScopedUniversityId, requireRole, requireSessionUser, requireUniversityScope } from "./lib/auth";

const idCardStatusValidator = v.union(
  v.literal("generated"),
  v.literal("ready"),
  v.literal("printed"),
  v.literal("reprint_requested"),
);

export const generateStudentIdCard = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    studentDocId: v.id("students"),
    validityStart: v.string(),
    validityEnd: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const student = await ctx.db.get(args.studentDocId);
    if (!student) {
      throw new Error("Student not found");
    }

    const scoped = getScopedUniversityId(session.user, args.universityId);
    if (student.universityId !== scoped) {
      throw new Error("Cross-tenant access denied");
    }

    const existing = await ctx.db
      .query("studentIdCards")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentDocId))
      .unique();

    const now = Date.now();
    const qrCodeValue = `${student.studentId}-${student.indexNumber}-${args.validityEnd}`;

    if (existing) {
      await ctx.db.patch(existing._id, {
        validityStart: args.validityStart,
        validityEnd: args.validityEnd,
        status: "generated",
        qrCodeValue,
        generatedAt: now,
        updatedAt: now,
      });

      await writeAuditLog(ctx, {
        action: "id_card.regenerated",
        entityType: "studentIdCards",
        entityId: existing._id,
        actorUserId: session.user._id,
        actorRole: session.user.role,
        universityId: scoped,
      });

      return existing._id;
    }

    const idCardId = await ctx.db.insert("studentIdCards", {
      universityId: scoped,
      studentId: args.studentDocId,
      validityStart: args.validityStart,
      validityEnd: args.validityEnd,
      status: "generated",
      qrCodeValue,
      generatedAt: now,
      printedAt: undefined,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "id_card.generated",
      entityType: "studentIdCards",
      entityId: idCardId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
    });

    return idCardId;
  },
});

export const generateBulkIdCards = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    studentDocIds: v.array(v.id("students")),
    validityStart: v.string(),
    validityEnd: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);
    const createdIds: Array<string> = [];

    for (const studentDocId of args.studentDocIds) {
      const student = await ctx.db.get(studentDocId);
      if (!student || student.universityId !== scoped) {
        continue;
      }

      const existing = await ctx.db
        .query("studentIdCards")
        .withIndex("by_student", (q) => q.eq("studentId", studentDocId))
        .unique();

      const now = Date.now();
      const qrCodeValue = `${student.studentId}-${student.indexNumber}-${args.validityEnd}`;

      if (existing) {
        await ctx.db.patch(existing._id, {
          validityStart: args.validityStart,
          validityEnd: args.validityEnd,
          status: "generated",
          qrCodeValue,
          generatedAt: now,
          updatedAt: now,
        });
        createdIds.push(existing._id);
        continue;
      }

      const idCardId = await ctx.db.insert("studentIdCards", {
        universityId: scoped,
        studentId: studentDocId,
        validityStart: args.validityStart,
        validityEnd: args.validityEnd,
        status: "generated",
        qrCodeValue,
        generatedAt: now,
        printedAt: undefined,
        updatedAt: now,
      });
      createdIds.push(idCardId);
    }

    await writeAuditLog(ctx, {
      action: "id_card.bulk_generated",
      entityType: "studentIdCards",
      entityId: scoped,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
      context: {
        count: createdIds.length,
      },
    });

    return {
      count: createdIds.length,
      idCardIds: createdIds,
    };
  },
});

export const listIdCards = query({
  args: {
    universityId: v.optional(v.id("universities")),
    status: v.optional(idCardStatusValidator),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const rows = await ctx.db
      .query("studentIdCards")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const filtered = args.status ? rows.filter((row) => row.status === args.status) : rows;

    return await Promise.all(
      filtered.map(async (row) => {
        const student = await ctx.db.get(row.studentId);
        return {
          ...row,
          student,
        };
      }),
    );
  },
});

export const markIdCardPrinted = mutation({
  args: {
    idCardId: v.id("studentIdCards"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const card = await ctx.db.get(args.idCardId);
    if (!card) {
      throw new Error("ID card not found");
    }

    requireUniversityScope(session.user, card.universityId);

    await ctx.db.patch(args.idCardId, {
      status: "printed",
      printedAt: Date.now(),
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "id_card.printed",
      entityType: "studentIdCards",
      entityId: args.idCardId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: card.universityId,
    });

    return args.idCardId;
  },
});

export const requestIdCardReprint = mutation({
  args: {
    idCardId: v.id("studentIdCards"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["student", "super_admin", "university_admin"]);

    const card = await ctx.db.get(args.idCardId);
    if (!card) {
      throw new Error("ID card not found");
    }

    requireUniversityScope(session.user, card.universityId);

    if (session.user.role === "student") {
      const student = await ctx.db.get(card.studentId);
      if (!student || student.userId !== session.user._id) {
        throw new Error("You can only request reprint for your own ID card");
      }
    }

    await ctx.db.patch(args.idCardId, {
      status: "reprint_requested",
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "id_card.reprint_requested",
      entityType: "studentIdCards",
      entityId: args.idCardId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: card.universityId,
      context: {
        reason: args.reason,
      },
    });

    return args.idCardId;
  },
});

export const getMyDigitalIdCard = query({
  args: {
    studentUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);

    const targetUserId = args.studentUserId ?? session.user._id;
    if (targetUserId !== session.user._id) {
      requireRole(session.user, ["super_admin", "university_admin", "invigilator"]);
    }

    const student = (await ctx.db.query("students").collect()).find((candidate) => candidate.userId === targetUserId);
    if (!student) {
      return null;
    }

    requireUniversityScope(session.user, student.universityId);

    const idCard = await ctx.db
      .query("studentIdCards")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .unique();

    const program = await ctx.db.get(student.programId);
    const university = await ctx.db.get(student.universityId);

    return {
      student,
      idCard,
      program,
      university,
    };
  },
});
