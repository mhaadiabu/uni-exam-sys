import type { FunctionReturnType } from "convex/server";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";

export type Role =
  | "super_admin"
  | "university_admin"
  | "lecturer"
  | "student"
  | "invigilator"
  | "finance";

export const ASSIGNABLE_ROLES: Role[] = [
  "university_admin",
  "lecturer",
  "invigilator",
  "finance",
  "student",
];

// Roles that can be assigned when creating a new user from the picker.
// Student accounts are managed via the Students tab, which also creates
// the linked `students` row, so we exclude that role here.
export const CREATABLE_ROLES: Role[] = [
  "university_admin",
  "lecturer",
  "invigilator",
  "finance",
];

export type ClerkUser = FunctionReturnType<
  typeof api.clerkUsers.listClerkUsers
>["users"][number];

export type PickerUniversity = {
  _id: string;
  name: string;
  code?: string;
};

export type UserStatus = "available" | "self" | "same" | "other" | "inactive";

export function describeStatus(
  clerkUser: ClerkUser,
  me: { _id: string; role: Role; universityId?: string },
  currentUniversityId: string | undefined,
): UserStatus {
  if (clerkUser.existingUser === null) {
    return "available";
  }
  if (clerkUser.existingUser._id === me._id) {
    return "self";
  }
  if (!clerkUser.existingUser.isActive) {
    return "inactive";
  }
  if (clerkUser.existingUser.isPlatformUniversity) {
    return "other";
  }
  if (
    currentUniversityId !== undefined &&
    clerkUser.existingUser.universityId === currentUniversityId
  ) {
    return "same";
  }
  return "other";
}

export function statusBadgeLabel(
  status: UserStatus,
  clerkUser: ClerkUser,
): string {
  switch (status) {
    case "available":
      return "Available";
    case "self":
      return "You";
    case "same":
      return clerkUser.existingUser
        ? `In this university • ${clerkUser.existingUser.role.replace(/_/g, " ")}`
        : "In this university";
    case "other":
      return clerkUser.existingUser
        ? `In ${clerkUser.existingUser.universityName ?? "another university"} • ${clerkUser.existingUser.role.replace(/_/g, " ")}`
        : "In another university";
    case "inactive":
      return clerkUser.existingUser
        ? `Inactive • ${clerkUser.existingUser.role.replace(/_/g, " ")}`
        : "Inactive";
  }
}

export function canActOn(
  status: UserStatus,
  me: { role: Role },
): boolean {
  if (status === "self") return false;
  if (status === "other" && me.role !== "super_admin") return false;
  return true;
}

export function actionLabel(
  status: UserStatus,
  me: { role: Role },
): string | null {
  if (status === "self") return null;
  if (status === "other" && me.role !== "super_admin") return null;
  if (status === "available") return "Add as user";
  if (status === "inactive") return "Reactivate / change role";
  return "Change role";
}
