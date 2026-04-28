import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { getScopedUniversityId, requireRole, requireSessionUser, requireUniversityScope } from "./lib/auth";

const roomTypeValidator = v.union(
  v.literal("hall"),
  v.literal("lab"),
  v.literal("small_class"),
  v.literal("special_needs"),
);

export const listRooms = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    return await ctx.db
      .query("rooms")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();
  },
});

export const roomCapacityMetrics = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const activeRooms = rooms.filter((room) => room.isActive);
    const totalCapacity = activeRooms.reduce((sum, room) => sum + room.capacity, 0);
    const specialNeedsRooms = activeRooms.filter((room) => room.specialNeedsSupport).length;

    return {
      totalRooms: rooms.length,
      activeRooms: activeRooms.length,
      totalCapacity,
      specialNeedsRooms,
    };
  },
});

export const createRoom = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    name: v.string(),
    code: v.string(),
    roomType: roomTypeValidator,
    capacity: v.number(),
    location: v.optional(v.string()),
    specialNeedsSupport: v.boolean(),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    if (args.capacity <= 0) {
      throw new Error("Room capacity must be greater than zero");
    }

    const scoped = getScopedUniversityId(session.user, args.universityId);
    const roomCode = args.code;
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_university_code", (q) => q.eq("universityId", scoped).eq("code", roomCode))
      .unique();

    if (existing) {
      throw new Error("Room code already exists in this university");
    }

    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      universityId: scoped,
      name: args.name,
      code: args.code,
      roomType: args.roomType,
      capacity: args.capacity,
      location: args.location,
      specialNeedsSupport: args.specialNeedsSupport,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "room.created",
      entityType: "rooms",
      entityId: roomId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scoped,
    });

    return roomId;
  },
});

export const updateRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    roomType: v.optional(roomTypeValidator),
    capacity: v.optional(v.number()),
    location: v.optional(v.string()),
    specialNeedsSupport: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    requireUniversityScope(session.user, room.universityId);

    if (args.capacity !== undefined && args.capacity <= 0) {
      throw new Error("Room capacity must be greater than zero");
    }

    if (args.code && args.code !== room.code) {
      const nextCode = args.code as string;
      const existing = await ctx.db
        .query("rooms")
        .withIndex("by_university_code", (q) =>
          q.eq("universityId", room.universityId).eq("code", nextCode),
        )
        .unique();

      if (existing) {
        throw new Error("Room code already exists in this university");
      }
    }

    await ctx.db.patch(args.roomId, {
      name: args.name ?? room.name,
      code: args.code ?? room.code,
      roomType: args.roomType ?? room.roomType,
      capacity: args.capacity ?? room.capacity,
      location: args.location ?? room.location,
      specialNeedsSupport: args.specialNeedsSupport ?? room.specialNeedsSupport,
      isActive: args.isActive ?? room.isActive,
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "room.updated",
      entityType: "rooms",
      entityId: args.roomId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: room.universityId,
    });

    return args.roomId;
  },
});

export const deleteRoom = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    requireUniversityScope(session.user, room.universityId);

    const schedules = await ctx.db
      .query("examSchedules")
      .withIndex("by_room_exam_date", (q) => q.eq("roomId", args.roomId))
      .collect();

    if (schedules.length > 0) {
      throw new Error("Cannot delete room with existing exam schedules");
    }

    await ctx.db.delete(args.roomId);

    await writeAuditLog(ctx, {
      action: "room.deleted",
      entityType: "rooms",
      entityId: args.roomId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: room.universityId,
    });

    return args.roomId;
  },
});
