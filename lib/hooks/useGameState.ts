import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type LoadingState = "idle" | "initializing" | "starting";

export function useGameState({ code }: { code: string }) {
  const router = useRouter();
  const [loadingState, setLoadingState] =
    useState<LoadingState>("initializing");

  // Convex auto-subscribes to changes with useQuery
  const game = useQuery(api.games.getGameByCode, { code });
  const updateGame = useMutation(api.games.updateGame);
  const updateGamePlayer = useMutation(api.games.updateGamePlayer);

  // Get current user ID from Convex auth
  const currentUser = useQuery(api.auth.currentUser);
  const userId = currentUser?._id;

  const isHost = game?.host_id === userId;

  useEffect(() => {
    if (game !== undefined) {
      setLoadingState("idle");
    }

    // Handle game deletion (game will become null when deleted)
    if (game === null) {
      toast("La partita è stata chiusa.");
      router.push("/dashboard");
    }
  }, [game, router]);

  const handleStartGame = async () => {
    if (!game || !isHost) return;
    try {
      setLoadingState("starting");
      await updateGame({
        game_id: game._id,
        status: "active",
      });
    } catch (error: unknown) {
      toast.error("Errore", {
        description:
          "Impossibile avviare la partita: " +
          (error instanceof Error ? error.message : String(error)),
      });
    } finally {
      setLoadingState("idle");
    }
  };

  const handleLeaveGame = async () => {
    if (!game || !userId) return;
    try {
      if (isHost) {
        await updateGame({
          game_id: game._id,
          status: "completed",
        });
      } else {
        // Find current player's game_player record
        const currentPlayer = game.players?.find((p) => p.player_id === userId);
        if (currentPlayer) {
          await updateGamePlayer({
            game_player_id: currentPlayer._id,
            is_active: false,
          });
        }
      }
      router.push("/dashboard");
    } catch (error: unknown) {
      toast.error("Errore", {
        description:
          "Impossibile uscire dalla partita: " +
          (error instanceof Error ? error.message : String(error)),
      });
    }
  };

  return {
    loadingState,
    game,
    isHost,
    handleStartGame,
    handleLeaveGame,
    userId,
  };
}
