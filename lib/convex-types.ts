import { Doc, Id } from "@/convex/_generated/dataModel";

// Language and Difficulty types
export type GameLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "csharp"
  | "cpp"
  | "go"
  | "ruby"
  | "php"
  | "swift"
  | "kotlin";

export type GameDifficulty = "easy" | "medium" | "hard" | "expert";

export type GameStatus = "waiting" | "active" | "completed";

// Game types with relations
export interface GameWithPlayers extends Doc<"games"> {
  host: Doc<"users"> | null;
  players: Array<{
    _id: Id<"game_players">;
    _creationTime: number;
    game_id: Id<"games">;
    player_id: Id<"users">;
    score: number;
    turn_order: number;
    is_active: boolean;
    joined_at: number;
    user: Doc<"users"> | null;
  }>;
}

// Question types with relations
export interface QuestionWithCreator extends Doc<"questions"> {
  creator: Doc<"users"> | null;
}

// Answer types with relations
export interface AnswerWithUser extends Doc<"answers"> {
  user: Doc<"users"> | null;
}

// Leaderboard player type
export interface LeaderboardPlayer {
  player_id: Id<"users">;
  total_score: number;
  user: Doc<"users"> | null;
}
