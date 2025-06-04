"use client";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  addPlayerToGame,
  getPlayerInGame,
  getPlayersForGame,
} from "@/lib/supabase/supabase-game-players";
import { getGameByCode } from "@/lib/supabase/supabase-games";
import { ensureUserProfile } from "@/lib/supabase/supabase-profiles";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const joinGameSchema = z.object({
  gameCode: z
    .string()
    .length(6, "Il codice deve essere di 6 caratteri")
    .regex(/^[A-Z0-9]{6}$/, "Codice non valido"),
});
type JoinGameForm = z.infer<typeof joinGameSchema>;

export const JoinGameForm = ({ user }: { user: User }) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const form = useForm<JoinGameForm>({
    resolver: zodResolver(joinGameSchema),
    defaultValues: { gameCode: "" },
    mode: "onChange",
  });
  const { handleSubmit } = form;

  const handleJoinGame = async (values: JoinGameForm) => {
    if (!user || !values.gameCode) return;
    setLoading(true);
    try {
      const profileExists = await ensureUserProfile(user);
      if (!profileExists) return;
      const { data: game, error: gameError } = await getGameByCode(
        values.gameCode
      );
      if (gameError) throw new Error("Game not found");
      if (game.status !== "waiting") {
        throw new Error("Game has already started");
      }
      const existingPlayer = await getPlayerInGame(game.id, user.id);
      if (existingPlayer) {
        router.push(`/game/${values.gameCode}`);
        return;
      }
      const players = await getPlayersForGame(game.id);
      if (players.length >= game.max_players) {
        throw new Error("Game is full");
      }
      await addPlayerToGame(game.id, user.id, players.length + 1);
      router.push(`/game/${values.gameCode}`);
    } catch (error: unknown) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(handleJoinGame)}
        className="space-y-4"
        autoComplete="off"
      >
        <FormField
          name="gameCode"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codice partita</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
            disabled={loading || !form.formState.isValid}
            className="w-full"
          >
            {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
            Unisciti
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
};
