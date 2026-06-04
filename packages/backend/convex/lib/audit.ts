import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type AuditActor = {
  actorUserId?: Id<"users">;
  actorRole?:
    | "super_admin"
    | "university_admin"
    | "lecturer"
    | "student"
    | "invigilator"
    | "finance";
  universityId?: Id<"universities">;
};

type AuditInput = AuditActor & {
  action: string;
  entityType: string;
  entityId?: string;
  context?: unknown;
};

export async function writeAuditLog(ctx: MutationCtx, input: AuditInput) {
  await ctx.db.insert("auditLogs", {
    universityId: input.universityId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    context:
      input.context === undefined || input.context === null
        ? undefined
        : JSON.stringify(input.context),
    createdAt: Date.now(),
  });
}
