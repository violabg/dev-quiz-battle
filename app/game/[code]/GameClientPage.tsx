"use client";

import { GameLobby } from "@/components/game/game-lobby";
import { GameRoom } from "@/components/game/game-room";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useGameState } from "@/lib/hooks/useGameState";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function GameClientPage({ code }: { code: string }) {
  const currentUser = useQuery(api.queries.auth.currentUser);
  const { loadingState, game, isHost, handleStartGame, handleLeaveGame } =
    useGameState({ code });
  const router = useRouter();

  // Wait for user to load
  if (currentUser === undefined || loadingState === "initializing") {
    return (
      <main className="flex flex-1 justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </main>
    );
  }

  if (!currentUser) {
    router.push("/auth/login");
    return null;
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
          loadingState={loadingState}
        />
      ) : (
        <GameRoom
          game={game}
          userId={currentUser._id}
          onLeaveGame={handleLeaveGame}
        />
      )}
    </main>
  );
}
