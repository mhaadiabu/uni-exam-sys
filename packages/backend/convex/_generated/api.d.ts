/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as academics from "../academics.js";
import type * as announcements from "../announcements.js";
import type * as assignments from "../assignments.js";
import type * as attendance from "../attendance.js";
import type * as bootstrap from "../bootstrap.js";
import type * as clerkUsers from "../clerkUsers.js";
import type * as communications from "../communications.js";
import type * as courseRegistrations from "../courseRegistrations.js";
import type * as dashboard from "../dashboard.js";
import type * as finance from "../finance.js";
import type * as healthCheck from "../healthCheck.js";
import type * as idCards from "../idCards.js";
import type * as lecturerEvaluations from "../lecturerEvaluations.js";
import type * as lecturers from "../lecturers.js";
import type * as lib_attendance from "../lib/attendance.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_csv from "../lib/csv.js";
import type * as lib_penalties from "../lib/penalties.js";
import type * as lib_platform from "../lib/platform.js";
import type * as lib_seating from "../lib/seating.js";
import type * as lib_time from "../lib/time.js";
import type * as privateData from "../privateData.js";
import type * as reports from "../reports.js";
import type * as rooms from "../rooms.js";
import type * as schedules from "../schedules.js";
import type * as seating from "../seating.js";
import type * as seed from "../seed.js";
import type * as students from "../students.js";
import type * as tenants from "../tenants.js";
import type * as users from "../users.js";
import type * as verification from "../verification.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  academics: typeof academics;
  announcements: typeof announcements;
  assignments: typeof assignments;
  attendance: typeof attendance;
  bootstrap: typeof bootstrap;
  clerkUsers: typeof clerkUsers;
  communications: typeof communications;
  courseRegistrations: typeof courseRegistrations;
  dashboard: typeof dashboard;
  finance: typeof finance;
  healthCheck: typeof healthCheck;
  idCards: typeof idCards;
  lecturerEvaluations: typeof lecturerEvaluations;
  lecturers: typeof lecturers;
  "lib/attendance": typeof lib_attendance;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/csv": typeof lib_csv;
  "lib/penalties": typeof lib_penalties;
  "lib/platform": typeof lib_platform;
  "lib/seating": typeof lib_seating;
  "lib/time": typeof lib_time;
  privateData: typeof privateData;
  reports: typeof reports;
  rooms: typeof rooms;
  schedules: typeof schedules;
  seating: typeof seating;
  seed: typeof seed;
  students: typeof students;
  tenants: typeof tenants;
  users: typeof users;
  verification: typeof verification;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
