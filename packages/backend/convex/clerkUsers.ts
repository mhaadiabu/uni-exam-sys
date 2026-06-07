import { createClerkClient } from "@clerk/backend";
import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { requireRole, requireSessionUser } from "./lib/auth";
import { internal } from "./_generated/api";

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "CLERK_SECRET_KEY is not configured. Add it to packages/backend/.env.local.",
    );
  }
  return createClerkClient({ secretKey });
}

const assertCanListClerkUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const session = await requireSessionUser(ctx);
    requireRole(session.user, ["super_admin", "university_admin"]);
    return { userId: session.user._id, role: session.user.role };
  },
});

const lookupUsersByExternalIds = internalQuery({
  args: { externalIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    if (args.externalIds.length === 0) {
      return [];
    }

    const results = await Promise.all(
      args.externalIds.map((externalId) =>
        ctx.db
          .query("users")
          .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
          .unique(),
      ),
    );

    return results.filter((u): u is NonNullable<typeof u> => u !== null);
  },
});

const lookupUniversityNames = internalQuery({
  args: { universityIds: v.array(v.id("universities")) },
  handler: async (ctx, args) => {
    if (args.universityIds.length === 0) {
      return [];
    }

    const unique = Array.from(new Set(args.universityIds));
    const rows = await Promise.all(unique.map((id) => ctx.db.get(id)));
    return rows
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => ({ _id: u._id, name: u.name, code: u.code, isPlatform: u.isPlatform }));
  },
});

export { assertCanListClerkUsers, lookupUsersByExternalIds, lookupUniversityNames };

export const listClerkUsers = action({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.clerkUsers.assertCanListClerkUsers, {});

    const clerk = getClerkClient();
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const offset = Math.max(args.offset ?? 0, 0);

    const params: {
      limit: number;
      offset: number;
      query?: string;
    } = { limit, offset };
    if (args.query && args.query.trim().length > 0) {
      params.query = args.query.trim();
    }

    const response = await clerk.users.getUserList(params);
    const externalIds = response.data.map((u) => u.id);

    const existingUsers =
      externalIds.length > 0
        ? await ctx.runQuery(internal.clerkUsers.lookupUsersByExternalIds, {
            externalIds,
          })
        : [];

    const referencedUniversityIds = Array.from(
      new Set(
        existingUsers
          .map((u) => u.universityId)
          .filter((id): id is NonNullable<typeof id> => Boolean(id)),
      ),
    );

    const universitySummaries =
      referencedUniversityIds.length > 0
        ? await ctx.runQuery(internal.clerkUsers.lookupUniversityNames, {
            universityIds: referencedUniversityIds,
          })
        : [];

    const universityNameById = new Map(
      universitySummaries.map((u) => [
        u._id,
        { name: u.name, code: u.code, isPlatform: u.isPlatform },
      ]),
    );

    const result: {
      totalCount: number;
      users: Array<{
        id: string;
        firstName: string | null;
        lastName: string | null;
        fullName: string;
        email: string | null;
        phone: string | null;
        username: string | null;
        imageUrl: string;
        existingUser: {
          _id: string;
          role: string;
          fullName: string;
          email: string;
          isActive: boolean;
          universityId: string;
          universityName: string | null;
          universityCode: string | null | undefined;
          isPlatformUniversity: boolean;
        } | null;
      }>;
    } = {
      totalCount: response.totalCount,
      users: response.data.map((u) => {
        const existing = existingUsers.find((eu) => eu.externalId === u.id);
        const existingUniversity = existing?.universityId
          ? universityNameById.get(existing.universityId)
          : undefined;
        return {
          id: u.id,
          firstName: u.firstName ?? null,
          lastName: u.lastName ?? null,
          fullName:
            [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
            u.username ||
            u.id,
          email: u.primaryEmailAddress?.emailAddress ?? null,
          phone: u.primaryPhoneNumber?.phoneNumber ?? null,
          username: u.username ?? null,
          imageUrl: u.imageUrl,
          existingUser: existing
            ? {
                _id: existing._id,
                role: existing.role,
                fullName: existing.fullName,
                email: existing.email,
                isActive: existing.isActive,
                universityId: existing.universityId,
                universityName: existingUniversity?.name ?? null,
                universityCode: existingUniversity?.code ?? null,
                isPlatformUniversity: existingUniversity?.isPlatform ?? false,
              }
            : null,
        };
      }),
    };
    return result;
  },
});
