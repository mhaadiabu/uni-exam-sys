import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

import { writeAuditLog } from "./lib/audit";
import { getOrCreatePlatformUniversity, isPlatformUniversity } from "./lib/platform";

const SEED_EXTERNAL_ID_PREFIX = "seed:";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function buildPlaceholderExternalId(email: string) {
  return `${SEED_EXTERNAL_ID_PREFIX}${email}`;
}

export const isSeededExternalId = (externalId: string) =>
  externalId.startsWith(SEED_EXTERNAL_ID_PREFIX);

export const seedSuperAdmin = internalMutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const firstName = args.firstName.trim();
    const lastName = args.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();

    if (!email || !fullName) {
      throw new Error("email, firstName, and lastName are required");
    }

    const platform = await getOrCreatePlatformUniversity(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      if (existing.role !== "super_admin") {
        throw new Error(
          `A user with email ${email} already exists with role ${existing.role}. Remove them first or use a different email.`,
        );
      }

      const existingUniversity = existing.universityId
        ? await ctx.db.get(existing.universityId)
        : null;
      const needsPlatformLink = !existingUniversity || !isPlatformUniversity(existingUniversity);

      if (needsPlatformLink) {
        await ctx.db.patch(existing._id, {
          universityId: platform._id,
          updatedAt: now,
        });

        await writeAuditLog(ctx, {
          action: "user.seeded.platform_linked",
          entityType: "users",
          entityId: existing._id,
          actorRole: "super_admin",
          universityId: platform._id,
          context: { email, platformUniversityId: platform._id },
        });
      }

      const refreshed = await ctx.db.get(existing._id);
      if (!refreshed) {
        throw new Error("Failed to refresh super admin after platform linking");
      }

      return {
        userId: refreshed._id,
        role: refreshed.role,
        universityId: refreshed.universityId,
        externalId: refreshed.externalId,
        created: false,
      };
    }

    const externalId = (args.externalId ?? buildPlaceholderExternalId(email)).trim();

    const userId = await ctx.db.insert("users", {
      externalId,
      universityId: platform._id,
      role: "super_admin",
      fullName,
      email,
      phone: undefined,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(ctx, {
      action: "user.seeded",
      entityType: "users",
      entityId: userId,
      actorRole: "super_admin",
      universityId: platform._id,
      context: { email, fullName, externalId, source: "seed", platformUniversityId: platform._id },
    });

    return {
      userId,
      role: "super_admin" as const,
      universityId: platform._id,
      externalId,
      created: true,
    };
  },
});
