"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
import {
  addPlayerToGame,
  getPlayerInGame,
  getPlayersForGame,
} from "@/lib/supabase-game-players";
import { createGame, getGameByCode } from "@/lib/supabase-games";
import { ensureUserProfile } from "@/lib/supabase-profiles";
import { useSupabase } from "@/lib/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const createGameSchema = z.object({
  maxPlayers: z.coerce.number().min(2, "Minimo 2 giocatori"),
  timeLimit: z.coerce
    .number()
    .min(30, "Minimo 30 secondi")
    .max(300, "Massimo 300 secondi"),
});
type CreateGameForm = z.infer<typeof createGameSchema>;

const joinGameSchema = z.object({
  gameCode: z
    .string()
    .length(6, "Il codice deve essere di 6 caratteri")
    .regex(/^[A-Z0-9]{6}$/, "Codice non valido"),
});
type JoinGameForm = z.infer<typeof joinGameSchema>;

export default function DashboardPage() {
  const { user, supabase, loading: authLoading } = useSupabase();
  const router = useRouter();
  // const [gameCode, setGameCode] = useState("");
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateGameForm>({
    resolver: zodResolver(createGameSchema),
    defaultValues: { maxPlayers: 4, timeLimit: 120 },
    mode: "onChange",
  });
  const { handleSubmit } = form;

  const joinForm = useForm<JoinGameForm>({
    resolver: zodResolver(joinGameSchema),
    defaultValues: { gameCode: "" },
    mode: "onChange",
  });
  const { handleSubmit: handleJoinSubmit } = joinForm;

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  // Modify the handleCreateGame function to ensure profile exists first
  const handleCreateGame = async (values: CreateGameForm) => {
    if (!user) return;
    setLoading(true);
    try {
      // Ensure user profile exists
      const profileExists = await ensureUserProfile(supabase, user);
      if (!profileExists) return;
      // Pass timeLimit to createGame
      const { data, error } = await createGame(
        supabase,
        user.id,
        values.maxPlayers,
        values.timeLimit
      );
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
  const handleJoinGame = async (values: JoinGameForm) => {
    if (!user || !values.gameCode) return;
    setLoading(true);
    try {
      // Ensure user profile exists
      const profileExists = await ensureUserProfile(supabase, user);
      if (!profileExists) return;
      // Find the game by code
      const { data: game, error: gameError } = await getGameByCode(
        supabase,
        values.gameCode
      );
      if (gameError) throw new Error("Game not found");
      if (game.status !== "waiting") {
        throw new Error("Game has already started");
      }
      // Check if player is already in the game
      const existingPlayer = await getPlayerInGame(supabase, game.id, user.id);
      if (existingPlayer) {
        router.push(`/game/${values.gameCode}`);
        return;
      }
      // Count current players to determine turn order
      const players = await getPlayersForGame(supabase, game.id);
      if (players.length >= game.max_players) {
        throw new Error("Game is full");
      }
      // Add player to the game with the next turn order
      await addPlayerToGame(supabase, game.id, user.id, players.length + 1);
      router.push(`/game/${values.gameCode}`);
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
      <main className="flex flex-1 justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </main>
    );
  }

  return (
    <main className="flex-1 py-8 container">
      <h1 className="mb-8 font-bold text-3xl">
        <span className="text-gradient">Dashboard</span>
      </h1>

      <div className="gap-8 grid md:grid-cols-2">
        <Card className="gradient-border glass-card">
          <CardHeader>
            <CardTitle>Crea una nuova partita</CardTitle>
            <CardDescription>
              Imposta una nuova sfida di quiz di programmazione
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={handleSubmit(handleCreateGame)}
                className="space-y-4"
                autoComplete="off"
              >
                <FormField
                  name="maxPlayers"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero massimo di giocatori</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={2}
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="timeLimit"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo limite per domanda (secondi)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={30}
                          max={300}
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <CardFooter className="p-0 pt-4">
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    ) : null}
                    Crea partita
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="gradient-border glass-card">
          <CardHeader>
            <CardTitle>Unisciti a una partita</CardTitle>
            <CardDescription>
              Inserisci un codice partita per unirti a una partita esistente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...joinForm}>
              <form
                onSubmit={handleJoinSubmit(handleJoinGame)}
                className="space-y-4"
                autoComplete="off"
              >
                <FormField
                  name="gameCode"
                  control={joinForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice partita</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <CardFooter className="p-0 pt-4">
                  <Button
                    type="submit"
                    disabled={loading || !joinForm.formState.isValid}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    ) : null}
                    Unisciti
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
