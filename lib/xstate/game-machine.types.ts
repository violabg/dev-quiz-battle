import type {
  AnswerWithPlayer,
  Game,
  GameDifficulty,
  GameLanguage,
  GameWithPlayers,
  Profile,
  Question,
} from "@/types/supabase";
import type { RealtimeChannel, User } from "@supabase/supabase-js";

// Machine Context
export interface GameMachineContext {
  // Game data
  gameCode: string;
  game: GameWithPlayers | null;
  user: User | null;

  // Player state
  isHost: boolean;
  currentPlayerIndex: number;

  // Question state
  currentQuestion: Question | null;
  questionStartTime: number | null;
  selectedLanguage: GameLanguage;
  selectedDifficulty: GameDifficulty;

  // Answer state
  allAnswers: AnswerWithPlayer[];
  userAnswer: AnswerWithPlayer | null;
  winner: { playerId: string; user_name: string; score: number } | null;

  // UI state
  isLoadingCreateQuestion: boolean;
  isLoadingSubmitAnswer: boolean;
  showNextTurn: boolean;

  // Realtime subscriptions
  gameSubscription: RealtimeChannel | null;
  playersSubscription: RealtimeChannel | null;
  questionsSubscription: RealtimeChannel | null;
  answersSubscription: RealtimeChannel | null;

  // Error handling
  error: string | null;
}

// Machine Events
export type GameMachineEvent =
  | { type: "INITIALIZE"; gameCode: string; user: User | null }
  | { type: "GAME_LOADED"; game: GameWithPlayers }
  | { type: "GAME_UPDATED"; game: Game }
  | { type: "PLAYERS_UPDATED"; players: GameWithPlayers["players"] }
  | { type: "HOST_UPDATED"; host: Profile }
  | { type: "START_GAME" }
  | { type: "LEAVE_GAME" }
  | { type: "SELECT_LANGUAGE"; language: GameLanguage }
  | { type: "SELECT_DIFFICULTY"; difficulty: GameDifficulty }
  | { type: "CREATE_QUESTION" }
  | { type: "QUESTION_CREATED"; question: Question; startTime: number }
  | { type: "QUESTION_UPDATED"; question: Question }
  | { type: "SUBMIT_ANSWER"; selectedOption: number; responseTimeMs: number }
  | { type: "ANSWER_SUBMITTED"; answer: AnswerWithPlayer }
  | { type: "ANSWERS_UPDATED"; answers: AnswerWithPlayer[] }
  | { type: "QUESTION_ENDED" }
  | { type: "TURN_COMPLETED" }
  | { type: "NEXT_TURN" }
  | { type: "GAME_COMPLETED" }
  | { type: "RESET_QUESTION_STATE" }
  | {
      type: "SET_WINNER";
      winner: { playerId: string; user_name: string; score: number };
    }
  | { type: "TIMER_TICK" }
  | { type: "ERROR"; error: string }
  | { type: "RETRY" }
  | { type: "CLEAR_ERROR" };

// Machine State Value Types
export type GameMachineState =
  | "initializing"
  | "error"
  | { lobby: "waiting" | "starting" }
  | {
      active:
        | "questionSelection"
        | "questionDisplay"
        | "answering"
        | "showingResults";
    }
  | "completed"
  | "left";

// Action Types
export interface InitializeGameAction {
  type: "initializeGame";
  params: { gameCode: string; user: User | null };
}

export interface SetupRealtimeSubscriptionsAction {
  type: "setupRealtimeSubscriptions";
}

export interface CleanupSubscriptionsAction {
  type: "cleanupSubscriptions";
}

export interface UpdateGameDataAction {
  type: "updateGameData";
  params: {
    game?: GameWithPlayers;
    players?: GameWithPlayers["players"];
    host?: Profile;
  };
}

export interface SetCurrentQuestionAction {
  type: "setCurrentQuestion";
  params: { question: Question; startTime: number };
}

export interface StartQuestionTimerAction {
  type: "startQuestionTimer";
}

export interface StopQuestionTimerAction {
  type: "stopQuestionTimer";
}

export interface ResetQuestionStateAction {
  type: "resetQuestionState";
}

export interface SetWinnerAction {
  type: "setWinner";
  params: { winner: { playerId: string; user_name: string; score: number } };
}

export interface SetErrorAction {
  type: "setError";
  params: { error: string };
}

export interface ClearErrorAction {
  type: "clearError";
}

// Service Types
export interface FetchGameService {
  type: "fetchGame";
  params: { gameCode: string; user: User };
}

export interface StartGameService {
  type: "startGame";
  params: { gameId: string };
}

export interface CreateQuestionService {
  type: "createQuestion";
  params: {
    gameId: string;
    language: GameLanguage;
    difficulty: GameDifficulty;
  };
}

export interface SubmitAnswerService {
  type: "submitAnswer";
  params: {
    questionId: string;
    playerId: string;
    gameId: string;
    selectedOption: number;
    responseTimeMs: number;
    timeLimitMs: number;
  };
}

export interface AdvanceTurnService {
  type: "advanceTurn";
  params: {
    gameId: string;
    currentPlayerIndex: number;
    totalPlayers: number;
  };
}

export interface LeaveGameService {
  type: "leaveGame";
  params: { gameId: string; playerId: string };
}

// Guard Types
export interface IsHostGuard {
  type: "isHost";
}

export interface IsCurrentPlayersTurnGuard {
  type: "isCurrentPlayersTurn";
}

export interface HasCurrentQuestionGuard {
  type: "hasCurrentQuestion";
}

export interface IsQuestionEndedGuard {
  type: "isQuestionEnded";
}

export interface IsGameCompletedGuard {
  type: "isGameCompleted";
}

export interface CanStartGameGuard {
  type: "canStartGame";
}

export interface AllPlayersAnsweredGuard {
  type: "allPlayersAnswered";
}

export interface HasCorrectAnswerGuard {
  type: "hasCorrectAnswer";
}

export interface IsTimeUpGuard {
  type: "isTimeUp";
}
