"use client";

import { GameLobby } from "@/components/game/game-lobby";
import { GameRoom } from "@/components/game/game-room";
import { Button } from "@/components/ui/button";
import { useGameState } from "@/lib/hooks/useGameState";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function GameClientPage({ code, user }: { code: string; user: User }) {
  const { loading, game, isHost, handleStartGame, handleLeaveGame } =
    useGameState({ code, user });
  const router = useRouter();

  if (loading) {
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
    <main className="flex-1 py-8 container">
      {game.status === "waiting" ? (
        <GameLobby
          game={game}
          isHost={isHost}
          onStartGame={handleStartGame}
          onLeaveGame={handleLeaveGame}
        />
      ) : (
        <GameRoom game={game} user={user} onLeaveGame={handleLeaveGame} />
      )}
    </main>
  );
}
