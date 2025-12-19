import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    username: v.optional(v.string()),
    total_score: v.optional(v.number()),
    games_played: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("by_total_score", ["total_score"]),

  games: defineTable({
    code: v.string(),
    host_id: v.id("users"),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("completed")
    ),
    max_players: v.number(),
    current_turn: v.number(),
    time_limit: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_code", ["code"]),

  game_players: defineTable({
    game_id: v.id("games"),
    player_id: v.id("users"),
    score: v.number(),
    turn_order: v.number(),
    is_active: v.boolean(),
    joined_at: v.number(),
  })
    .index("by_game_player", ["game_id", "player_id"])
    .index("by_game_id", ["game_id"])
    .index("by_player_id", ["player_id"]),

  questions: defineTable({
    game_id: v.id("games"),
    created_by_player_id: v.id("users"),
    language: v.string(),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
      v.literal("expert")
    ),
    question_text: v.string(),
    code_sample: v.optional(v.string()),
    options: v.array(v.string()),
    correct_answer: v.number(),
    explanation: v.optional(v.string()),
    started_at: v.optional(v.number()),
    ended_at: v.optional(v.number()),
    created_at: v.number(),
  })
    .index("by_game_id", ["game_id"])
    .index("by_language", ["language"])
    .index("by_game_ended", ["game_id", "ended_at"]),

  answers: defineTable({
    question_id: v.id("questions"),
    player_id: v.id("users"),
    selected_option: v.number(),
    is_correct: v.boolean(),
    response_time_ms: v.number(),
    score_earned: v.number(),
    answered_at: v.number(),
  })
    .index("by_question_player", ["question_id", "player_id"])
    .index("by_question_id", ["question_id"])
    .index("by_player_id", ["player_id"]),

  player_language_scores: defineTable({
    player_id: v.id("users"),
    language: v.string(),
    total_score: v.number(),
  })
    .index("by_player_language", ["player_id", "language"])
    .index("by_language", ["language"])
    .index("by_language_score", ["language", "total_score"]),
});
