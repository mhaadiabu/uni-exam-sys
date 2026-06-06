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

export { assertCanListClerkUsers };

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

    return {
      totalCount: response.totalCount,
      users: response.data.map((u) => ({
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
        imageUrl: u.imageUrl ?? null,
      })),
    };
  },
});
