import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { getScopedUniversityId, requireRole, requireSessionUser } from "./lib/auth";

export const listEmergencyAnnouncements = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);
    const now = Date.now();

    const rows = await ctx.db
      .query("emergencyAnnouncements")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    return rows
      .filter((row) => row.activeFrom <= now && row.activeTo >= now)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const createEmergencyAnnouncement = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    message: v.string(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    activeFrom: v.number(),
    activeTo: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);

    const id = await ctx.db.insert("emergencyAnnouncements", {
      universityId: scoped,
      message: args.message,
      severity: args.severity,
      activeFrom: args.activeFrom,
      activeTo: args.activeTo,
      createdByUserId: session.user._id,
      createdAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "emergency_announcement.created",
      entityType: "emergencyAnnouncements",
      entityId: id,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
      context: { severity: args.severity },
    });

    return id;
  },
});

export const deleteEmergencyAnnouncement = mutation({
  args: {
    announcementId: v.id("emergencyAnnouncements"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) {
      throw new Error("Announcement not found");
    }

    await ctx.db.delete(args.announcementId);

    await writeAuditLog(ctx, {
      action: "emergency_announcement.deleted",
      entityType: "emergencyAnnouncements",
      entityId: args.announcementId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: announcement.universityId,
    });

    return args.announcementId;
  },
});
