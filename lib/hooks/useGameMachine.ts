"use client";

import { gameMachine } from "@/lib/xstate/game-machine";
import type { GameDifficulty, GameLanguage } from "@/types/supabase";
import type { User } from "@supabase/supabase-js";
import { useMachine } from "@xstate/react";
import { useEffect } from "react";

export function useGameMachine(gameCode: string, user: User | null) {
  const [state, send] = useMachine(gameMachine);

  // Initialize the machine when user and gameCode are available
  useEffect(() => {
    if (user && gameCode && state.matches("initializing")) {
      send({ type: "INITIALIZE", gameCode, user });
    }
  }, [user, gameCode, state, send]);

  // Derived state selectors
  const isLoading =
    state.matches("loading") || state.matches("settingUpSubscriptions");
  const isInLobby = state.matches({ gameActive: "lobby" });
  const isInActiveGame = state.matches({ gameActive: "activeGame" });
  const isSelectingQuestion = state.matches({
    gameActive: { activeGame: "questionSelection" },
  });
  const isCreatingQuestion = state.matches({
    gameActive: { activeGame: "creatingQuestion" },
  });
  const isQuestionActive = state.matches({
    gameActive: { activeGame: "questionActive" },
  });
  const isAnswering = state.matches({
    gameActive: { activeGame: { questionActive: "answering" } },
  });
  const isSubmittingAnswer = state.matches({
    gameActive: { activeGame: { questionActive: "submittingAnswer" } },
  });
  const hasAnswered = state.matches({
    gameActive: { activeGame: { questionActive: "answered" } },
  });
  const isAdvancingTurn = state.matches({
    gameActive: { activeGame: "advancingTurn" },
  });
  const isGameCompleted = state.matches({ gameActive: "completed" });
  const hasError = state.matches("error");
  const hasLeft = state.matches("left");

  // Actions
  const startGame = () => send({ type: "START_GAME" });
  const leaveGame = () => send({ type: "LEAVE_GAME" });
  const selectLanguage = (language: GameLanguage) =>
    send({ type: "SELECT_LANGUAGE", language });
  const selectDifficulty = (difficulty: GameDifficulty) =>
    send({ type: "SELECT_DIFFICULTY", difficulty });
  const createQuestion = () => send({ type: "CREATE_QUESTION" });
  const submitAnswer = (selectedOption: number, responseTimeMs: number) =>
    send({ type: "SUBMIT_ANSWER", selectedOption, responseTimeMs });
  const nextTurn = () => send({ type: "NEXT_TURN" });
  const clearError = () => send({ type: "CLEAR_ERROR" });
  const retry = () => send({ type: "RETRY" });

  return {
    // State
    state,
    context: state.context,

    // Derived state flags
    isLoading,
    isInLobby,
    isInActiveGame,
    isSelectingQuestion,
    isCreatingQuestion,
    isQuestionActive,
    isAnswering,
    isSubmittingAnswer,
    hasAnswered,
    isAdvancingTurn,
    isGameCompleted,
    hasError,
    hasLeft,

    // Actions
    startGame,
    leaveGame,
    selectLanguage,
    selectDifficulty,
    createQuestion,
    submitAnswer,
    nextTurn,
    clearError,
    retry,

    // Raw send function for custom events
    send,
  };
}
