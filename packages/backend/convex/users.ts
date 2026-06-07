import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

import { writeAuditLog } from "./lib/audit";
import {
  getOptionalScopedUniversityId,
  getScopedUniversityId,
  requireRole,
  requireSessionUser,
} from "./lib/auth";
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
    // When true, callers in the PLATFORM tenant (i.e. super admins without
    // a real-university scope) get every user across every tenant. This
    // is what the super admin needs from /people to manage university
    // admins they would otherwise be hidden from because the PLATFORM
    // tenant filters them out.
    includeAllTenants: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);

    if (args.universityId) {
      if (
        session.user.role !== "super_admin" &&
        args.universityId !== session.user.universityId
      ) {
        throw new Error("Cross-tenant access denied");
      }
      const rows = await ctx.db
        .query("users")
        .withIndex("by_university", (q) =>
          q.eq("universityId", args.universityId!),
        )
        .collect();
      return args.role ? rows.filter((row) => row.role === args.role) : rows;
    }

    // Super admin with no specific tenant: return every real-tenant
    // user. `getOptionalScopedUniversityId` returns `undefined` for
    // super admins, so we sidestep the PLATFORM-tenant isolation that
    // would otherwise leave the page empty.
    const scopedUniversityId = getOptionalScopedUniversityId(
      session.user,
      args.universityId,
    );
    if (scopedUniversityId) {
      const rows = await ctx.db
        .query("users")
        .withIndex("by_university", (q) =>
          q.eq("universityId", scopedUniversityId),
        )
        .collect();
      return args.role ? rows.filter((row) => row.role === args.role) : rows;
    }

    const all = await ctx.db.query("users").collect();
    // Find the PLATFORM university without invoking the mutation helper
    // (which requires MutationCtx). For the read-only path we just look
    // up the well-known code "PLATFORM" and filter out users attached
    // to it (other than super admins themselves).
    const platform = await ctx.db
      .query("universities")
      .withIndex("by_code", (q) => q.eq("code", "PLATFORM"))
      .unique();
    const platformUniversityId = platform?._id;
    return all.filter(
      (u) =>
        (args.role ? u.role === args.role : true) &&
        (u.role === "super_admin" ||
          !platformUniversityId ||
          u.universityId !== platformUniversityId),
    );
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
    universityId: v.optional(v.id("universities")),
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
      if (args.universityId && args.universityId !== session.user.universityId) {
        throw new Error("University admins can only assign users to their own university");
      }
    }

    // Demoting a super_admin to a tenant-scoped role requires explicit handling
    // because the Platform university is not a real tenant. Block it here; a
    // dedicated mutation can handle the demotion flow in the future.
    if (target.role === "super_admin" && args.newRole !== "super_admin") {
      throw new Error(
        "Demoting a super admin is not supported. Create a new user with the desired role instead.",
      );
    }

    // Last-active university admin protection: do not let a tenant lose
    // the ability to manage itself by stripping the role from the only
    // remaining active admin in that university.
    if (
      target.role === "university_admin" &&
      target.isActive &&
      args.newRole !== "university_admin" &&
      target.universityId
    ) {
      const otherAdmins = await ctx.db
        .query("users")
        .withIndex("by_university_role", (q) =>
          q.eq("universityId", target.universityId!).eq("role", "university_admin"),
        )
        .collect();
      const remaining = otherAdmins.filter(
        (u) => u._id !== target._id && u.isActive,
      );
      if (remaining.length === 0) {
        throw new Error(
          "Cannot change role: this user is the last active university admin for their tenant. Promote another admin first.",
        );
      }
    }

    const previousRole = target.role;
    const previousUniversityId = target.universityId;
    const now = Date.now();

    // Resolve the university the user should belong to after this change.
    let nextUniversityId = target.universityId;
    let universityChanged = false;
    if (args.newRole === "super_admin") {
      const platform = await getOrCreatePlatformUniversity(ctx);
      nextUniversityId = platform._id;
      universityChanged = nextUniversityId !== previousUniversityId;
    } else if (args.universityId && args.universityId !== target.universityId) {
      const targetUniversity = await ctx.db.get(args.universityId);
      if (!targetUniversity) {
        throw new Error("Target university not found");
      }
      if (targetUniversity.deletedAt || !targetUniversity.isActive) {
        throw new Error("Target university is not active");
      }
      nextUniversityId = targetUniversity._id;
      universityChanged = true;
    }

    const updateFields: Record<string, unknown> = {
      role: args.newRole,
      updatedAt: now,
      // A role change implies intent for the user to operate under the
      // new role. Auto-activate an inactive user so they aren't left with
      // a fresh role they can't use. Use `reactivateUser` if you only
      // want to flip the active flag.
      isActive: true,
    };
    if (universityChanged) {
      updateFields.universityId = nextUniversityId;
    }

    await ctx.db.patch(args.userId, updateFields);

    const linkedUniversityId = nextUniversityId;

    // Create linked records when promoting to invigilator
    if (args.newRole === "invigilator" && previousRole !== "invigilator") {
      if (!linkedUniversityId) {
        throw new Error("Invigilator must belong to a university");
      }

      const existingInvigilator = await ctx.db
        .query("invigilators")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .unique();

      if (!existingInvigilator) {
        await ctx.db.insert("invigilators", {
          universityId: linkedUniversityId,
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
      } else if (!existingInvigilator.isActive || universityChanged) {
        await ctx.db.patch(existingInvigilator._id, {
          universityId: linkedUniversityId,
          staffId: args.staffId ?? existingInvigilator.staffId,
          fullName: target.fullName,
          email: target.email,
          phone: target.phone,
          ratePerSession: args.ratePerSession ?? existingInvigilator.ratePerSession,
          attendanceBonus: args.attendanceBonus ?? existingInvigilator.attendanceBonus,
          isActive: true,
          updatedAt: now,
        });
      }
    }

    // Create linked records when promoting to finance
    if (args.newRole === "finance" && previousRole !== "finance") {
      if (!linkedUniversityId) {
        throw new Error("Finance user must belong to a university");
      }

      const existingFinanceUser = await ctx.db
        .query("financeUsers")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .unique();

      if (!existingFinanceUser) {
        await ctx.db.insert("financeUsers", {
          universityId: linkedUniversityId,
          userId: args.userId,
          employeeId: args.employeeId ?? target.externalId,
          fullName: target.fullName,
          email: target.email,
          createdAt: now,
          updatedAt: now,
        });
      } else if (universityChanged) {
        await ctx.db.patch(existingFinanceUser._id, {
          universityId: linkedUniversityId,
          employeeId: args.employeeId ?? existingFinanceUser.employeeId,
          fullName: target.fullName,
          email: target.email,
          updatedAt: now,
        });
      }
    }

    // Create linked records when promoting to lecturer
    if (args.newRole === "lecturer" && previousRole !== "lecturer") {
      if (!linkedUniversityId) {
        throw new Error("Lecturer must belong to a university");
      }

      const existingLecturer = await ctx.db
        .query("lecturers")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .unique();

      if (!existingLecturer) {
        await ctx.db.insert("lecturers", {
          universityId: linkedUniversityId,
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
      } else if (!existingLecturer.isActive || universityChanged) {
        await ctx.db.patch(existingLecturer._id, {
          universityId: linkedUniversityId,
          staffId: args.staffId ?? existingLecturer.staffId,
          fullName: target.fullName,
          email: target.email,
          phone: target.phone,
          department: args.department ?? existingLecturer.department,
          title: args.title ?? existingLecturer.title,
          isActive: true,
          updatedAt: now,
        });
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

    // Deactivate linked records when demoting away from finance
    if (previousRole === "finance" && args.newRole !== "finance") {
      const existingFinanceUser = await ctx.db
        .query("financeUsers")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .unique();

      if (existingFinanceUser) {
        await ctx.db.patch(existingFinanceUser._id, { updatedAt: now });
      }
    }

    await writeAuditLog(ctx, {
      action: "user.role_changed",
      entityType: "users",
      entityId: args.userId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: nextUniversityId,
      context: {
        previousRole,
        newRole: args.newRole,
        previousUniversityId: previousUniversityId ?? null,
        newUniversityId: nextUniversityId ?? null,
        universityChanged,
        reactivated: !target.isActive,
        email: target.email,
      },
    });

    return args.userId;
  },
});

export const reactivateUser = mutation({
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

    if (target.isActive) {
      return args.userId;
    }

    await ctx.db.patch(args.userId, {
      isActive: true,
      updatedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      action: "user.reactivated",
      entityType: "users",
      entityId: args.userId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId: target.universityId,
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

    if (target._id === session.user._id) {
      throw new Error("You cannot deactivate your own account");
    }

    if (session.user.role !== "super_admin") {
      if (!session.user.universityId || target.universityId !== session.user.universityId) {
        throw new Error("Cross-tenant access denied");
      }
    }

    if (target.role === "super_admin" && session.user.role !== "super_admin") {
      throw new Error("Only super admins can deactivate other super admins");
    }

    if (
      target.role === "university_admin" &&
      target.isActive &&
      target.universityId
    ) {
      const otherAdmins = await ctx.db
        .query("users")
        .withIndex("by_university_role", (q) =>
          q.eq("universityId", target.universityId!).eq("role", "university_admin"),
        )
        .collect();
      const remaining = otherAdmins.filter(
        (u) => u._id !== target._id && u.isActive,
      );
      if (remaining.length === 0) {
        throw new Error(
          "Cannot deactivate: this user is the last active university admin for their tenant. Promote another admin first.",
        );
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
