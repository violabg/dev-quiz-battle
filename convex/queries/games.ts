import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get game by code with host and players
 */
export const getGameByCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!game) {
      return null;
    }

    const host = await ctx.db.get(game.host_id);

    const gamePlayers = await ctx.db
      .query("game_players")
      .withIndex("by_game_id", (q) => q.eq("game_id", game._id))
      .collect();

    const playersWithUsers = await Promise.all(
      gamePlayers.map(async (gp) => {
        const user = await ctx.db.get(gp.player_id);
        return { ...gp, user };
      })
    );

    return {
      ...game,
      host,
      players: playersWithUsers,
    };
  },
});

/**
 * Get game by ID with host and players
 */
export const getGameById = query({
  args: {
    game_id: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);

    if (!game) {
      return null;
    }

    const host = await ctx.db.get(game.host_id);

    const gamePlayers = await ctx.db
      .query("game_players")
      .withIndex("by_game_id", (q) => q.eq("game_id", game._id))
      .collect();

    const playersWithUsers = await Promise.all(
      gamePlayers.map(async (gp) => {
        const user = await ctx.db.get(gp.player_id);
        return { ...gp, user };
      })
    );

    return {
      ...game,
      host,
      players: playersWithUsers,
    };
  },
});

/**
 * Get all players for a game
 */
export const getGamePlayers = query({
  args: {
    game_id: v.id("games"),
  },
  handler: async (ctx, args) => {
    const gamePlayers = await ctx.db
      .query("game_players")
      .withIndex("by_game_id", (q) => q.eq("game_id", args.game_id))
      .collect();

    const playersWithUsers = await Promise.all(
      gamePlayers.map(async (gp) => {
        const user = await ctx.db.get(gp.player_id);
        return { ...gp, user };
      })
    );

    return playersWithUsers;
  },
});
