import GitHub from "@auth/core/providers/github";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub, Password],
});

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
 * Initialize user profile fields for the authenticated user.
 * Called during signup to set username, total_score, and games_played.
 * Now updates the users table directly instead of creating a separate profile.
 */
export const initializeUserProfile = mutation({
  args: {
    username: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Initialize user profile fields if not already set
    await ctx.db.patch(userId, {
      username: args.username,
      total_score: user.total_score ?? 0,
      games_played: user.games_played ?? 0,
    });

    return userId;
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
