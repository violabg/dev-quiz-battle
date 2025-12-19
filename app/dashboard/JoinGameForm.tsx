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

const joinGameSchema = z.object({
  gameCode: z
    .string()
    .length(6, "Il codice deve essere di 6 caratteri")
    .regex(/^[A-Z0-9]{6}$/, "Codice non valido"),
});
type JoinGameForm = z.infer<typeof joinGameSchema>;

export const JoinGameForm = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const joinGame = useMutation(api.mutations.games.joinGame);

  const form = useForm<JoinGameForm>({
    resolver: zodResolver(joinGameSchema),
    defaultValues: { gameCode: "" },
    mode: "onChange",
  });
  const { handleSubmit } = form;

  const handleJoinGame = async (values: JoinGameForm) => {
    if (!values.gameCode) return;
    setLoading(true);
    try {
      await joinGame({ code: values.gameCode });
      router.push(`/game/${values.gameCode}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("not found")) {
        toast.error("Game not found", {
          description: "Please check the code and try again",
        });
      } else if (errorMessage.includes("already started")) {
        toast.error("Game has already started", {
          description: "You cannot join a game in progress",
        });
      } else if (errorMessage.includes("full")) {
        toast.error("Game is full", {
          description: "Maximum number of players reached",
        });
      } else {
        toast.error("Error", {
          description: errorMessage,
        });
      }
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
