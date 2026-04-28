import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import {
  getScopedUniversityId,
  requireRole,
  requireSessionUser,
  requireUniversityScope,
} from "./lib/auth";

export const listUniversities = query({
  args: {},
  handler: async (ctx) => {
    const session = await requireSessionUser(ctx);
    if (session.user.role === "super_admin") {
      return await ctx.db.query("universities").collect();
    }

    if (!session.user.universityId) {
      return [];
    }

    const ownUniversity = await ctx.db.get(session.user.universityId);
    return ownUniversity ? [ownUniversity] : [];
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
