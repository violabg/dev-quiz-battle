import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get paginated leaderboard with optional language filter
 */
export const getLeaderboardPlayers = query({
  args: {
    offset: v.number(),
    limit: v.number(),
    languageFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.languageFilter) {
      // Query player_language_scores for specific language
      const languageScores = await ctx.db
        .query("player_language_scores")
        .withIndex("by_language", (q) => q.eq("language", args.languageFilter!))
        .collect();

      // Sort by total_score descending
      const sorted = languageScores.sort(
        (a, b) => b.total_score - a.total_score
      );

      // Paginate
      const paginated = sorted.slice(args.offset, args.offset + args.limit);

      // Join with users
      const withUsers = await Promise.all(
        paginated.map(async (score) => {
          const user = await ctx.db.get(score.player_id);
          return {
            player_id: score.player_id,
            total_score: score.total_score,
            language: score.language,
            user,
          };
        })
      );

      return {
        players: withUsers,
        totalItems: sorted.length,
      };
    } else {
      // Aggregate from game_players (overall leaderboard)
      const allGamePlayers = await ctx.db.query("game_players").collect();

      // Group by player_id and sum scores
      const scoresByPlayer = new Map<string, number>();

      for (const gp of allGamePlayers) {
        const playerId = gp.player_id;
        const currentScore = scoresByPlayer.get(playerId) || 0;
        scoresByPlayer.set(playerId, currentScore + gp.score);
      }

      // Convert to array and sort
      const scoreArray = Array.from(scoresByPlayer.entries()).map(
        ([player_id, total_score]) => ({
          player_id,
          total_score,
        })
      );

      const sorted = scoreArray.sort((a, b) => b.total_score - a.total_score);

      // Paginate
      const paginated = sorted.slice(args.offset, args.offset + args.limit);

      // Join with users
      const withUsers = await Promise.all(
        paginated.map(async (score) => {
          const user = await ctx.db.get(score.player_id as any);
          return {
            player_id: score.player_id,
            total_score: score.total_score,
            user,
          };
        })
      );

      return {
        players: withUsers,
        totalItems: sorted.length,
      };
    }
  },
});

/**
 * Get user profile with aggregated total score
 */
export const getUserProfileWithScore = query({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);

    if (!user) {
      return null;
    }

    // Sum all game_players scores for this user
    const gamePlayers = await ctx.db
      .query("game_players")
      .withIndex("by_player_id", (q) => q.eq("player_id", args.user_id))
      .collect();

    const totalScore = gamePlayers.reduce((sum, gp) => sum + gp.score, 0);

    return {
      user,
      totalScore,
    };
  },
});

/**
 * Get user's language-specific scores
 */
export const getUserLanguageScores = query({
  args: {
    user_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);

    if (!user) {
      return null;
    }

    // Get all language scores for this user
    const languageScores = await ctx.db
      .query("player_language_scores")
      .withIndex("by_player_language", (q) => q.eq("player_id", args.user_id))
      .collect();

    // Sort by total_score descending
    const sorted = languageScores.sort((a, b) => b.total_score - a.total_score);

    return {
      user,
      languageScores: sorted,
    };
  },
});
