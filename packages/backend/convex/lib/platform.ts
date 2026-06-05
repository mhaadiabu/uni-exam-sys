import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const PLATFORM_UNIVERSITY_CODE = "PLATFORM";
export const PLATFORM_UNIVERSITY_NAME = "Platform Administration";

export function isPlatformUniversity(university: Pick<Doc<"universities">, "isPlatform" | "code">) {
  return university.isPlatform === true || university.code === PLATFORM_UNIVERSITY_CODE;
}

export async function getPlatformUniversity(ctx: MutationCtx): Promise<Doc<"universities"> | null> {
  const byFlag = await ctx.db
    .query("universities")
    .withIndex("by_platform", (q) => q.eq("isPlatform", true))
    .unique();
  if (byFlag) {
    return byFlag;
  }

  const byCode = await ctx.db
    .query("universities")
    .withIndex("by_code", (q) => q.eq("code", PLATFORM_UNIVERSITY_CODE))
    .unique();
  if (byCode) {
    await ctx.db.patch(byCode._id, { isPlatform: true, updatedAt: Date.now() });
    return byCode;
  }

  return null;
}

export async function getOrCreatePlatformUniversity(ctx: MutationCtx): Promise<Doc<"universities">> {
  const existing = await getPlatformUniversity(ctx);
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const platformId: Id<"universities"> = await ctx.db.insert("universities", {
    name: PLATFORM_UNIVERSITY_NAME,
    code: PLATFORM_UNIVERSITY_CODE,
    allowedEmailDomains: [],
    isActive: true,
    isPlatform: true,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.insert("brandingSettings", {
    universityId: platformId,
    primaryColor: "#0f172a",
    secondaryColor: "#0b4fd8",
    idCardTemplate: "platform-v1",
    attendanceReportTemplate: "platform-v1",
    updatedAt: now,
  });

  const created = await ctx.db.get(platformId);
  if (!created) {
    throw new Error("Failed to create the Platform university");
  }
  return created;
}
