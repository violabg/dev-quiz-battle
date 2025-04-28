export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      games: {
        Row: {
          id: string;
          code: string;
          host_id: string;
          status: "waiting" | "active" | "completed";
          current_turn: number;
          max_players: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code?: string;
          host_id: string;
          status: "waiting" | "active" | "completed";
          current_turn: number;
          max_players?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          host_id?: string;
          status?: "waiting" | "active" | "completed";
          current_turn: number;
          max_players?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      game_players: {
        Row: {
          id: string;
          game_id: string;
          player_id: string;
          score: number;
          turn_order: number;
          is_active: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          player_id: string;
          score?: number;
          turn_order: number;
          is_active?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          player_id?: string;
          score?: number;
          turn_order?: number;
          is_active?: boolean;
          joined_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          game_id: string;
          created_by_player_id: string;
          language: string;
          difficulty: "easy" | "medium" | "hard" | "expert";
          question_text: string;
          code_sample: string | null;
          started_at?: string;
          ended_at?: string;
          options: Json;
          correct_answer: number;
          explanation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          created_by_player_id: string;
          language: string;
          difficulty: "easy" | "medium" | "hard" | "expert";
          question_text: string;
          code_sample?: string | null;
          started_at?: string;
          ended_at?: string;
          options: Json;
          correct_answer: number;
          explanation?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          created_by_player_id?: string;
          language?: string;
          difficulty?: "easy" | "medium" | "hard" | "expert";
          question_text?: string;
          code_sample?: string | null;
          started_at?: string;
          ended_at?: string;
          options?: Json;
          correct_answer?: number;
          explanation?: string | null;
          created_at?: string;
        };
      };
      answers: {
        Row: {
          id: string;
          question_id: string;
          player_id: string;
          selected_option: number;
          is_correct: boolean;
          response_time_ms: number;
          score_earned: number;
          answered_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          player_id: string;
          selected_option: number;
          is_correct: boolean;
          response_time_ms: number;
          score_earned?: number;
          answered_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          player_id?: string;
          selected_option?: number;
          is_correct?: boolean;
          response_time_ms?: number;
          score_earned?: number;
          answered_at?: string;
        };
      };
    };
    Functions: {
      calculate_score: {
        Args: {
          response_time_ms: number;
        };
        Returns: number;
      };
      generate_unique_game_code: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Game = Database["public"]["Tables"]["games"]["Row"];
export type Player = Database["public"]["Tables"]["game_players"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type Answer = Database["public"]["Tables"]["answers"]["Row"];

export type GameWithPlayers = Game & {
  players: (Player & { profile: Profile })[];
  host: Profile;
};

export type QuestionWithAnswers = Question & {
  answers: (Answer & { player: Profile })[];
};

export type GameLanguage =
  | "javascript"
  | "python"
  | "java"
  | "csharp"
  | "typescript"
  | "go"
  | "rust"
  | "ruby";
export type GameDifficulty = "easy" | "medium" | "hard" | "expert";

export interface QuestionOption {
  text: string;
}

export type AnswerWithPlayer = {
  id: string;
  player_id: string;
  selected_option: number;
  is_correct: boolean;
  response_time_ms: number;
  score_earned: number;
  answered_at: string;
  player: { id: string; username: string; avatar_url?: string | null };
};
