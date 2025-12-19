/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_questions from "../actions/questions.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as mutations_answers from "../mutations/answers.js";
import type * as mutations_auth from "../mutations/auth.js";
import type * as mutations_games from "../mutations/games.js";
import type * as mutations_questions from "../mutations/questions.js";
import type * as queries_answers from "../queries/answers.js";
import type * as queries_auth from "../queries/auth.js";
import type * as queries_games from "../queries/games.js";
import type * as queries_leaderboard from "../queries/leaderboard.js";
import type * as queries_questions from "../queries/questions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/questions": typeof actions_questions;
  auth: typeof auth;
  http: typeof http;
  "mutations/answers": typeof mutations_answers;
  "mutations/auth": typeof mutations_auth;
  "mutations/games": typeof mutations_games;
  "mutations/questions": typeof mutations_questions;
  "queries/answers": typeof queries_answers;
  "queries/auth": typeof queries_auth;
  "queries/games": typeof queries_games;
  "queries/leaderboard": typeof queries_leaderboard;
  "queries/questions": typeof queries_questions;
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
