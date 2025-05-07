"use client";

import { updateGameTurn } from "@/lib/supabase/supabase-games";
import { GameWithPlayers } from "@/types/supabase";
import { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type UseGameTurnsProps = {
  game: GameWithPlayers;
  user: User;
  isRoundComplete: boolean;
  resetQuestionState: () => void;
};

export const useGameTurns = ({
  game,
  user,
  isRoundComplete,
  resetQuestionState,
}: UseGameTurnsProps) => {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(
    game.current_turn ?? 0
  );

  // Handle turn changes from game state
  useEffect(() => {
    if (
      typeof game?.current_turn === "number" &&
      currentPlayerIndex !== game.current_turn
    ) {
      setCurrentPlayerIndex(game.current_turn);
      resetQuestionState();
    }
  }, [game?.current_turn, currentPlayerIndex, resetQuestionState]);

  const currentPlayer = useMemo(
    () => game.players[currentPlayerIndex],
    [game.players, currentPlayerIndex]
  );

  const isCurrentPlayersTurn = useMemo(
    () => currentPlayer?.player_id === user?.id,
    [currentPlayer?.player_id, user?.id]
  );

  const nextPlayerIndex = useMemo(
    () => (currentPlayerIndex + 1) % game.players.length,
    [currentPlayerIndex, game.players.length]
  );

  const isNextPlayersTurn = useMemo(
    () => game.players[nextPlayerIndex]?.player_id === user?.id,
    [game.players, nextPlayerIndex, user?.id]
  );

  const handleNextTurn = useCallback(async (): Promise<void> => {
    if (isRoundComplete) return;
    try {
      const newNextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
      const { error } = await updateGameTurn(game.id, newNextPlayerIndex);
      if (error) throw error;
      // The useEffect watching game.current_turn will handle resetting state.
    } catch {
      toast.error("Errore", {
        description: "Impossibile passare al turno successivo",
      });
    }
  }, [isRoundComplete, currentPlayerIndex, game.id, game.players.length]);

  return {
    currentPlayerIndex,
    currentPlayer,
    isCurrentPlayersTurn,
    nextPlayerIndex,
    isNextPlayersTurn,
    handleNextTurn,
  };
};
