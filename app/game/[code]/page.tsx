"use client";

import { DebugPanel } from "@/components/debug-panel";
import { GameLobby } from "@/components/game/game-lobby";
import { GameRoom } from "@/components/game/game-room";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
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
import { useSupabase } from "@/lib/supabase-provider";
import type { GameWithPlayers } from "@/types/supabase";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function GamePage(props: { params: Promise<{ code: string }> }) {
  const params = use(props.params);
  const { code } = params;
  const { user, supabase, loading: authLoading } = useSupabase();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameWithPlayers | null>(null);
  const [isHost, setIsHost] = useState(false);
  // Definisci un tipo per debugInfo per evitare any
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
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const fetchGame = useCallback(async () => {
    if (!user) return;
    try {
      // Get game data
      const { data: gameData } = await getGameByCode(supabase, code);
      // Get players in the game
      const playersData = await getPlayersForGame(supabase, gameData.id);
      // Get host profile
      const hostData = await getProfileById(supabase, gameData.host_id);
      setIsHost(user.id === gameData.host_id);
      // Combine data
      const gameWithPlayers = {
        ...gameData,
        players: playersData,
        host: hostData,
      } as GameWithPlayers;
      setGame(gameWithPlayers);
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
      // error: unknown
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

    // Set up real-time subscription for game updates (INSERT, UPDATE, DELETE)
    const gameSubscription = subscribeToGame(supabase, game?.id, (payload) => {
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
    });

    // Set up real-time subscription for player updates (INSERT, UPDATE, DELETE)
    const playersSubscription = subscribeToGamePlayers(supabase, async () => {
      if (!game?.id) return;
      const playersData = await getPlayersForGame(supabase, game.id);
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
      console.log("Unsubscribing from channels");
      unsubscribeFromGame(gameSubscription);
      unsubscribeFromGamePlayers(playersSubscription);
    };
  }, [user, code, supabase, router, game?.id, fetchGame]);

  const handleStartGame = async () => {
    if (!game || !isHost) return;
    try {
      // Update the game status to "active"
      await updateGameStatus(supabase, game.id, "active");
      // Log success for debugging
      console.log("Game started successfully, status updated to active");
      // Manually update the local game state as a fallback
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
      console.error("Error in handleStartGame:", error);
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
        // If host leaves, end the game
        await updateGameStatus(supabase, game.id, "completed");
      } else {
        // If player leaves, remove them from the game
        // (remains as direct call or can be moved to a helper if desired)
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

  if (loading || authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex flex-1 justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </main>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex flex-col flex-1 justify-center items-center py-8 container">
          <h1 className="mb-4 font-bold text-2xl">Partita non trovata</h1>
          <Button onClick={() => router.push("/dashboard")}>
            Torna alla Dashboard
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 py-8 container">
        {/* Mostra GameRoom se la partita è attiva, anche se non c'è ancora una domanda */}
        {game.status === "waiting" ? (
          <GameLobby
            game={game}
            isHost={isHost}
            onStartGame={handleStartGame}
            onLeaveGame={handleLeaveGame}
          />
        ) : (
          <GameRoom game={game} isHost={isHost} onLeaveGame={handleLeaveGame} />
        )}
        {/* Debug panel - only visible in development */}
        {process.env.NODE_ENV !== "production" && (
          <DebugPanel
            data={debugInfo}
            title={`Game Debug Info (Status: ${game.status})`}
          />
        )}
      </main>
    </div>
  );
}
