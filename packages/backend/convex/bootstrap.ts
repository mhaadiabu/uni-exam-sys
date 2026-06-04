import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { getScopedUniversityId, requireRole, requireSessionUser } from "./lib/auth";

function normalizeEmailDomain(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

function getEmailDomain(email: string) {
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2 || !parts[1]) {
    throw new Error("Your account email is invalid for university matching");
  }

  return parts[1];
}

function universityAcceptsDomain(university: { allowedEmailDomains: string[] }, emailDomain: string) {
  return university.allowedEmailDomains.some((domain) => normalizeEmailDomain(domain) === emailDomain);
}

type UniversityMatch = {
  university: Doc<"universities">;
  emailDomain: string;
};

async function attachUserToRoleProfile(
  ctx: MutationCtx,
  userId: Doc<"users">["_id"],
  role: Doc<"users">["role"],
  universityId: Doc<"users">["universityId"],
  email: string,
) {
  if (!universityId || role === "super_admin" || role === "university_admin") {
    return;
  }

  if (role === "student") {
    const existingStudent = (await ctx.db
      .query("students")
      .withIndex("by_university", (q) => q.eq("universityId", universityId))
      .collect())
      .find((student) => !student.userId && student.email?.toLowerCase() === email.toLowerCase());

    if (existingStudent) {
      await ctx.db.patch(existingStudent._id, {
        userId,
        updatedAt: Date.now(),
      });
    }
    return;
  }

  if (role === "invigilator") {
    const existingInvigilator = (await ctx.db
      .query("invigilators")
      .withIndex("by_university", (q) => q.eq("universityId", universityId))
      .collect())
      .find((invigilator) => !invigilator.userId && invigilator.email?.toLowerCase() === email.toLowerCase());

    if (existingInvigilator) {
      await ctx.db.patch(existingInvigilator._id, {
        userId,
        updatedAt: Date.now(),
      });
    }
    return;
  }

  if (role === "finance") {
    const existingFinance = (await ctx.db
      .query("financeUsers")
      .withIndex("by_university", (q) => q.eq("universityId", universityId))
      .collect())
      .find((financeUser) => financeUser.userId === userId || financeUser.email.toLowerCase() === email.toLowerCase());

    if (existingFinance && existingFinance.userId !== userId) {
      await ctx.db.patch(existingFinance._id, {
        userId,
        updatedAt: Date.now(),
      });
    }
    return;
  }

  if (role === "lecturer") {
    const existingLecturer = (await ctx.db
      .query("lecturers")
      .withIndex("by_university", (q) => q.eq("universityId", universityId))
      .collect())
      .find((lecturer) => !lecturer.userId && lecturer.email?.toLowerCase() === email.toLowerCase());

    if (existingLecturer) {
      await ctx.db.patch(existingLecturer._id, {
        userId,
        updatedAt: Date.now(),
      });
    }
  }
}

async function resolveUniversityFromEmail(
  ctx: QueryCtx | MutationCtx,
  email: string,
): Promise<UniversityMatch> {
  const emailDomain = getEmailDomain(email);
  const universities = await ctx.db
    .query("universities")
    .withIndex("by_active", (q) => q.eq("isActive", true))
    .collect();

  const matches: Doc<"universities">[] = universities.filter((university) =>
    universityAcceptsDomain(university, emailDomain),
  );

  if (matches.length === 1) {
    return { university: matches[0], emailDomain };
  }

  if (matches.length > 1) {
    throw new Error("Your email domain matches multiple universities. Contact support.");
  }

  throw new Error("Your email domain is not approved for any university in this system.");
}

const roleValidator = v.union(
  v.literal("super_admin"),
  v.literal("university_admin"),
  v.literal("lecturer"),
  v.literal("student"),
  v.literal("invigilator"),
  v.literal("finance"),
);

