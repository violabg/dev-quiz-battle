import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get the current authenticated user
 */
export const currentUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    return user;
  },
});

/**
 * Get current user's profile (now from users table)
 */
export const getCurrentUserProfile = query({
  args: {},
  returns: v.nullable(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      user_id: v.string(), // Same as _id for compatibility
      username: v.string(),
      email: v.string(),
      avatar_url: v.optional(v.string()), // Maps to image field
      total_score: v.number(),
      games_played: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      user_id: user._id, // For compatibility with existing code
      username:
        user.username ?? user.name ?? user.email?.split("@")[0] ?? "User",
      email: user.email ?? "",
      avatar_url: user.image,
      total_score: user.total_score ?? 0,
      games_played: user.games_played ?? 0,
    };
  },
});
