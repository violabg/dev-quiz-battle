"use client";

import { DebugPanel } from "@/components/debug-panel";
import { GameLobby } from "@/components/game/game-lobby";
import { GameRoom } from "@/components/game/game-room";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/lib/supabase-provider";
import type { GameWithPlayers } from "@/types/supabase";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function GamePage({ params }: { params: { code: string } }) {
  const { code } = params;
  const { user, supabase, loading: authLoading } = useSupabase();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameWithPlayers | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});

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
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .select("*")
        .eq("code", code.toUpperCase())
        .single();

      if (gameError) throw gameError;

      // Get players in the game
      const { data: playersData, error: playersError } = await supabase
        .from("game_players")
        .select(
          `
          *,
          profile:player_id(id, username, avatar_url)
        `
        )
        .eq("game_id", gameData.id)
        .order("turn_order", { ascending: true });

      if (playersError) throw playersError;

      // Get host profile
      const { data: hostData, error: hostError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", gameData.host_id)
        .single();

      if (hostError) throw hostError;

      // Check if current user is the host
      setIsHost(user.id === gameData.host_id);

      // Combine data
      const gameWithPlayers = {
        ...gameData,
        players: playersData,
        host: hostData,
      } as GameWithPlayers;

      setGame(gameWithPlayers);

      // Update debug info
      setDebugInfo({
        gameId: gameData.id,
        gameCode: gameData.code,
        gameStatus: gameData.status,
        isHost: user.id === gameData.host_id,
        hostId: gameData.host_id,
        userId: user.id,
        playerCount: playersData.length,
      });
    } catch (error: any) {
      console.error("Error fetching game:", error);
      toast.error("Error", {
        description: "Failed to load game data: " + error.message,
      });
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [user, code, supabase, router]);

  useEffect(() => {
    if (!user) return;

    fetchGame();

    // Set up real-time subscription for game updates
    const gameSubscription = supabase
      .channel("game-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `code=eq.${code.toUpperCase()}`,
        },
        (payload) => {
          console.log("Game update received:", payload.new);
          setGame((currentGame) => {
            if (!currentGame) return null;
            return { ...currentGame, ...payload.new };
          });

          // Update debug info
          setDebugInfo((prev) => ({
            ...prev,
            gameStatus: payload.new.status,
            lastUpdate: new Date().toISOString(),
            updatePayload: payload.new,
          }));
        }
      )
      .subscribe();

    // Set up real-time subscription for player updates
    const playersSubscription = supabase
      .channel("player-updates")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "game_players",
          filter: game?.id ? `game_id=eq.${game.id}` : undefined,
        },
        async () => {
          // Refetch all players when there's any change
          if (!game) return;

          const { data: playersData } = await supabase
            .from("game_players")
            .select(
              `
              *,
              profile:player_id(id, username, avatar_url)
            `
            )
            .eq("game_id", game.id)
            .order("turn_order", { ascending: true });

          if (playersData) {
            setGame((currentGame) => {
              if (!currentGame) return null;
              return { ...currentGame, players: playersData };
            });

            // Update debug info
            setDebugInfo((prev) => ({
              ...prev,
              playerCount: playersData.length,
              lastPlayerUpdate: new Date().toISOString(),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      console.log("Unsubscribing from channels");
      gameSubscription.unsubscribe();
      playersSubscription.unsubscribe();
    };
  }, [user, code, supabase, router, game?.id, fetchGame, game]);

  const handleStartGame = async () => {
    if (!game || !isHost) return;

    try {
      // Update the game status to "active"
      const { error } = await supabase
        .from("games")
        .update({ status: "active" })
        .eq("id", game.id);

      if (error) {
        console.error("Error starting game:", error);
        throw error;
      }

      // Log success for debugging
      console.log("Game started successfully, status updated to active");

      // Manually update the local game state as a fallback
      setGame((currentGame) => {
        if (!currentGame) return null;
        return { ...currentGame, status: "active" };
      });

      // Update debug info
      setDebugInfo((prev) => ({
        ...prev,
        gameStatus: "active",
        manuallyUpdated: true,
        startGameTriggered: new Date().toISOString(),
      }));
    } catch (error: any) {
      console.error("Error in handleStartGame:", error);
      toast.error("Error", {
        description: "Failed to start the game: " + error.message,
      });
    }
  };

  const handleLeaveGame = async () => {
    if (!game || !user) return;

    try {
      if (isHost) {
        // If host leaves, end the game
        const { error } = await supabase
          .from("games")
          .update({ status: "completed" })
          .eq("id", game.id);

        if (error) throw error;
      } else {
        // If player leaves, remove them from the game
        const { error } = await supabase
          .from("game_players")
          .update({ is_active: false })
          .eq("game_id", game.id)
          .eq("player_id", user.id);

        if (error) throw error;
      }

      router.push("/dashboard");
    } catch (error: any) {
      toast.error("Error", {
        description: "Failed to leave the game",
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
          <h1 className="mb-4 font-bold text-2xl">Game not found</h1>
          <Button onClick={() => router.push("/dashboard")}>
            Return to Dashboard
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 py-8 container">
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