export const syncCurrentUser = mutation({
  args: {
    preferredRole: v.optional(roleValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const externalId = identity.subject ?? identity.tokenIdentifier;
    const email = identity.email ?? `${externalId}@unknown.local`;
    const now = Date.now();
    const allUsers = await ctx.db.query("users").collect();
    const isFirstUser = allUsers.length === 0;
    const resolved = isFirstUser ? null : await resolveUniversityFromEmail(ctx, email);

    const existing = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
      .unique();

    if (existing) {
      if (existing.role !== "super_admin") {
        if (!existing.universityId) {
          throw new Error("Your account has no assigned university. Contact support.");
        }

        const assignedUniversity = await ctx.db.get(existing.universityId);
        if (!assignedUniversity || !assignedUniversity.isActive) {
          throw new Error("Your university is not active. Contact support.");
        }

        const emailDomain = getEmailDomain(email);
        if (!universityAcceptsDomain(assignedUniversity, emailDomain)) {
          throw new Error("Your email domain does not match your assigned university.");
        }
      }

      const nextUniversityId: Doc<"users">["universityId"] =
        existing.role === "super_admin"
          ? existing.universityId
          : (existing.universityId ?? resolved?.university._id);

      if (existing.role !== "super_admin" && !nextUniversityId) {
        throw new Error("A university is required for non-super-admin users");
      }

      await ctx.db.patch(existing._id, {
        fullName: identity.name ?? existing.fullName,
        email: identity.email ?? existing.email,
        universityId: nextUniversityId,
        updatedAt: now,
      });

      await attachUserToRoleProfile(ctx, existing._id, existing.role, nextUniversityId, email);

      return {
        userId: existing._id,
        role: existing.role,
        universityId: nextUniversityId,
        matchedEmailDomain: resolved?.emailDomain,
      };
    }

    const role = allUsers.length === 0 ? "super_admin" : (args.preferredRole ?? "student");
    const universityId = role === "super_admin" ? undefined : resolved?.university._id;

    if (role !== "super_admin" && !universityId) {
      throw new Error("A university is required for non-super-admin users");
    }

    const userId = await ctx.db.insert("users", {
      externalId,
      universityId,
      role,
      fullName: identity.name ?? "Unnamed User",
      email,
      phone: undefined,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      createdAt: now,
      updatedAt: now,
    });

    await attachUserToRoleProfile(ctx, userId, role, universityId, email);

    await writeAuditLog(ctx, {
      action: "user.synced",
      entityType: "users",
      entityId: userId,
      actorUserId: userId,
      actorRole: role,
      universityId,
      context: { externalId, matchedEmailDomain: resolved?.emailDomain },
    });

    return {
      userId,
      role,
      universityId,
      matchedEmailDomain: resolved?.emailDomain,
    };
  },
});

export const syncUserFromWebhook = internalMutation({
  args: {
    externalId: v.string(),
    email: v.string(),
    fullName: v.string(),
    preferredRole: v.optional(roleValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const allUsers = await ctx.db.query("users").collect();
    const isFirstUser = allUsers.length === 0;
    const resolved = isFirstUser ? null : await resolveUniversityFromEmail(ctx, args.email);

    const existing = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (existing) {
      if (existing.role !== "super_admin") {
        if (!existing.universityId) {
          throw new Error("Your account has no assigned university. Contact support.");
        }

        const assignedUniversity = await ctx.db.get(existing.universityId);
        if (!assignedUniversity || !assignedUniversity.isActive) {
          throw new Error("Your university is not active. Contact support.");
        }

        const emailDomain = getEmailDomain(args.email);
        if (!universityAcceptsDomain(assignedUniversity, emailDomain)) {
          throw new Error("Your email domain does not match your assigned university.");
        }
      }

      const nextUniversityId: Doc<"users">["universityId"] =
        existing.role === "super_admin"
          ? existing.universityId
          : (existing.universityId ?? resolved?.university._id);

      if (existing.role !== "super_admin" && !nextUniversityId) {
        throw new Error("A university is required for non-super-admin users");
      }

      await ctx.db.patch(existing._id, {
        fullName: args.fullName || existing.fullName,
        email: args.email || existing.email,
        universityId: nextUniversityId,
        updatedAt: now,
      });

      await attachUserToRoleProfile(ctx, existing._id, existing.role, nextUniversityId, args.email);

      return {
        userId: existing._id,
        role: existing.role,
        universityId: nextUniversityId,
        matchedEmailDomain: resolved?.emailDomain,
        created: false,
      };
    }

    const role = isFirstUser ? "super_admin" : (args.preferredRole ?? "student");
    const universityId = role === "super_admin" ? undefined : resolved?.university._id;

    if (role !== "super_admin" && !universityId) {
      throw new Error("A university is required for non-super-admin users");
    }

    const userId = await ctx.db.insert("users", {
      externalId: args.externalId,
      universityId,
      role,
      fullName: args.fullName || "Unnamed User",
      email: args.email,
      phone: undefined,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      createdAt: now,
      updatedAt: now,
    });

    await attachUserToRoleProfile(ctx, userId, role, universityId, args.email);

    await writeAuditLog(ctx, {
      action: "user.synced",
      entityType: "users",
      entityId: userId,
      actorUserId: userId,
      actorRole: role,
      universityId,
      context: { externalId: args.externalId, matchedEmailDomain: resolved?.emailDomain },
    });

    return {
      userId,
      role,
      universityId,
      matchedEmailDomain: resolved?.emailDomain,
      created: true,
    };
  },
});

export const listOnboardingUniversities = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return {
        matchedUniversity: null,
        emailDomain: null,
        error: "No verified email address was found for your account.",
      };
    }

    try {
      const resolved = await resolveUniversityFromEmail(ctx, identity.email);
      return {
        matchedUniversity: resolved.university,
        emailDomain: resolved.emailDomain,
        error: null,
      };
    } catch (error) {
      return {
        matchedUniversity: null,
        emailDomain: getEmailDomain(identity.email),
        error: error instanceof Error ? error.message : "University matching failed.",
      };
    }
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const externalId = identity.subject ?? identity.tokenIdentifier;
    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
      .unique();

    if (!user) {
      return null;
    }

    const university = user.universityId ? await ctx.db.get(user.universityId) : null;

    return {
      ...user,
      university,
    };
  },
});

export const createUniversity = mutation({
  args: {
    universityName: v.string(),
    universityCode: v.string(),
    allowedEmailDomains: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin"]);

    const existing = await ctx.db
      .query("universities")
      .withIndex("by_code", (q) => q.eq("code", args.universityCode))
      .unique();

    if (existing) {
      throw new Error("University code already exists");
    }

    const now = Date.now();
    const allowedEmailDomains = Array.from(
      new Set(args.allowedEmailDomains.map((domain) => normalizeEmailDomain(domain)).filter(Boolean)),
    );

    if (allowedEmailDomains.length === 0) {
      throw new Error("At least one allowed email domain is required");
    }

    const universityId = await ctx.db.insert("universities", {
      name: args.universityName,
      code: args.universityCode,
      allowedEmailDomains,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("brandingSettings", {
      universityId,
      logoUrl: undefined,
      primaryColor: "#0b4fd8",
      secondaryColor: "#0f172a",
      idCardTemplate: "standard-v1",
      attendanceReportTemplate: "standard-v1",
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "university.created",
      entityType: "universities",
      entityId: universityId,
      actorUserId: session.user._id,
      actorRole: session.user.role,
      universityId,
      context: {
        allowedEmailDomains,
        createdBy: session.identity.externalId,
      },
    });

    return {
      universityId,
    };
  },
});

export const scopedUniversity = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);
    return await ctx.db.get(scoped);
  },
});
