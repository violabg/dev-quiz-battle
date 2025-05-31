"use client";

import { GameLobby } from "@/components/game/game-lobby";
import { GameRoom } from "@/components/game/game-room";
import { Button } from "@/components/ui/button";
import {
  GameMachineProvider,
  useGameMachineActorRef,
} from "@/lib/context/GameMachineProvider";
import {
  useGameData,
  useHasError,
  useIsInLobby,
  useIsLoading,
} from "@/lib/hooks/useGameSelectors";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function GameContent({ code, user }: { code: string; user: User }) {
  const actorRef = useGameMachineActorRef();
  const router = useRouter();

  // Initialize the machine when user and gameCode are available
  useEffect(() => {
    if (user && code) {
      actorRef.send({ type: "INITIALIZE", gameCode: code, user });
    }
  }, [user, code, actorRef]);

  // Use selectors to prevent unnecessary re-renders
  const game = useGameData(actorRef);
  const isLoading = useIsLoading(actorRef);
  const isInLobby = useIsInLobby(actorRef);
  const hasError = useHasError(actorRef);

  const handleStartGame = () => actorRef.send({ type: "START_GAME" });
  const handleLeaveGame = () => actorRef.send({ type: "LEAVE_GAME" });

  if (isLoading) {
    return (
      <main className="flex flex-1 justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </main>
    );
  }

  if (hasError || !game) {
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
      {isInLobby ? (
        <GameLobby
          onStartGame={handleStartGame}
          onLeaveGame={handleLeaveGame}
        />
      ) : (
        <GameRoom onLeaveGame={handleLeaveGame} />
      )}
    </main>
  );
}

export function GameClientPage({ code, user }: { code: string; user: User }) {
  return (
    <GameMachineProvider>
      <GameContent code={code} user={user} />
    </GameMachineProvider>
  );
}
