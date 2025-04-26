"use client";

import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GradientCard } from "@/components/ui/gradient-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addPlayerToGame,
  getPlayerInGame,
  getPlayersForGame,
} from "@/lib/supabase-game-players";
import { createGame, getGameByCode } from "@/lib/supabase-games";
import { ensureUserProfile } from "@/lib/supabase-profiles";
import { useSupabase } from "@/lib/supabase-provider";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { user, supabase, loading: authLoading } = useSupabase();
  const router = useRouter();
  const [gameCode, setGameCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [loading, setLoading] = useState(false);

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  // Modify the handleCreateGame function to ensure profile exists first
  const handleCreateGame = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Ensure user profile exists
      const profileExists = await ensureUserProfile(supabase, user);
      if (!profileExists) return;
      const { data, error } = await createGame(supabase, user.id, maxPlayers);
      if (error) throw error;
      // Add the host as the first player with turn_order 1
      await addPlayerToGame(supabase, data.id, user.id, 1);
      router.push(`/game/${data.code}`);
    } catch (error: unknown) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // Also modify the handleJoinGame function to ensure profile exists first
  const handleJoinGame = async () => {
    if (!user || !gameCode) return;
    setLoading(true);
    try {
      // Ensure user profile exists
      const profileExists = await ensureUserProfile(supabase, user);
      if (!profileExists) return;
      // Find the game by code
      const { data: game, error: gameError } = await getGameByCode(
        supabase,
        gameCode
      );
      if (gameError) throw new Error("Game not found");
      if (game.status !== "waiting") {
        throw new Error("Game has already started");
      }
      // Check if player is already in the game
      const existingPlayer = await getPlayerInGame(supabase, game.id, user.id);
      if (existingPlayer) {
        router.push(`/game/${gameCode}`);
        return;
      }
      // Count current players to determine turn order
      const players = await getPlayersForGame(supabase, game.id);
      if (players.length >= game.max_players) {
        throw new Error("Game is full");
      }
      // Add player to the game with the next turn order
      await addPlayerToGame(supabase, game.id, user.id, players.length + 1);
      router.push(`/game/${gameCode}`);
    } catch (error: unknown) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex flex-1 justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 py-8 container">
        <h1 className="mb-8 font-bold text-3xl">
          <span className="text-gradient">Dashboard</span>
        </h1>

        <div className="gap-8 grid md:grid-cols-2">
          <GradientCard>
            <CardHeader>
              <CardTitle>Crea una nuova partita</CardTitle>
              <CardDescription>
                Imposta una nuova sfida di quiz di programmazione
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="max-players">
                    Numero massimo di giocatori
                  </Label>
                  <Input
                    id="max-players"
                    type="number"
                    min={2}
                    max={8}
                    value={maxPlayers}
                    onChange={(e) =>
                      setMaxPlayers(Number.parseInt(e.target.value))
                    }
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleCreateGame}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                ) : null}
                Crea partita
              </Button>
            </CardFooter>
          </GradientCard>

          <GradientCard>
            <CardHeader>
              <CardTitle>Unisciti a una partita</CardTitle>
              <CardDescription>
                Inserisci un codice partita per unirti a una partita esistente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="game-code">Codice partita</Label>
                  <Input
                    id="game-code"
                    placeholder="Enter 6-digit code"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleJoinGame}
                disabled={loading || !gameCode}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                ) : null}
                Unisciti
              </Button>
            </CardFooter>
          </GradientCard>
        </div>
      </main>
    </div>
  );
}
