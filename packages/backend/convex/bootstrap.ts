import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { getScopedUniversityId, requireRole, requireSessionUser } from "./lib/auth";
import { getOrCreatePlatformUniversity, isPlatformUniversity } from "./lib/platform";
import { isSeededExternalId } from "./seed";

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

async function adoptSeededSuperAdminByEmail(
  ctx: MutationCtx,
  params: {
    email: string;
    newExternalId: string;
    fullName?: string;
    emailOverride?: string;
    now: number;
  },
): Promise<Doc<"users"> | null> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const emailMatch = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .unique();

  if (!emailMatch || !isSeededExternalId(emailMatch.externalId) || emailMatch.role !== "super_admin") {
    return null;
  }

  const platform = await getOrCreatePlatformUniversity(ctx);
  const existingUniversity = emailMatch.universityId
    ? await ctx.db.get(emailMatch.universityId)
    : null;
  const needsPlatformLink = !existingUniversity || !isPlatformUniversity(existingUniversity);

  const patch: Partial<Doc<"users">> = {
    externalId: params.newExternalId,
    updatedAt: params.now,
  };
  if (params.fullName) patch.fullName = params.fullName;
  if (params.emailOverride) patch.email = params.emailOverride;
  if (needsPlatformLink) patch.universityId = platform._id;

  await ctx.db.patch(emailMatch._id, patch);

  await writeAuditLog(ctx, {
    action: needsPlatformLink ? "user.seeded.linked_and_platform_assigned" : "user.seeded.linked",
    entityType: "users",
    entityId: emailMatch._id,
    actorUserId: emailMatch._id,
    actorRole: "super_admin",
    universityId: platform._id,
    context: {
      previousExternalId: emailMatch.externalId,
      newExternalId: params.newExternalId,
      platformUniversityId: platform._id,
    },
  });

  return await ctx.db.get(emailMatch._id);
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

    // 1. Try to find existing user by Clerk subject (already linked).
    let existing = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
      .unique();

    // 2. Try to adopt a seeded super_admin by email. This handles the
    //    case where a user was seeded with externalId="seed:<email>"
    //    before they had a Clerk identity.
    if (!existing) {
      existing = await adoptSeededSuperAdminByEmail(ctx, {
        email,
        newExternalId: externalId,
        fullName: identity.name,
        emailOverride: identity.email,
        now,
      });
    }

    // 3. Only resolve by email domain for NEW (non-seeded) users.
    //    Doing this earlier would throw for super_admins whose email
    //    domain (e.g. outlook.com) is not approved for any tenant.
    const isFirstUser = !existing && (await ctx.db.query("users").collect()).length === 0;
    const resolved = existing
      ? null
      : isFirstUser
        ? null
        : await resolveUniversityFromEmail(ctx, email);

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

      const platformForExisting = await getOrCreatePlatformUniversity(ctx);
      const existingUniversity = existing.universityId
        ? await ctx.db.get(existing.universityId)
        : null;
      const superAdminNeedsPlatformLink =
        existing.role === "super_admin" && (!existingUniversity || !isPlatformUniversity(existingUniversity));

      const nextUniversityId: Doc<"users">["universityId"] =
        existing.role === "super_admin"
          ? (superAdminNeedsPlatformLink ? platformForExisting._id : existing.universityId!)
          : (existing.universityId ?? resolved?.university._id);

      if (!nextUniversityId) {
        throw new Error("A university is required to update the user");
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

    const role = isFirstUser ? "super_admin" : (args.preferredRole ?? "student");
    const universityId =
      role === "super_admin"
        ? (await getOrCreatePlatformUniversity(ctx))._id
        : resolved?.university._id;

    if (role !== "super_admin" && !universityId) {
      throw new Error("A university is required for non-super-admin users");
    }

    if (!universityId) {
      throw new Error("A university is required to create the user");
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

    // 1. Try to find existing user by externalId (already linked).
    let existing = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();

    // 2. Try to adopt a seeded super_admin by email.
    if (!existing) {
      existing = await adoptSeededSuperAdminByEmail(ctx, {
        email: args.email,
        newExternalId: args.externalId,
        fullName: args.fullName,
        emailOverride: args.email,
        now,
      });
    }

    // 3. Only resolve by email domain for NEW (non-seeded) users.
    const isFirstUser = !existing && (await ctx.db.query("users").collect()).length === 0;
    const resolved = existing
      ? null
      : isFirstUser
        ? null
        : await resolveUniversityFromEmail(ctx, args.email);

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

      const platformForExisting = await getOrCreatePlatformUniversity(ctx);
      const existingUniversity = existing.universityId
        ? await ctx.db.get(existing.universityId)
        : null;
      const superAdminNeedsPlatformLink =
        existing.role === "super_admin" && (!existingUniversity || !isPlatformUniversity(existingUniversity));

      const nextUniversityId: Doc<"users">["universityId"] =
        existing.role === "super_admin"
          ? (superAdminNeedsPlatformLink ? platformForExisting._id : existing.universityId!)
          : (existing.universityId ?? resolved?.university._id);

      if (!nextUniversityId) {
        throw new Error("A university is required to update the user");
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
    const universityId =
      role === "super_admin"
        ? (await getOrCreatePlatformUniversity(ctx))._id
        : resolved?.university._id;

    if (role !== "super_admin" && !universityId) {
      throw new Error("A university is required for non-super-admin users");
    }

    if (!universityId) {
      throw new Error("A university is required to create the user");
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
    universityPrefix: v.optional(v.string()),
    allowedEmailDomains: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin"]);

    const prefix = args.universityPrefix?.trim();
    if (prefix && !/^[A-Za-z0-9._-]{1,16}$/.test(prefix)) {
      throw new Error(
        "Prefix must be 1-16 characters: letters, digits, dot, underscore, or hyphen",
      );
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
      prefix: prefix || undefined,
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
        prefix: prefix || null,
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
