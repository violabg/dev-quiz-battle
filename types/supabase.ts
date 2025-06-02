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
      profiles: {
        Row: {
          id: string;
          name: string;
          full_name: string;
          user_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          full_name: string;
          user_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          full_name?: string;
          user_name?: string;
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
          time_limit: number;
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
          time_limit?: number;
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
          time_limit?: number;
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
      get_leaderboard_players_by_language: {
        Args: {
          language_filter: string;
          offset_value: number;
          limit_value: number;
        };
        Returns: Array<{
          player_id: string;
          total_score: number;
          name: string;
          full_name: string;
          user_name: string;
          avatar_url: string | null;
        }>;
      };
      calculate_score: {
        Args: {
          response_time_ms: number;
          time_limit_ms: number;
        };
        Returns: number;
      };
      generate_unique_game_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_leaderboard_players: {
        Args: {
          offset_value: number;
          limit_value: number;
          language_filter?: string | null;
        };
        Returns: Array<{
          player_id: string;
          total_score: number;
          name: string;
          full_name: string;
          user_name: string;
          avatar_url: string | null;
          total_items: number;
        }>;
      };
      get_user_profile_with_score: {
        Args: {
          user_id: string;
        };
        Returns: {
          profile_id: string;
          name: string;
          full_name: string;
          user_name: string;
          avatar_url: string | null;
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
        Returns: Array<{
          answer_id: string;
          was_winning_answer: boolean;
          score_earned: number;
        }>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Supabase RPC (Function) Types
export type CalculateScoreArgs =
  Database["public"]["Functions"]["calculate_score"]["Args"];

export type CalculateScoreReturn =
  Database["public"]["Functions"]["calculate_score"]["Returns"];

export type GenerateUniqueGameCodeArgs =
  Database["public"]["Functions"]["generate_unique_game_code"]["Args"];

export type GenerateUniqueGameCodeReturn =
  Database["public"]["Functions"]["generate_unique_game_code"]["Returns"];

export type GetLeaderboardPlayersArgs = {
  offset_value: number;
  limit_value: number;
  language_filter?: string | null;
};
export type GetLeaderboardPlayersReturn = {
  player_id: string;
  total_score: number;
  name: string;
  full_name: string;
  user_name: string;
  avatar_url: string | null;
  total_items: number;
};

export type CountUniquePlayersArgs = Record<string, never>;
export type CountUniquePlayersReturn = number;

export type GetUserProfileWithScoreArgs = {
  user_id: string;
};
export type GetUserProfileWithScoreReturn = {
  profile_id: string;
  name: string;
  full_name: string;
  user_name: string;
  avatar_url: string | null;
  total_score: number;
};

export type SubmitAnswerArgs = {
  p_question_id: string;
  p_player_id: string;
  p_game_id: string;
  p_selected_option: number;
  p_response_time_ms: number;
  p_time_limit_ms: number;
};

export type SubmitAnswerReturn = {
  answer_id: string;
  was_winning_answer: boolean;
  score_earned: number;
};

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

export type AnswerWithPlayer = {
  id: string;
  player_id: string;
  selected_option: number;
  is_correct: boolean;
  response_time_ms: number;
  score_earned: number;
  answered_at: string;
  player: { id: string; user_name: string; avatar_url?: string | null };
};

export type GetLeaderboardPlayersByLanguageArgs = {
  language_filter: string;
  offset_value: number;
  limit_value: number;
};
export type GetLeaderboardPlayersByLanguageReturn = {
  player_id: string;
  total_score: number;
  name: string;
  full_name: string;
  user_name: string;
  avatar_url: string | null;
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
    : never
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
