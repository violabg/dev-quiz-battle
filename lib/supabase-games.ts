import type { Game } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/auth-helpers-nextjs";

export async function createGame(
  supabase: SupabaseClient,
  host_id: string,
  max_players: number
) {
  const { data, error } = await supabase
    .from("games")
    .insert({ host_id, status: "waiting", max_players, code: "" })
    .select()
    .single();
  if (error) throw error;
  return { data: data as Game, error };
}

export async function getGameByCode(supabase: SupabaseClient, code: string) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();
  if (error) throw error;
  return { data: data as Game, error };
}

export const updateGameTurn = async (
  supabase: SupabaseClient,
  gameId: string,
  nextTurn: number
) => {
  const { error } = await supabase
    .from("games")
    .update({ current_turn: nextTurn })
    .eq("id", gameId);
  return { error };
};

export const updateGameStatus = async (
  supabase: SupabaseClient,
  gameId: string,
  status: "waiting" | "active" | "completed"
) => {
  const { error } = await supabase
    .from("games")
    .update({ status })
    .eq("id", gameId);
  return { error };
};

export function subscribeToGame(
  supabase: SupabaseClient,
  options: {
    gameId?: string;
    onUpdate: (payload: {
      eventType: string;
      new: Game | null;
      old: Game | null;
    }) => void;
  } = { onUpdate: () => {} } // Add default value for options
) {
  // Ensure options is defined
  if (!options) {
    options = { onUpdate: () => {} };
  }

  const channelName = options?.gameId ? `game-${options.gameId}` : "games";
  return supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "games",
        filter: options?.gameId ? `id=eq.${options.gameId}` : undefined,
      },
      (payload: {
        eventType: string;
        new: Record<string, unknown>;
        old: Record<string, unknown>;
      }) => {
        options?.onUpdate?.({
          eventType: payload.eventType,
          new: payload.new as Game | null,
          old: payload.old as Game | null,
        });
      }
    )
    .subscribe();
}

export function unsubscribeFromGame(channel: { unsubscribe: () => void }) {
  channel.unsubscribe();
}
