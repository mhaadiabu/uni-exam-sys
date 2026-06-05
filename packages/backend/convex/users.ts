import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { getScopedUniversityId, requireRole, requireSessionUser } from "./lib/auth";
import { getOrCreatePlatformUniversity } from "./lib/platform";

const roleValidator = v.union(
  v.literal("super_admin"),
  v.literal("university_admin"),
  v.literal("lecturer"),
  v.literal("student"),
  v.literal("invigilator"),
  v.literal("finance"),
);

export const listUsers = query({
  args: {
    universityId: v.optional(v.id("universities")),
    role: v.optional(roleValidator),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);

    if (session.user.role === "super_admin" && !args.universityId) {
      const all = await ctx.db.query("users").collect();
      return args.role ? all.filter((user) => user.role === args.role) : all;
    }

    const scopedUniversityId = getScopedUniversityId(session.user, args.universityId);
    const rows = await ctx.db
      .query("users")
      .withIndex("by_university", (q) => q.eq("universityId", scopedUniversityId))
      .collect();

    return args.role ? rows.filter((row) => row.role === args.role) : rows;
  },
});

export const createUser = mutation({
  args: {
    universityId: v.optional(v.id("universities")),
    role: roleValidator,
    externalId: v.string(),
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    employeeId: v.optional(v.string()),
    staffId: v.optional(v.string()),
    ratePerSession: v.optional(v.number()),
    attendanceBonus: v.optional(v.number()),
    department: v.optional(v.string()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    if (args.role === "super_admin" && session.user.role !== "super_admin") {
      throw new Error("Only super admins can create super admins");
    }

    const scopedUniversityId =
      args.role === "super_admin"
        ? (await getOrCreatePlatformUniversity(ctx))._id
        : getScopedUniversityId(session.user, args.universityId);

    const existing = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (existing) {
      throw new Error("A user with this external ID already exists");
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      externalId: args.externalId,
      universityId: scopedUniversityId,
      role: args.role,
      fullName: args.fullName,
      email: args.email,
      phone: args.phone,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      createdAt: now,
      updatedAt: now,
    });

    if (args.role === "invigilator") {
      if (!scopedUniversityId) {
        throw new Error("Invigilator must belong to a university");
      }

      await ctx.db.insert("invigilators", {
        universityId: scopedUniversityId,
        userId,
        staffId: args.staffId ?? args.externalId,
        fullName: args.fullName,
        email: args.email,
        phone: args.phone,
        ratePerSession: args.ratePerSession ?? 0,
        attendanceBonus: args.attendanceBonus ?? 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (args.role === "finance") {
      if (!scopedUniversityId) {
        throw new Error("Finance user must belong to a university");
      }

      await ctx.db.insert("financeUsers", {
        universityId: scopedUniversityId,
        userId,
        employeeId: args.employeeId ?? args.externalId,
        fullName: args.fullName,
        email: args.email,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (args.role === "lecturer") {
      if (!scopedUniversityId) {
        throw new Error("Lecturer must belong to a university");
      }

      await ctx.db.insert("lecturers", {
        universityId: scopedUniversityId,
        userId,
        staffId: args.staffId ?? args.externalId,
        fullName: args.fullName,
        email: args.email,
        phone: args.phone,
        department: args.department,
        title: args.title,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    await writeAuditLog(ctx, {
      action: "user.created",
      entityType: "users",
      entityId: userId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: scopedUniversityId,
      context: {
        createdRole: args.role,
        email: args.email,
      },
    });

    return userId;
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new Error("User not found");
    }

    if (session.user.role === "super_admin") {
      await ctx.db.patch(args.userId, {
        fullName: args.fullName ?? target.fullName,
        email: args.email ?? target.email,
        phone: args.phone ?? target.phone,
        isActive: args.isActive ?? target.isActive,
        updatedAt: Date.now(),
      });
    } else if (session.user.role === "university_admin") {
      if (!session.user.universityId || target.universityId !== session.user.universityId) {
        throw new Error("Cross-tenant access denied");
      }

      await ctx.db.patch(args.userId, {
        fullName: args.fullName ?? target.fullName,
        email: args.email ?? target.email,
        phone: args.phone ?? target.phone,
        isActive: args.isActive ?? target.isActive,
        updatedAt: Date.now(),
      });
    } else if (session.user._id === args.userId) {
      await ctx.db.patch(args.userId, {
        fullName: args.fullName ?? target.fullName,
        email: args.email ?? target.email,
        phone: args.phone ?? target.phone,
        updatedAt: Date.now(),
      });
    } else {
      throw new Error("You do not have permission to update this profile");
    }

    await writeAuditLog(ctx, {
      action: "user.updated",
      entityType: "users",
      entityId: args.userId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: target.universityId,
    });

    return args.userId;
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    newRole: roleValidator,
    staffId: v.optional(v.string()),
    ratePerSession: v.optional(v.number()),
    attendanceBonus: v.optional(v.number()),
    employeeId: v.optional(v.string()),
    department: v.optional(v.string()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new Error("User not found");
    }

    if (target._id === session.user._id) {
      throw new Error("You cannot change your own role");
    }

    if (args.newRole === "super_admin" && session.user.role !== "super_admin") {
      throw new Error("Only super admins can promote users to super admin");
    }

    if (target.role === "super_admin" && session.user.role !== "super_admin") {
      throw new Error("Only super admins can modify other super admins");
    }

    if (session.user.role === "university_admin") {
      if (!session.user.universityId || target.universityId !== session.user.universityId) {
        throw new Error("Cross-tenant access denied");
      }
    }

    const previousRole = target.role;
    const now = Date.now();

    // Update the user role
    const updateFields: Record<string, unknown> = {
      role: args.newRole,
      updatedAt: now,
    };

    // If promoting to super_admin, attach to the Platform university
    if (args.newRole === "super_admin") {
      const platform = await getOrCreatePlatformUniversity(ctx);
      updateFields.universityId = platform._id;
    }

    // Demoting a super_admin to a tenant-scoped role requires explicit handling
    // because the Platform university is not a real tenant. Block it here; a
    // dedicated mutation can handle the demotion flow in the future.
    if (previousRole === "super_admin" && args.newRole !== "super_admin") {
      throw new Error(
        "Demoting a super admin is not supported. Create a new user with the desired role instead.",
      );
    }

    await ctx.db.patch(args.userId, updateFields);

    // Create linked records when promoting to invigilator
    if (args.newRole === "invigilator" && previousRole !== "invigilator") {
      const universityId = target.universityId;
      if (!universityId) {
        throw new Error("Invigilator must belong to a university");
      }

      // Check if an invigilator record already exists for this user
      const existingInvigilator = await ctx.db
        .query("invigilators")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .unique();

      if (!existingInvigilator) {
        await ctx.db.insert("invigilators", {
          universityId,
          userId: args.userId,
          staffId: args.staffId ?? target.externalId,
          fullName: target.fullName,
          email: target.email,
          phone: target.phone,
          ratePerSession: args.ratePerSession ?? 0,
          attendanceBonus: args.attendanceBonus ?? 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      } else if (!existingInvigilator.isActive) {
        await ctx.db.patch(existingInvigilator._id, { isActive: true, updatedAt: now });
      }
    }

    // Create linked records when promoting to finance
    if (args.newRole === "finance" && previousRole !== "finance") {
      const universityId = target.universityId;
      if (!universityId) {
        throw new Error("Finance user must belong to a university");
      }

      const existingFinanceUser = await ctx.db
        .query("financeUsers")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .unique();

      if (!existingFinanceUser) {
        await ctx.db.insert("financeUsers", {
          universityId,
          userId: args.userId,
          employeeId: args.employeeId ?? target.externalId,
          fullName: target.fullName,
          email: target.email,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Create linked records when promoting to lecturer
    if (args.newRole === "lecturer" && previousRole !== "lecturer") {
      const universityId = target.universityId;
      if (!universityId) {
        throw new Error("Lecturer must belong to a university");
      }

      const existingLecturer = await ctx.db
        .query("lecturers")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .unique();

      if (!existingLecturer) {
        await ctx.db.insert("lecturers", {
          universityId,
          userId: args.userId,
          staffId: args.staffId ?? target.externalId,
          fullName: target.fullName,
          email: target.email,
          phone: target.phone,
          department: args.department,
          title: args.title,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      } else if (!existingLecturer.isActive) {
        await ctx.db.patch(existingLecturer._id, { isActive: true, updatedAt: now });
      }
    }

    // Deactivate linked records when demoting away from invigilator
    if (previousRole === "invigilator" && args.newRole !== "invigilator") {
      const existingInvigilator = await ctx.db
        .query("invigilators")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .unique();

      if (existingInvigilator) {
        await ctx.db.patch(existingInvigilator._id, { isActive: false, updatedAt: now });
      }
    }

    // Deactivate linked records when demoting away from lecturer
    if (previousRole === "lecturer" && args.newRole !== "lecturer") {
      const existingLecturer = await ctx.db
        .query("lecturers")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .unique();

      if (existingLecturer) {
        await ctx.db.patch(existingLecturer._id, { isActive: false, updatedAt: now });
      }
    }

    await writeAuditLog(ctx, {
      action: "user.role_changed",
      entityType: "users",
      entityId: args.userId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: target.universityId,
      context: {
        previousRole,
        newRole: args.newRole,
        email: target.email,
      },
    });

    return args.userId;
  },
});

export const deactivateUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new Error("User not found");
    }

    if (session.user.role !== "super_admin") {
      if (!session.user.universityId || target.universityId !== session.user.universityId) {
        throw new Error("Cross-tenant access denied");
      }
    }

    await ctx.db.patch(args.userId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "user.deactivated",
      entityType: "users",
      entityId: args.userId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: target.universityId,
    });

    return args.userId;
  },
});
