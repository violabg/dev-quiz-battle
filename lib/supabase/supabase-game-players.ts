import type { GamePlayer, Profile } from "@/lib/supabase/types";
import { createClient } from "./client";

const supabase = createClient();

export async function addPlayerToGame(
  game_id: string,
  player_id: string,
  turn_order: number
) {
  const { error } = await supabase
    .from("game_players")
    .insert({ game_id, player_id, turn_order });
  if (error) throw error;
  return true;
}

export async function getPlayersForGame(game_id: string) {
  const { data, error } = await supabase
    .from("game_players")
    .select("*, profile:player_id(id, name, full_name, user_name, avatar_url)")
    .eq("game_id", game_id)
    .order("turn_order", { ascending: true });
  if (error) throw error;
  return data as (GamePlayer & { profile: Profile })[];
}

export async function getPlayerInGame(game_id: string, player_id: string) {
  const { data, error } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_id", game_id)
    .eq("player_id", player_id)
    .maybeSingle();
  if (error) throw error;
  return data as GamePlayer | null;
}

export async function getLeaderboardPlayers(
  offset: number,
  limit: number,
  languageFilter?: string
) {
  // Use Supabase RPC to get leaderboard players (overall or by language)
  const { data, error } = await supabase.rpc("get_leaderboard_players", {
    offset_value: offset,
    limit_value: limit,
    language_filter: languageFilter,
  });
  if (error) throw error;
  return data;
}

export function subscribeToGamePlayers(
  handler: (payload: {
    eventType: string;
    new: GamePlayer | null;
    old: GamePlayer | null;
  }) => void
) {
  return supabase
    .channel("game-players-updates")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_players" },
      (payload) => {
        handler({
          eventType: payload.eventType,
          new: payload.new as GamePlayer | null,
          old: payload.old as GamePlayer | null,
        });
      }
    )
    .subscribe();
}

export function unsubscribeFromGamePlayers(channel: {
  unsubscribe: () => void;
}) {
  channel.unsubscribe();
}

export async function setPlayerInactive(game_id: string, player_id: string) {
  const { error } = await supabase
    .from("game_players")
    .update({ is_active: false })
    .eq("game_id", game_id)
    .eq("player_id", player_id);
  if (error) throw error;
  return true;
}
