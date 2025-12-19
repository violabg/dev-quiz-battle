import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, MutationCtx, query } from "./_generated/server";

/**
 * Generate a unique 6-character game code
 */
const generateUniqueCode = async (ctx: MutationCtx): Promise<string> => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");

    const existing = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!existing) {
      return code;
    }

    attempts++;
  } while (attempts < maxAttempts);

  throw new ConvexError("Failed to generate unique game code");
};

/**
 * Create a new game
 */
export const createGame = mutation({
  args: {
    max_players: v.optional(v.number()),
    time_limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const code = await generateUniqueCode(ctx);
    const now = Date.now();

    const gameId = await ctx.db.insert("games", {
      code,
      host_id: userId,
      status: "waiting",
      max_players: args.max_players ?? 8,
      current_turn: 0,
      time_limit: args.time_limit ?? 120,
      created_at: now,
      updated_at: now,
    });

    // Auto-join the host as the first player
    await ctx.db.insert("game_players", {
      game_id: gameId,
      player_id: userId,
      score: 0,
      turn_order: 0,
      is_active: true,
      joined_at: now,
    });

    return { gameId, code };
  },
});

/**
 * Update game fields
 */
export const updateGame = mutation({
  args: {
    game_id: v.id("games"),
    status: v.optional(
      v.union(v.literal("waiting"), v.literal("active"), v.literal("completed"))
    ),
    current_turn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const game = await ctx.db.get(args.game_id);
    if (!game) {
      throw new ConvexError("Game not found");
    }

    const updates: Partial<{
      updated_at: number;
      status: "waiting" | "active" | "completed";
      current_turn: number;
    }> = {
      updated_at: Date.now(),
    };

    if (args.status !== undefined) {
      updates.status = args.status;
    }

    if (args.current_turn !== undefined) {
      updates.current_turn = args.current_turn;
    }

    await ctx.db.patch(args.game_id, updates);
  },
});

/**
 * Delete a game (host only)
 */
export const deleteGame = mutation({
  args: {
    game_id: v.id("games"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const game = await ctx.db.get(args.game_id);
    if (!game) {
      throw new ConvexError("Game not found");
    }

    if (game.host_id !== userId) {
      throw new ConvexError("Only the host can delete the game");
    }

    await ctx.db.delete(args.game_id);
  },
});

/**
 * Join a game by code
 */
export const joinGame = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!game) {
      throw new ConvexError("Game not found");
    }

    if (game.status !== "waiting") {
      throw new ConvexError("Game has already started");
    }

    // Check if player already joined
    const existingPlayer = await ctx.db
      .query("game_players")
      .withIndex("by_game_player", (q) =>
        q.eq("game_id", game._id).eq("player_id", userId)
      )
      .first();

    if (existingPlayer) {
      return existingPlayer._id;
    }

    // Count current players
    const currentPlayers = await ctx.db
      .query("game_players")
      .withIndex("by_game_id", (q) => q.eq("game_id", game._id))
      .collect();

    if (currentPlayers.length >= game.max_players) {
      throw new ConvexError("Game is full");
    }

    // Determine turn order
    const turnOrder = currentPlayers.length;

    const gamePlayerId = await ctx.db.insert("game_players", {
      game_id: game._id,
      player_id: userId,
      score: 0,
      turn_order: turnOrder,
      is_active: true,
      joined_at: Date.now(),
    });

    return gamePlayerId;
  },
});

/**
 * Update game player
 */
export const updateGamePlayer = mutation({
  args: {
    game_player_id: v.id("game_players"),
    score: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const gamePlayer = await ctx.db.get(args.game_player_id);
    if (!gamePlayer) {
      throw new ConvexError("Game player not found");
    }

    const updates: Partial<{
      score: number;
      is_active: boolean;
    }> = {};

    if (args.score !== undefined) {
      updates.score = args.score;
    }

    if (args.is_active !== undefined) {
      updates.is_active = args.is_active;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.game_player_id, updates);
    }
  },
});

/**
 * Start a game (host only)
 */
export const startGame = mutation({
  args: {
    game_id: v.id("games"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const game = await ctx.db.get(args.game_id);
    if (!game) {
      throw new ConvexError("Game not found");
    }

    if (game.host_id !== userId) {
      throw new ConvexError("Only the host can start the game");
    }

    if (game.status !== "waiting") {
      throw new ConvexError("Game has already started");
    }

    await ctx.db.patch(args.game_id, {
      status: "active",
      updated_at: Date.now(),
    });
  },
});

/**
 * Advance to next turn
 */
export const advanceTurn = mutation({
  args: {
    game_id: v.id("games"),
    new_turn_index: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const game = await ctx.db.get(args.game_id);
    if (!game) {
      throw new ConvexError("Game not found");
    }

    await ctx.db.patch(args.game_id, {
      current_turn: args.new_turn_index,
      updated_at: Date.now(),
    });
  },
});

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
