import GitHub from "@auth/core/providers/github";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub, Password],
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
