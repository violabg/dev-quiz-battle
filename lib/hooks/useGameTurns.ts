"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { GameWithPlayers } from "@/lib/convex-types";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

type UseGameTurnsProps = {
  game: GameWithPlayers;
  userId: Id<"users"> | undefined;
  isRoundComplete: boolean;
  resetQuestionState: () => void;
};

export const useGameTurns = ({
  game,
  userId,
  isRoundComplete,
  resetQuestionState,
}: UseGameTurnsProps) => {
  // Derive current player index directly from game state
  const currentPlayerIndex = game?.current_turn ?? 0;

  const advanceTurn = useMutation(api.mutations.games.advanceTurn);

  // Handle turn changes - only call resetQuestionState when turn changes
  useEffect(() => {
    resetQuestionState();
  }, [game?.current_turn, resetQuestionState]);

  const currentPlayer = useMemo(
    () => game?.players?.[currentPlayerIndex],
    [game?.players, currentPlayerIndex]
  );

  const isCurrentPlayersTurn = useMemo(
    () => currentPlayer?.player_id === userId,
    [currentPlayer?.player_id, userId]
  );

  const nextPlayerIndex = useMemo(
    () =>
      game?.players?.length
        ? (currentPlayerIndex + 1) % game.players.length
        : 0,
    [currentPlayerIndex, game?.players?.length]
  );

  const isNextPlayersTurn = useMemo(
    () => game?.players?.[nextPlayerIndex]?.player_id === userId,
    [game?.players, nextPlayerIndex, userId]
  );

  const handleNextTurn = useCallback(async (): Promise<void> => {
    if (isRoundComplete || !game) return;
    try {
      const newNextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
      await advanceTurn({
        game_id: game._id,
        new_turn_index: newNextPlayerIndex,
      });
      // The useEffect watching game.current_turn will handle resetting state.
    } catch {
      toast.error("Errore", {
        description: "Impossibile passare al turno successivo",
      });
    }
  }, [isRoundComplete, currentPlayerIndex, game, advanceTurn]);

  return {
    currentPlayerIndex,
    currentPlayer,
    isCurrentPlayersTurn,
    nextPlayerIndex,
    isNextPlayersTurn,
    handleNextTurn,
  };
};
