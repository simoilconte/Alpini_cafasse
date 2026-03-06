/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appSettings from "../appSettings.js";
import type * as auth from "../auth.js";
import type * as bagDeliveries from "../bagDeliveries.js";
import type * as beneficiaryFamilies from "../beneficiaryFamilies.js";
import type * as checkDatabase from "../checkDatabase.js";
import type * as crons from "../crons.js";
import type * as equipment from "../equipment.js";
import type * as equipmentStatuses from "../equipmentStatuses.js";
import type * as eventParticipants from "../eventParticipants.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as lib_associationYear from "../lib/associationYear.js";
import type * as lib_auth from "../lib/auth.js";
import type * as memberStatuses from "../memberStatuses.js";
import type * as members from "../members.js";
import type * as memberships from "../memberships.js";
import type * as migrations from "../migrations.js";
import type * as migrationsProduction from "../migrationsProduction.js";
import type * as movementStatuses from "../movementStatuses.js";
import type * as movements from "../movements.js";
import type * as paymentStatuses from "../paymentStatuses.js";
import type * as payments from "../payments.js";
import type * as profiles from "../profiles.js";
import type * as roles from "../roles.js";
import type * as setupAdmin from "../setupAdmin.js";
import type * as users from "../users.js";
import type * as warehouseLocations from "../warehouseLocations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appSettings: typeof appSettings;
  auth: typeof auth;
  bagDeliveries: typeof bagDeliveries;
  beneficiaryFamilies: typeof beneficiaryFamilies;
  checkDatabase: typeof checkDatabase;
  crons: typeof crons;
  equipment: typeof equipment;
  equipmentStatuses: typeof equipmentStatuses;
  eventParticipants: typeof eventParticipants;
  events: typeof events;
  http: typeof http;
  "lib/associationYear": typeof lib_associationYear;
  "lib/auth": typeof lib_auth;
  memberStatuses: typeof memberStatuses;
  members: typeof members;
  memberships: typeof memberships;
  migrations: typeof migrations;
  migrationsProduction: typeof migrationsProduction;
  movementStatuses: typeof movementStatuses;
  movements: typeof movements;
  paymentStatuses: typeof paymentStatuses;
  payments: typeof payments;
  profiles: typeof profiles;
  roles: typeof roles;
  setupAdmin: typeof setupAdmin;
  users: typeof users;
  warehouseLocations: typeof warehouseLocations;
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
