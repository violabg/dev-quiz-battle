export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      answers: {
        Row: {
          answered_at: string | null;
          id: string;
          is_correct: boolean;
          player_id: string | null;
          question_id: string | null;
          response_time_ms: number;
          score_earned: number;
          selected_option: number;
        };
        Insert: {
          answered_at?: string | null;
          id?: string;
          is_correct: boolean;
          player_id?: string | null;
          question_id?: string | null;
          response_time_ms: number;
          score_earned?: number;
          selected_option: number;
        };
        Update: {
          answered_at?: string | null;
          id?: string;
          is_correct?: boolean;
          player_id?: string | null;
          question_id?: string | null;
          response_time_ms?: number;
          score_earned?: number;
          selected_option?: number;
        };
        Relationships: [
          {
            foreignKeyName: "answers_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          }
        ];
      };
      game_players: {
        Row: {
          game_id: string | null;
          id: string;
          is_active: boolean;
          joined_at: string | null;
          player_id: string | null;
          score: number;
          turn_order: number;
        };
        Insert: {
          game_id?: string | null;
          id?: string;
          is_active?: boolean;
          joined_at?: string | null;
          player_id?: string | null;
          score?: number;
          turn_order: number;
        };
        Update: {
          game_id?: string | null;
          id?: string;
          is_active?: boolean;
          joined_at?: string | null;
          player_id?: string | null;
          score?: number;
          turn_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "game_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      games: {
        Row: {
          code: string;
          created_at: string | null;
          current_turn: number;
          host_id: string | null;
          id: string;
          max_players: number;
          status: string;
          time_limit: number;
          turns_completed: number;
          updated_at: string | null;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          current_turn?: number;
          host_id?: string | null;
          id?: string;
          max_players?: number;
          status: string;
          time_limit?: number;
          turns_completed?: number;
          updated_at?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          current_turn?: number;
          host_id?: string | null;
          id?: string;
          max_players?: number;
          status?: string;
          time_limit?: number;
          turns_completed?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "games_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      player_language_scores: {
        Row: {
          language: string;
          player_id: string;
          total_score: number;
        };
        Insert: {
          language: string;
          player_id: string;
          total_score?: number;
        };
        Update: {
          language?: string;
          player_id?: string;
          total_score?: number;
        };
        Relationships: [
          {
            foreignKeyName: "player_language_scores_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          full_name: string | null;
          id: string;
          name: string | null;
          updated_at: string | null;
          user_name: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          full_name?: string | null;
          id: string;
          name?: string | null;
          updated_at?: string | null;
          user_name?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          full_name?: string | null;
          id?: string;
          name?: string | null;
          updated_at?: string | null;
          user_name?: string | null;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          code_sample: string | null;
          correct_answer: number;
          created_at: string | null;
          created_by_player_id: string | null;
          difficulty: string;
          ended_at: string | null;
          explanation: string | null;
          game_id: string | null;
          id: string;
          language: string;
          options: Json;
          question_text: string;
          started_at: string | null;
        };
        Insert: {
          code_sample?: string | null;
          correct_answer: number;
          created_at?: string | null;
          created_by_player_id?: string | null;
          difficulty: string;
          ended_at?: string | null;
          explanation?: string | null;
          game_id?: string | null;
          id?: string;
          language: string;
          options: Json;
          question_text: string;
          started_at?: string | null;
        };
        Update: {
          code_sample?: string | null;
          correct_answer?: number;
          created_at?: string | null;
          created_by_player_id?: string | null;
          difficulty?: string;
          ended_at?: string | null;
          explanation?: string | null;
          game_id?: string | null;
          id?: string;
          language?: string;
          options?: Json;
          question_text?: string;
          started_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "questions_created_by_player_id_fkey";
            columns: ["created_by_player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_score: {
        Args: { response_time_ms: number; time_limit_ms: number };
        Returns: number;
      };
      generate_unique_game_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_leaderboard_players: {
        Args:
          | { offset_value: number; limit_value: number }
          | {
              offset_value: number;
              limit_value: number;
              language_filter?: string | null;
            };
        Returns: {
          player_id: string;
          total_items: number;
          total_score: number;
          name: string;
          full_name: string;
          user_name: string;
          avatar_url: string;
        }[];
      };
      get_user_profile_with_score: {
        Args: { user_id: string };
        Returns: {
          profile_id: string;
          name: string;
          full_name: string;
          user_name: string;
          avatar_url: string;
          total_score: number;
        }[];
      };
      submit_answer: {
        Args: {
          p_question_id: string;
          p_player_id: string;
          p_game_id: string;
          p_selected_option: number;
          p_response_time_ms: number;
          p_time_limit_ms: number;
        };
        Returns: {
          answer_id: string;
          was_winning_answer: boolean;
          score_earned: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

// Additional convenience types for your application

// Table row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Game = Database["public"]["Tables"]["games"]["Row"];
export type GamePlayer = Database["public"]["Tables"]["game_players"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type Answer = Database["public"]["Tables"]["answers"]["Row"];
export type PlayerLanguageScore =
  Database["public"]["Tables"]["player_language_scores"]["Row"];

// Table insert types
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type GameInsert = Database["public"]["Tables"]["games"]["Insert"];
export type GamePlayerInsert =
  Database["public"]["Tables"]["game_players"]["Insert"];
export type QuestionInsert =
  Database["public"]["Tables"]["questions"]["Insert"];
export type AnswerInsert = Database["public"]["Tables"]["answers"]["Insert"];
export type PlayerLanguageScoreInsert =
  Database["public"]["Tables"]["player_language_scores"]["Insert"];

// Table update types
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type GameUpdate = Database["public"]["Tables"]["games"]["Update"];
export type GamePlayerUpdate =
  Database["public"]["Tables"]["game_players"]["Update"];
export type QuestionUpdate =
  Database["public"]["Tables"]["questions"]["Update"];
export type AnswerUpdate = Database["public"]["Tables"]["answers"]["Update"];
export type PlayerLanguageScoreUpdate =
  Database["public"]["Tables"]["player_language_scores"]["Update"];

// Function types
export type CalculateScoreArgs =
  Database["public"]["Functions"]["calculate_score"]["Args"];
export type CalculateScoreReturn =
  Database["public"]["Functions"]["calculate_score"]["Returns"];

export type GenerateUniqueGameCodeArgs =
  Database["public"]["Functions"]["generate_unique_game_code"]["Args"];
export type GenerateUniqueGameCodeReturn =
  Database["public"]["Functions"]["generate_unique_game_code"]["Returns"];

export type GetLeaderboardPlayersArgs =
  Database["public"]["Functions"]["get_leaderboard_players"]["Args"];
export type GetLeaderboardPlayersReturn =
  Database["public"]["Functions"]["get_leaderboard_players"]["Returns"];

export type GetUserProfileWithScoreArgs =
  Database["public"]["Functions"]["get_user_profile_with_score"]["Args"];
export type GetUserProfileWithScoreReturn =
  Database["public"]["Functions"]["get_user_profile_with_score"]["Returns"];

export type SubmitAnswerArgs =
  Database["public"]["Functions"]["submit_answer"]["Args"];
export type SubmitAnswerReturn =
  Database["public"]["Functions"]["submit_answer"]["Returns"];

// Composite types for common use cases
export type GameWithPlayers = Game & {
  players: (GamePlayer & { profile: Profile })[];
  host: Profile;
};

export type QuestionWithAnswers = Question & {
  answers: (Answer & { player: Profile })[];
};

export type AnswerWithPlayer = Answer & {
  player: Profile | null;
};

export type GamePlayerWithProfile = GamePlayer & {
  profile: Profile;
};

// Game-specific types
export type GameStatus = "waiting" | "active" | "completed";

export type GameLanguage =
  | "css"
  | "html"
  | "javascript"
  | "typescript"
  | "react"
  | "vue"
  | "angular"
  | "nodejs"
  | "python"
  | "java"
  | "csharp"
  | "go"
  | "rust"
  | "ruby";

export type GameDifficulty = "easy" | "medium" | "hard" | "expert";

export interface QuestionOption {
  text: string;
}

// Leaderboard types
export type LeaderboardPlayer = {
  player_id: string;
  total_score: number;
  name: string;
  full_name: string;
  user_name: string;
  avatar_url: string | null;
};

export type LeaderboardPlayerWithItems = LeaderboardPlayer & {
  total_items: number;
};

// Utility types for API responses
export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};
