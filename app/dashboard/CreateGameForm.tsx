"use client";

import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
  const {
    handleSubmit,
    formState: { errors },
  } = form;

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
    <>
      <CardContent>
        <form
          onSubmit={handleSubmit(handleCreateGame)}
          className="space-y-4"
          autoComplete="off"
        >
          <Controller
            name="maxPlayers"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="maxPlayers">
                  Numero massimo di giocatori
                </FieldLabel>
                <Input
                  id="maxPlayers"
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  disabled={loading}
                  className="glass-card"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                {fieldState.invalid && (
                  <FieldError
                    errors={errors.maxPlayers ? [errors.maxPlayers] : []}
                  />
                )}
              </Field>
            )}
          />

          <Controller
            name="timeLimit"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="timeLimit">
                  Tempo limite per domanda (secondi)
                </FieldLabel>
                <Input
                  id="timeLimit"
                  type="number"
                  min={30}
                  max={300}
                  disabled={loading}
                  className="glass-card"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                {fieldState.invalid && (
                  <FieldError
                    errors={errors.timeLimit ? [errors.timeLimit] : []}
                  />
                )}
              </Field>
            )}
          />
        </form>
      </CardContent>
      <CardFooter>
        <Button
          disabled={loading}
          className="w-full"
          onClick={handleSubmit(handleCreateGame)}
        >
          {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
          Crea partita
        </Button>
      </CardFooter>
    </>
  );
};
