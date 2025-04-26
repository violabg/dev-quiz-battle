import type { Database, Game } from "@/types/supabase";
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

export const subscribeToGameUpdates = (
  supabase: SupabaseClient<Database>,
  gameId: string,
  onUpdate: (payload: {
    new: {
      current_turn?: number;
      status?: string;
    };
  }) => void
) => {
  return supabase
    .channel("game_updates")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${gameId}`,
      },
      onUpdate
    )
    .subscribe();
};

export function subscribeToGame(
  supabase: SupabaseClient,
  gameId: string | undefined,
  handler: (payload: {
    eventType: string;
    new: Game | null;
    old: Game | null;
  }) => void
) {
  return supabase
    .channel("game-updates")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "games",
        filter: gameId ? `id=eq.${gameId}` : undefined,
      },
      (payload) => {
        handler({
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

export function subscribeToGames(
  supabase: SupabaseClient,
  handler: (payload: {
    eventType: string;
    new: Game | null;
    old: Game | null;
  }) => void
) {
  return supabase
    .channel("games-updates")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "games" },
      (payload) => {
        handler({
          eventType: payload.eventType,
          new: payload.new as Game | null,
          old: payload.old as Game | null,
        });
      }
    )
    .subscribe();
}

export function unsubscribeFromGames(channel: { unsubscribe: () => void }) {
  channel.unsubscribe();
}
