import {
  getPlayersForGame,
  subscribeToGamePlayers,
  unsubscribeFromGamePlayers,
} from "@/lib/supabase-game-players";
import {
  getGameByCode,
  subscribeToGame,
  unsubscribeFromGame,
  updateGameStatus,
} from "@/lib/supabase-games";
import { getProfileById } from "@/lib/supabase-profiles";
import type { GameWithPlayers } from "@/types/supabase";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface DebugInfo {
  gameId?: string;
  gameCode?: string;
  gameStatus?: string;
  isHost?: boolean;
  hostId?: string;
  userId?: string;
  playerCount?: number;
  lastUpdate?: string;
  updatePayload?: unknown;
  lastPlayerUpdate?: string;
  gameDeleted?: boolean;
  manuallyUpdated?: boolean;
  startGameTriggered?: string;
}

export function useGameState({
  code,
  user,
  supabase,
}: {
  code: string;
  user: any;
  supabase: any;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameWithPlayers | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});

  const fetchGame = useCallback(async () => {
    if (!user) return;
    try {
      const { data: gameData } = await getGameByCode(supabase, code);
      const playersData = await getPlayersForGame(supabase, gameData.id);
      const hostData = await getProfileById(supabase, gameData.host_id);
      setIsHost(user.id === gameData.host_id);
      const gameWithPlayers = {
        ...gameData,
        players: playersData,
        host: hostData,
      } as GameWithPlayers;
      setGame(gameWithPlayers);
      setGameId(gameData.id);
      setDebugInfo({
        gameId: gameData.id,
        gameCode: gameData.code,
        gameStatus: gameData.status,
        isHost: user.id === gameData.host_id,
        hostId: gameData.host_id,
        userId: user.id,
        playerCount: playersData.length,
      });
    } catch (error) {
      console.error("Error fetching game:", error);
      toast.error("Errore", {
        description:
          "Impossibile caricare i dati della partita: " +
          (error instanceof Error ? error.message : String(error)),
      });
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [user, code, supabase, router]);

  useEffect(() => {
    if (!user) return;
    fetchGame();
  }, [user, fetchGame]);

  useEffect(() => {
    if (!user || !gameId) return;
    const gameSubscription = subscribeToGame(supabase, {
      gameId,
      onUpdate: (payload) => {
        if (payload.eventType === "DELETE") {
          setGame(null);
          setDebugInfo((prev) => ({
            ...prev,
            gameDeleted: true,
            lastUpdate: new Date().toISOString(),
          }));
          toast("La partita è stata chiusa.");
          router.push("/dashboard");
          return;
        }
        setGame((currentGame) => {
          if (!currentGame) return null;
          return { ...currentGame, ...payload.new };
        });
        setDebugInfo((prev) => ({
          ...prev,
          gameStatus: payload.new?.status,
          lastUpdate: new Date().toISOString(),
          updatePayload: payload.new,
        }));
      },
    });
    const playersSubscription = subscribeToGamePlayers(supabase, async () => {
      if (!gameId) return;
      const playersData = await getPlayersForGame(supabase, gameId);
      setGame((currentGame) => {
        if (!currentGame) return null;
        return { ...currentGame, players: playersData };
      });
      setDebugInfo((prev) => ({
        ...prev,
        playerCount: playersData.length,
        lastPlayerUpdate: new Date().toISOString(),
      }));
    });
    return () => {
      unsubscribeFromGame(gameSubscription);
      unsubscribeFromGamePlayers(playersSubscription);
    };
  }, [user, supabase, router, gameId]);

  const handleStartGame = async () => {
    if (!game || !isHost) return;
    try {
      await updateGameStatus(supabase, game.id, "active");
      setGame((currentGame) => {
        if (!currentGame) return null;
        return { ...currentGame, status: "active" };
      });
      setDebugInfo((prev) => ({
        ...prev,
        gameStatus: "active",
        manuallyUpdated: true,
        startGameTriggered: new Date().toISOString(),
      }));
    } catch (error: unknown) {
      toast.error("Errore", {
        description:
          "Impossibile avviare la partita: " +
          (error instanceof Error ? error.message : String(error)),
      });
    }
  };

  const handleLeaveGame = async () => {
    if (!game || !user) return;
    try {
      if (isHost) {
        await updateGameStatus(supabase, game.id, "completed");
      } else {
        const { error } = await supabase
          .from("game_players")
          .update({ is_active: false })
          .eq("game_id", game.id)
          .eq("player_id", user.id);
        if (error) throw error;
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

  return { loading, game, isHost, debugInfo, handleStartGame, handleLeaveGame };
}
