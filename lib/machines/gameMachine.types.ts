import type {
  AnswerWithPlayer,
  Database,
  GameDifficulty,
  GameLanguage,
  GameWithPlayers, // Ensure Profile is imported
  Player,
  Profile, // Ensure Player is imported
  Question,
} from "@/types/supabase";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type GameMachineContext = {
  supabase: SupabaseClient<Database>;
  gameIdOrCode: string; // Used for initial load and subscriptions
  currentUser: User;
  game: GameWithPlayers | null;
  currentQuestion: Question | null;
  currentQuestionAnswers: AnswerWithPlayer[];
  currentQuestionWinner: {
    playerId: string;
    user_name: string;
    score: number;
  } | null;
  error: string | null;
  isLoading: boolean; // General loading for async operations within states
  isLoadingInitial: boolean; // For the very first load
  selectedLanguage: GameLanguage;
  selectedDifficulty: GameDifficulty;
  questionStartTime: number | null; // Timestamp when the current question was displayed
  // Derived data, easier to manage in context for UI
  isHost: boolean;
  currentPlayerForTurn: (Player & { profile: Profile }) | undefined;
  isCurrentUserPlayerForTurn: boolean;
  isRoundComplete: boolean;
};

export type GameMachineEvent =
  | { type: "RETRY_INITIAL_LOAD" }
  | { type: "GAME_DATA_FETCHED"; game: GameWithPlayers }
  | { type: "GAME_DATA_NOT_FOUND"; error: string }
  | { type: "GAME_DELETED_EXTERNALLY" }
  | { type: "GAME_UPDATED_FROM_SUBSCRIPTION"; game: GameWithPlayers }
  | {
      type: "PLAYERS_UPDATED_FROM_SUBSCRIPTION";
      players: (Player & { profile: Profile })[];
    }
  | { type: "HOST_INITIATE_START_GAME" }
  | { type: "GAME_START_SUCCESS"; game: GameWithPlayers } // game status is now active
  | { type: "GAME_START_FAILURE"; error: string }
  | { type: "PLAYER_INITIATE_LEAVE_GAME" }
  | { type: "LEAVE_GAME_SUCCESS" } // Player removed or game ended if host
  | { type: "LEAVE_GAME_FAILURE"; error: string }
  | {
      type: "PLAYER_SELECT_QUESTION_PARAMS";
      language: GameLanguage;
      difficulty: GameDifficulty;
    }
  | { type: "QUESTION_CREATION_INITIATED" }
  | {
      type: "QUESTION_CREATED_SUCCESS";
      question: Question;
      game?: GameWithPlayers;
    } // game if status changed
  | { type: "QUESTION_CREATION_FAILURE"; error: string }
  | { type: "ANSWER_SUBMITTED"; selectedOption: number }
  | {
      type: "ANSWER_RECORDED_SUCCESS";
      answers: AnswerWithPlayer[];
      winner?: GameMachineContext["currentQuestionWinner"];
      updatedQuestion?: Question;
    }
  | { type: "ANSWER_RECORDED_FAILURE"; error: string }
  | { type: "QUESTION_TIMER_ENDED" } // Or question ended by winner
  | {
      type: "QUESTION_ENDED_NATURALLY";
      updatedQuestion: Question;
      answers: AnswerWithPlayer[];
    }
  | { type: "PLAYER_INITIATE_NEXT_TURN" }
  | { type: "NEXT_TURN_SUCCESS"; game: GameWithPlayers }
  | { type: "NEXT_TURN_FAILURE"; error: string }
  | { type: "GAME_COMPLETED_CONDITION_MET"; game: GameWithPlayers } // Game status is now completed
  | {
      type: "UPDATE_INTERNAL_CURRENT_QUESTION_ID";
      questionId: string | null | undefined;
    }
  | { type: "ANSWERS_FOR_QUESTION_FETCHED"; answers: AnswerWithPlayer[] }
  | {
      type: "SET_WINNER_FOR_QUESTION";
      winner: GameMachineContext["currentQuestionWinner"];
      updatedQuestion: Question;
    }
  | { type: "CLEAR_QUESTION_STATE" }
  | { type: "ANSWERS_UPDATED_FROM_SUBSCRIPTION"; answers: AnswerWithPlayer[] }
  | { type: "FETCH_ANSWERS_FAILURE"; error: any }
  | { type: "SET_IS_LOADING"; isLoading: boolean };

// Specific event types for invoking services might be useful if you need to pass specific data to them
// For example:
// | { type: 'invoke.service.createQuestion'; data: { language: GameLanguage, difficulty: GameDifficulty } }

export type GameMachineInput = {
  supabase: SupabaseClient<Database>;
  code: string;
  user: User;
};
