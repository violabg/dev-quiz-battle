import {
  getPlayersForGame,
  setPlayerInactive,
  subscribeToGamePlayers,
  unsubscribeFromGamePlayers,
} from "@/lib/supabase/supabase-game-players";
import {
  getGameByCode,
  subscribeToGame,
  unsubscribeFromGame,
  updateGameStatus,
} from "@/lib/supabase/supabase-games";
import { getProfileById } from "@/lib/supabase/supabase-profiles";
import type { GameWithPlayers } from "@/lib/supabase/types";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "../supabase/client";

const supabase = createClient();
type LoadingState = "idle" | "initializing" | "starting";

export function useGameState({
  code,
  user,
}: {
  code: string;
  user: User | null;
}) {
  const router = useRouter();
  const [loadingState, setLoadingState] =
    useState<LoadingState>("initializing");
  const [game, setGame] = useState<GameWithPlayers | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const fetchGame = useCallback(async () => {
    if (!user) return;
    try {
      const { data: gameData } = await getGameByCode(supabase, code);
      const playersData = await getPlayersForGame(gameData.id);
      const hostData = gameData.host_id
        ? await getProfileById(gameData.host_id)
        : null;
      setIsHost(user.id === gameData.host_id);
      const gameWithPlayers = {
        ...gameData,
        players: playersData,
        host: hostData,
      } as GameWithPlayers;
      setGame(gameWithPlayers);
      setGameId(gameData.id);
    } catch (error) {
      console.error("Error fetching game:", error);
      toast.error("Errore", {
        description:
          "Impossibile caricare i dati della partita: " +
          (error instanceof Error ? error.message : String(error)),
      });
      router.push("/dashboard");
    } finally {
      setLoadingState("idle");
    }
  }, [user, code, router]);

  useEffect(() => {
    if (!user) return;
    fetchGame();
  }, [user, fetchGame]);

  useEffect(() => {
    if (!user || !gameId) return;

    const gameSubscription = subscribeToGame({
      gameId,
      onUpdate: (payload) => {
        if (payload.eventType === "DELETE") {
          setGame(null);
          toast("La partita è stata chiusa.");
          router.push("/dashboard");
          return;
        }
        setGame((currentGame) => {
          if (!currentGame) return null;
          return { ...currentGame, ...payload.new };
        });
      },
    });
    const playersSubscription = subscribeToGamePlayers(async () => {
      if (!gameId) return;
      const playersData = await getPlayersForGame(gameId);
      setGame((currentGame) => {
        if (!currentGame) return null;
        return { ...currentGame, players: playersData };
      });
    });

    return () => {
      unsubscribeFromGame(gameSubscription);
      unsubscribeFromGamePlayers(playersSubscription);
    };
  }, [user, router, gameId]);

  const handleStartGame = async () => {
    if (!game || !isHost) return;
    try {
      setLoadingState("starting");
      await updateGameStatus(game.id, "active");
      setGame((currentGame) => {
        if (!currentGame) return null;
        return { ...currentGame, status: "active" };
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
    if (!game || !user) return;
    try {
      if (isHost) {
        await updateGameStatus(game.id, "completed");
      } else {
        await setPlayerInactive(game.id, user.id);
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

  return { loadingState, game, isHost, handleStartGame, handleLeaveGame };
}
