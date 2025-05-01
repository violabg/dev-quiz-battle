import type {
  GetLeaderboardPlayersArgs,
  GetLeaderboardPlayersReturn,
  Player,
  Profile,
} from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./client";

export async function addPlayerToGame(
  game_id: string,
  player_id: string,
  turn_order: number
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("game_players")
    .insert({ game_id, player_id, turn_order });
  if (error) throw error;
  return true;
}

export async function getPlayersForGame(game_id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("game_players")
    .select("*, profile:player_id(id, name, full_name, user_name, avatar_url)")
    .eq("game_id", game_id)
    .order("turn_order", { ascending: true });
  if (error) throw error;
  return data as (Player & { profile: Profile })[];
}

export async function getPlayerInGame(game_id: string, player_id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_id", game_id)
    .eq("player_id", player_id)
    .maybeSingle();
  if (error) throw error;
  return data as Player | null;
}

export async function getLeaderboardPlayers(
  supabase: SupabaseClient,
  offset: number,
  limit: number
) {
  // Use Supabase RPC to get leaderboard players (summed score, unique per player, paginated)
  const { data, error } = await supabase.rpc("get_leaderboard_players", {
    offset_value: offset,
    limit_value: limit,
  } as GetLeaderboardPlayersArgs);
  if (error) throw error;
  return (data || []) as GetLeaderboardPlayersReturn[];
}

export function subscribeToGamePlayers(
  handler: (payload: {
    eventType: string;
    new: Player | null;
    old: Player | null;
  }) => void
) {
  const supabase = createClient();
  return supabase
    .channel("game-players-updates")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_players" },
      (payload) => {
        handler({
          eventType: payload.eventType,
          new: payload.new as Player | null,
          old: payload.old as Player | null,
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
  const supabase = createClient();
  const { error } = await supabase
    .from("game_players")
    .update({ is_active: false })
    .eq("game_id", game_id)
    .eq("player_id", player_id);
  if (error) throw error;
  return true;
}
