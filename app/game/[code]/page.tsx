"use client";

import { GameLobby } from "@/components/game/game-lobby";
import { GameRoom } from "@/components/game/game-room";
import { Button } from "@/components/ui/button";
import { useGameState } from "@/lib/hooks/useGameState";
import { useSupabase } from "@/lib/supabase-provider";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use } from "react";

export default function GamePage(props: { params: Promise<{ code: string }> }) {
  const params = use(props.params);
  const { code } = params;
  const { user, supabase, loading: authLoading } = useSupabase();
  const { loading, game, isHost, handleStartGame, handleLeaveGame } =
    useGameState({ code, user, supabase });
  const router = useRouter();

  // Redirect to login if not authenticated
  if (loading || authLoading) {
    return (
      <main className="flex flex-1 justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </main>
    );
  }

  if (!game) {
    return (
      <main className="flex flex-col flex-1 justify-center items-center py-8 container">
        <h1 className="mb-4 font-bold text-2xl">Partita non trovata</h1>
        <Button onClick={() => router.push("/dashboard")}>
          Torna alla Dashboard
        </Button>
      </main>
    );
  }

  return (
    <>
      {game && (
        <main className="flex-1 py-8 container">
          {game.status === "waiting" ? (
            <GameLobby
              game={game}
              isHost={isHost}
              onStartGame={handleStartGame}
              onLeaveGame={handleLeaveGame}
            />
          ) : (
            <GameRoom game={game} onLeaveGame={handleLeaveGame} />
          )}
        </main>
      )}
    </>
  );
}
