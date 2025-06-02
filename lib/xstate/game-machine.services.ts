import { createClient } from "@/lib/supabase/client";
import { submitAnswer } from "@/lib/supabase/supabase-answers";
import {
  getPlayersForGame,
  setPlayerInactive,
} from "@/lib/supabase/supabase-game-players";
import {
  getGameByCode,
  updateGameStatus,
  updateGameTurn,
} from "@/lib/supabase/supabase-games";
import { getProfileById } from "@/lib/supabase/supabase-profiles";
import type {
  GameDifficulty,
  GameLanguage,
  GameWithPlayers,
} from "@/types/supabase";
import type { User } from "@supabase/supabase-js";

const supabase = createClient();

export const gameServices = {
  // Fetch initial game data
  fetchGame: async ({ gameCode, user }: { gameCode: string; user: User }) => {
    try {
      const { data: gameData } = await getGameByCode(supabase, gameCode);

      if (!gameData) {
        throw new Error("Game not found");
      }

      const playersData = await getPlayersForGame(gameData.id);
      const hostData = await getProfileById(gameData.host_id);

      const result = {
        game: {
          ...gameData,
          players: playersData,
          host: hostData,
        },
        isHost: user.id === gameData.host_id,
      };

      return result;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch game"
      );
    }
  },

  // Start the game
  startGame: async ({ gameId }: { gameId: string }) => {
    try {
      await updateGameStatus(gameId, "active");
      return { success: true };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to start game"
      );
    }
  },

  // Create a new question
  createQuestion: async ({
    gameId,
    language,
    difficulty,
  }: {
    gameId: string;
    language: GameLanguage;
    difficulty: GameDifficulty;
  }) => {
    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId,
          language,
          difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create question");
      }

      const newQuestion = await response.json();
      const startTime = new Date(newQuestion.started_at).getTime();

      return {
        question: newQuestion,
        startTime,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to create question"
      );
    }
  },

  // Submit an answer
  submitAnswer: async ({
    questionId,
    playerId,
    gameId,
    selectedOption,
    responseTimeMs,
    timeLimitMs,
  }: {
    questionId: string;
    playerId: string;
    gameId: string;
    selectedOption: number;
    responseTimeMs: number;
    timeLimitMs: number;
  }) => {
    try {
      const { data, error } = await submitAnswer({
        questionId,
        playerId,
        gameId,
        selectedOption,
        responseTimeMs,
        timeLimitMs,
      });

      if (error) {
        throw new Error(error.message || "Failed to submit answer");
      }

      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to submit answer"
      );
    }
  },

  // Advance to next turn
  advanceTurn: async ({
    gameId,
    currentPlayerIndex,
    totalPlayers,
  }: {
    gameId: string;
    currentPlayerIndex: number;
    totalPlayers: number;
  }) => {
    try {
      const nextTurn = (currentPlayerIndex + 1) % totalPlayers;
      await updateGameTurn(gameId, nextTurn);
      return { nextTurn };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to advance turn"
      );
    }
  },

  // Leave the game
  leaveGame: async ({
    gameId,
    playerId,
  }: {
    gameId: string;
    playerId: string;
  }) => {
    try {
      await setPlayerInactive(gameId, playerId);
      return { success: true };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to leave game"
      );
    }
  },

  // Complete the game by updating status to completed
  completeGame: async ({ gameId }: { gameId: string }) => {
    try {
      const { error } = await updateGameStatus(gameId, "completed");
      if (error) {
        throw new Error(`Failed to complete game: ${error.message}`);
      }
      return { success: true };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to complete game"
      );
    }
  },

  // Calculate the winner based on scores
  calculateWinner: async ({ game }: { game: GameWithPlayers }) => {
    try {
      // Sort players by score (descending) and get the winner
      const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
      const winner = sortedPlayers[0];

      if (!winner) {
        throw new Error("No players found in game");
      }

      return {
        playerId: winner.player_id,
        user_name: winner.profile.user_name || winner.profile.name,
        score: winner.score,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to calculate winner"
      );
    }
  },
};
