import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import {
  getScopedUniversityId,
  requireRole,
  requireSessionUser,
  requireUniversityScope,
} from "./lib/auth";
import { isPlatformUniversity } from "./lib/platform";

export const listUniversities = query({
  args: {
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const includeDeleted = args.includeDeleted === true;

    if (session.user.role === "super_admin") {
      const all = await ctx.db.query("universities").collect();
      return all
        .filter((university) => !isPlatformUniversity(university))
        .filter((university) => includeDeleted || !university.deletedAt);
    }

    if (!session.user.universityId) {
      return [];
    }

    const ownUniversity = await ctx.db.get(session.user.universityId);
    if (!ownUniversity || isPlatformUniversity(ownUniversity)) {
      return [];
    }
    if (!includeDeleted && ownUniversity.deletedAt) {
      return [];
    }
    return [ownUniversity];
  },
});

export const getBranding = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scopedUniversityId = getScopedUniversityId(session.user, args.universityId);

    const branding = await ctx.db
      .query("brandingSettings")
      .withIndex("by_university", (q) => q.eq("universityId", scopedUniversityId))
      .unique();

    return branding;
  },
});

export const updateBranding = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    idCardTemplate: v.optional(v.string()),
    attendanceReportTemplate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const scopedUniversityId = getScopedUniversityId(session.user, args.universityId);
    requireUniversityScope(session.user, scopedUniversityId);

    const existing = await ctx.db
      .query("brandingSettings")
      .withIndex("by_university", (q) => q.eq("universityId", scopedUniversityId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        logoUrl: args.logoUrl,
        primaryColor: args.primaryColor,
        secondaryColor: args.secondaryColor,
        idCardTemplate: args.idCardTemplate,
        attendanceReportTemplate: args.attendanceReportTemplate,
        updatedAt: now,
      });

      await writeAuditLog(ctx, {
        action: "branding.updated",
        entityType: "brandingSettings",
        entityId: existing._id,
        actorUserId: session.user._id,
        actorRole: session.user.role,
        universityId: scopedUniversityId,
      });

      return existing._id;
    }

    const id = await ctx.db.insert("brandingSettings", {
      universityId: scopedUniversityId,
      logoUrl: args.logoUrl,
      primaryColor: args.primaryColor,
      secondaryColor: args.secondaryColor,
      idCardTemplate: args.idCardTemplate,
      attendanceReportTemplate: args.attendanceReportTemplate,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "branding.created",
      entityType: "brandingSettings",
      entityId: id,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scopedUniversityId,
    });

    return id;
  },
});

export const updateAllowedEmailDomains = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    allowedEmailDomains: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const scopedUniversityId = getScopedUniversityId(session.user, args.universityId);
    requireUniversityScope(session.user, scopedUniversityId);

    const university = await ctx.db.get(scopedUniversityId);
    if (!university) {
      throw new Error("University not found");
    }

    const allowedEmailDomains = Array.from(
      new Set(args.allowedEmailDomains.map((domain) => domain.trim().toLowerCase().replace(/^@+/, "")).filter(Boolean)),
    );

    if (allowedEmailDomains.length === 0) {
      throw new Error("At least one allowed email domain is required");
    }

    await ctx.db.patch(scopedUniversityId, {
      allowedEmailDomains,
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "university.allowed_domains_updated",
      entityType: "universities",
      entityId: scopedUniversityId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scopedUniversityId,
      context: { allowedEmailDomains },
    });

    return scopedUniversityId;
  },
});

export const softDeleteUniversity = mutation({
  args: {
    universityId: v.id("universities"),
    confirmationName: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin"]);

    const university = await ctx.db.get(args.universityId);
    if (!university) {
      throw new Error("University not found");
    }
    if (isPlatformUniversity(university)) {
      throw new Error("The platform tenant cannot be deleted");
    }
    if (university.deletedAt) {
      throw new Error("University is already deleted");
    }
    if (args.confirmationName.trim() !== university.name) {
      throw new Error("Confirmation name does not match");
    }

    const now = Date.now();
    await ctx.db.patch(args.universityId, {
      isActive: false,
      deletedAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "university.soft_deleted",
      entityType: "universities",
      entityId: args.universityId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: args.universityId,
      context: {
        confirmationName: args.confirmationName.trim(),
        name: university.name,
      },
    });

    return args.universityId;
  },
});

export const restoreUniversity = mutation({
  args: {
    universityId: v.id("universities"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin"]);

    const university = await ctx.db.get(args.universityId);
    if (!university) {
      throw new Error("University not found");
    }
    if (!university.deletedAt) {
      throw new Error("University is not deleted");
    }

    const now = Date.now();
    await ctx.db.patch(args.universityId, {
      isActive: true,
      deletedAt: undefined,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "university.restored",
      entityType: "universities",
      entityId: args.universityId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: args.universityId,
    });

    return args.universityId;
  },
});
