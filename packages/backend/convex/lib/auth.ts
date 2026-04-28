import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type AppRole = Doc<"users">["role"];

type ReaderCtx = Pick<QueryCtx, "auth" | "db"> | Pick<MutationCtx, "auth" | "db">;

export type SessionUser = {
  identity: {
    externalId: string;
    name?: string;
    email?: string;
  };
  user: Doc<"users">;
};

export async function getSessionUser(ctx: ReaderCtx): Promise<SessionUser | null> {
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

  return {
    identity: {
      externalId,
      name: identity.name,
      email: identity.email,
    },
    user,
  };
}

export async function requireSessionUser(ctx: ReaderCtx): Promise<SessionUser> {
  const session = await getSessionUser(ctx);
  if (!session) {
    throw new Error("Authentication required");
  }
  return session;
}

export function requireRole(user: Doc<"users">, roles: readonly AppRole[]) {
  if (!roles.includes(user.role)) {
    throw new Error("You do not have permission to perform this action");
  }
}

export function requireUniversityScope(user: Doc<"users">, universityId: Id<"universities">) {
  if (user.role === "super_admin") {
    return;
  }

  if (!user.universityId || user.universityId !== universityId) {
    throw new Error("Cross-tenant access denied");
  }
}

export function getScopedUniversityId(
  user: Doc<"users">,
  requestedUniversityId?: Id<"universities">,
): Id<"universities"> {
  if (user.role === "super_admin") {
    if (!requestedUniversityId) {
      throw new Error("A university must be selected for this action");
    }

    return requestedUniversityId;
  }

  if (!user.universityId) {
    throw new Error("User has no assigned university");
  }

  if (requestedUniversityId && requestedUniversityId !== user.universityId) {
    throw new Error("Cross-tenant access denied");
  }

  return user.universityId;
}

export function getOptionalScopedUniversityId(
  user: Doc<"users">,
  requestedUniversityId?: Id<"universities">,
): Id<"universities"> | undefined {
  if (user.role === "super_admin") {
    return requestedUniversityId;
  }

  if (!user.universityId) {
    throw new Error("User has no assigned university");
  }

  if (requestedUniversityId && requestedUniversityId !== user.universityId) {
    throw new Error("Cross-tenant access denied");
  }

  return user.universityId;
}

export function getCurrentYearWindow(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  if (month >= 9) {
    return `${year}/${year + 1}`;
  }
  return `${year - 1}/${year}`;
}
