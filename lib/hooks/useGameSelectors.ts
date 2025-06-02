"use client";

import { gameMachine } from "@/lib/xstate/game-machine";
import { useSelector } from "@xstate/react";
import type { ActorRefFrom } from "xstate";

type GameMachineActor = ActorRefFrom<typeof gameMachine>;

// Game data selectors
export const useGameData = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.game);

export const useIsHost = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.isHost);

export const useUser = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.user);

export const useGameCode = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.gameCode);

// Player state selectors
export const useCurrentPlayerIndex = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.currentPlayerIndex);

export const useCurrentPlayer = (actor: GameMachineActor) =>
  useSelector(actor, (state) => {
    const { game, currentPlayerIndex } = state.context;
    return game?.players[currentPlayerIndex] || null;
  });

export const useIsCurrentPlayersTurn = (actor: GameMachineActor) =>
  useSelector(actor, (state) => {
    const { game, user, currentPlayerIndex } = state.context;
    if (!game || !user) return false;
    const currentPlayer = game.players[currentPlayerIndex];
    return currentPlayer?.player_id === user.id;
  });

export const useIsNextPlayersTurn = (actor: GameMachineActor) =>
  useSelector(actor, (state) => {
    const { game, user, currentPlayerIndex } = state.context;
    if (!game || !user) return false;
    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
    const nextPlayer = game.players[nextPlayerIndex];
    return nextPlayer?.player_id === user.id;
  });

// Question state selectors
export const useCurrentQuestion = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.currentQuestion);

export const useQuestionStartTime = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.questionStartTime);

export const useSelectedLanguage = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.selectedLanguage);

export const useSelectedDifficulty = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.selectedDifficulty);

// Answer state selectors
export const useAllAnswers = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.allAnswers);

export const useUserAnswer = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.userAnswer);

export const useWinner = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.winner);

// UI state selectors
export const useIsLoadingCreateQuestion = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.isLoadingCreateQuestion);

export const useIsLoadingSubmitAnswer = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.isLoadingSubmitAnswer);

export const useShowNextTurn = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.showNextTurn);

export const useIsShowingResults = (actor: GameMachineActor) =>
  useSelector(actor, (state) =>
    state.matches({ gameActive: { activeGame: "showingResults" } })
  );

// Error state selector
export const useError = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.error);

// State machine selectors
export const useIsLoading = (actor: GameMachineActor) =>
  useSelector(
    actor,
    (state) =>
      state.matches("initializing") ||
      state.matches("loading") ||
      state.matches("settingUpSubscriptions")
  );

export const useIsInLobby = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.matches({ gameActive: "lobby" }));

export const useIsInActiveGame = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.matches({ gameActive: "activeGame" }));

export const useIsSelectingQuestion = (actor: GameMachineActor) =>
  useSelector(actor, (state) =>
    state.matches({ gameActive: { activeGame: "questionSelection" } })
  );

export const useIsCreatingQuestion = (actor: GameMachineActor) =>
  useSelector(actor, (state) =>
    state.matches({ gameActive: { activeGame: "creatingQuestion" } })
  );

export const useIsQuestionActive = (actor: GameMachineActor) =>
  useSelector(actor, (state) =>
    state.matches({ gameActive: { activeGame: "questionActive" } })
  );

export const useIsAnswering = (actor: GameMachineActor) =>
  useSelector(actor, (state) =>
    state.matches({
      gameActive: { activeGame: { questionActive: "answering" } },
    })
  );

export const useIsSubmittingAnswer = (actor: GameMachineActor) =>
  useSelector(actor, (state) =>
    state.matches({
      gameActive: { activeGame: { questionActive: "submittingAnswer" } },
    })
  );

export const useHasAnswered = (actor: GameMachineActor) =>
  useSelector(actor, (state) =>
    state.matches({
      gameActive: { activeGame: { questionActive: "answered" } },
    })
  );

export const useIsAdvancingTurn = (actor: GameMachineActor) =>
  useSelector(actor, (state) =>
    state.matches({ gameActive: { activeGame: "advancingTurn" } })
  );

export const useIsGameCompleted = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.matches({ gameActive: "completed" }));

export const useHasError = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.matches("error"));

export const useErrorMessage = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.error);

// Composite selectors for complex UI logic
export const useIsRoundComplete = (actor: GameMachineActor) =>
  useSelector(actor, (state) => state.context.game?.status === "completed");

export const useTimeIsUp = (actor: GameMachineActor) =>
  useSelector(actor, (state) => {
    const { questionStartTime, game } = state.context;
    if (!questionStartTime || !game) return false;
    const timeLimit = game.time_limit * 1000;
    return Date.now() - questionStartTime >= timeLimit;
  });

export const useCanStartGame = (actor: GameMachineActor) =>
  useSelector(actor, (state) => {
    const { game, isHost } = state.context;
    if (!game || !isHost) return false;
    return (
      game.players.length >= 2 &&
      game.players.length <= game.max_players &&
      game.status === "waiting"
    );
  });

// Additional selectors needed for GameRoom
export const useCurrentPlayerUsername = (actor: GameMachineActor) =>
  useSelector(actor, (state) => {
    const { game, user } = state.context;
    if (!game || !user) return undefined;
    const currentPlayerIndex = game.current_turn ?? 0;
    const currentPlayer = game.players[currentPlayerIndex];
    return currentPlayer?.profile?.user_name;
  });
