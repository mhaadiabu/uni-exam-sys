import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import {
  getOptionalScopedUniversityId,
  getScopedUniversityId,
  getSessionUser,
  requireRole,
  requireSessionUser,
  requireUniversityScope,
} from "./lib/auth";

const complaintCategoryValidator = v.union(
  v.literal("wrong_seat"),
  v.literal("wrong_timetable"),
  v.literal("wrong_details"),
  v.literal("payment_issue"),
  v.literal("id_verification_issue"),
  v.literal("attendance_system_issue"),
  v.literal("schedule_conflict"),
  v.literal("room_issue"),
  v.literal("other"),
);

const complaintStatusValidator = v.union(
  v.literal("open"),
  v.literal("in_review"),
  v.literal("resolved"),
  v.literal("rejected"),
);

const roleScopeValidator = v.union(
  v.literal("all"),
  v.literal("admin"),
  v.literal("student"),
  v.literal("invigilator"),
  v.literal("finance"),
  v.literal("super_admin"),
);

export const submitComplaint = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    category: complaintCategoryValidator,
    subject: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["student", "invigilator", "super_admin", "university_admin", "finance"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);
    const now = Date.now();

    const complaintId = await ctx.db.insert("complaints", {
      universityId: scoped,
      submittedByUserId: session.user._id,
      complainantRole: session.user.role,
      category: args.category,
      subject: args.subject,
      description: args.description,
      status: "open",
      resolutionNote: undefined,
      createdAt: now,
      updatedAt: now,
      resolvedAt: undefined,
    });

    await writeAuditLog(ctx, {
      action: "complaint.submitted",
      entityType: "complaints",
      entityId: complaintId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
      context: {
        category: args.category,
      },
    });

    return complaintId;
  },
});

export const listComplaints = query({
  args: {
    universityId: v.optional(v.id("universities")),
    status: v.optional(complaintStatusValidator),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getOptionalScopedUniversityId(session.user, args.universityId);

    if (!scoped) {
      return [];
    }

    const rows = await ctx.db
      .query("complaints")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const roleFiltered =
      session.user.role === "student" || session.user.role === "invigilator"
        ? rows.filter((row) => row.submittedByUserId === session.user._id)
        : rows;

    const statusFiltered = args.status
      ? roleFiltered.filter((row) => row.status === args.status)
      : roleFiltered;

    return statusFiltered.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const updateComplaintStatus = mutation({
  args: {
    complaintId: v.id("complaints"),
    status: complaintStatusValidator,
    resolutionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) {
      throw new Error("Complaint not found");
    }

    requireUniversityScope(session.user, complaint.universityId);

    await ctx.db.patch(args.complaintId, {
      status: args.status,
      resolutionNote: args.resolutionNote,
      updatedAt: Date.now(),
      resolvedAt: args.status === "resolved" ? Date.now() : complaint.resolvedAt,
    });

    await writeAuditLog(ctx, {
      action: "complaint.status_updated",
      entityType: "complaints",
      entityId: args.complaintId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: complaint.universityId,
      context: {
        status: args.status,
      },
    });

    return args.complaintId;
  },
});

export const addComplaintComment = mutation({
  args: {
    complaintId: v.id("complaints"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) {
      throw new Error("Complaint not found");
    }

    requireUniversityScope(session.user, complaint.universityId);

    const commentId = await ctx.db.insert("complaintComments", {
      universityId: complaint.universityId,
      complaintId: args.complaintId,
      authorUserId: session.user._id,
      message: args.message,
      createdAt: Date.now(),
    });

    return commentId;
  },
});

export const sendDirectMessage = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    recipientUserId: v.id("users"),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const recipient = await ctx.db.get(args.recipientUserId);
    if (!recipient) {
      throw new Error("Recipient not found");
    }

    if (recipient.universityId !== scoped) {
      throw new Error("Cannot send message across tenants");
    }

    const messageId = await ctx.db.insert("messages", {
      universityId: scoped,
      senderUserId: session.user._id,
      recipientUserId: args.recipientUserId,
      recipientRole: undefined,
      groupId: undefined,
      type: "direct",
      subject: args.subject,
      body: args.body,
      createdAt: Date.now(),
    });

    return messageId;
  },
});

export const broadcastMessage = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    roleScope: roleScopeValidator,
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const messageId = await ctx.db.insert("messages", {
      universityId: scoped,
      senderUserId: session.user._id,
      recipientUserId: undefined,
      recipientRole:
        args.roleScope === "all"
          ? undefined
          : args.roleScope === "admin"
            ? "university_admin"
            : args.roleScope,
      groupId: undefined,
      type: "broadcast",
      subject: args.subject,
      body: args.body,
      createdAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      universityId: scoped,
      userId: undefined,
      roleScope: args.roleScope,
      title: args.subject,
      body: args.body,
      readAt: undefined,
      createdAt: Date.now(),
    });

    return messageId;
  },
});

export const listMessages = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getOptionalScopedUniversityId(session.user, args.universityId);

    if (!scoped) {
      return [];
    }

    const rows = await ctx.db
      .query("messages")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    return rows.filter((message) => {
      if (message.type === "direct") {
        return message.senderUserId === session.user._id || message.recipientUserId === session.user._id;
      }

      if (message.type === "broadcast") {
        if (!message.recipientRole) {
          return true;
        }

        return message.recipientRole === session.user.role;
      }

      return true;
    });
  },
});

export const listNotifications = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await getSessionUser(ctx);
    if (!session) {
      return [];
    }

    const scoped = getOptionalScopedUniversityId(session.user, args.universityId);

    if (!scoped) {
      return [];
    }

    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const roleKey = session.user.role === "university_admin" ? "admin" : session.user.role;
    return rows.filter((row) => {
      if (row.userId && row.userId !== session.user._id) {
        return false;
      }
      return row.roleScope === "all" || row.roleScope === roleKey;
    });
  },
});

export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.universityId) {
      requireUniversityScope(session.user, notification.universityId);
    }

    await ctx.db.patch(args.notificationId, {
      readAt: Date.now(),
    });

    await ctx.db.insert("notificationLogs", {
      universityId: notification.universityId,
      notificationId: args.notificationId,
      deliveredToUserId: session.user._id,
      deliveredAt: Date.now(),
      channel: "in_app",
      success: true,
    });

    return args.notificationId;
  },
});

export const createReminderNotification = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    roleScope: roleScopeValidator,
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin", "finance"]);

    const scoped = getScopedUniversityId(session.user, args.universityId);

    const notificationId = await ctx.db.insert("notifications", {
      universityId: scoped,
      userId: undefined,
      roleScope: args.roleScope,
      title: args.title,
      body: args.body,
      readAt: undefined,
      createdAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "notification.created",
      entityType: "notifications",
      entityId: notificationId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
      context: {
        roleScope: args.roleScope,
      },
    });

    return notificationId;
  },
});
