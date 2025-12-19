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
import { api } from "@/convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const createGameSchema = z.object({
  maxPlayers: z.coerce.number<number>().min(2, "Minimo 2 giocatori"),
  timeLimit: z.coerce
    .number<number>()
    .min(30, "Minimo 30 secondi")
    .max(300, "Massimo 300 secondi"),
});
type CreateGameForm = z.infer<typeof createGameSchema>;

export const CreateGameForm = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const createGame = useMutation(api.mutations.games.createGame);

  const form = useForm<CreateGameForm>({
    resolver: zodResolver(createGameSchema),
    defaultValues: { maxPlayers: 4, timeLimit: 120 },
    mode: "onChange",
  });
  const { handleSubmit } = form;

  const handleCreateGame = async (values: CreateGameForm) => {
    setLoading(true);
    try {
      const result = await createGame({
        max_players: values.maxPlayers,
        time_limit: values.timeLimit,
      });

      router.push(`/game/${result.code}`);
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
                <Input type="number" min={2} disabled={loading} {...field} />
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
            {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
            Crea partita
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
};
