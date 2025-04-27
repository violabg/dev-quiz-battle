import type { Player, Profile } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/auth-helpers-nextjs";

export async function addPlayerToGame(
  supabase: SupabaseClient,
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

export async function getPlayersForGame(
  supabase: SupabaseClient,
  game_id: string
) {
  const { data, error } = await supabase
    .from("game_players")
    .select("*, profile:player_id(id, username, avatar_url)")
    .eq("game_id", game_id)
    .order("turn_order", { ascending: true });
  if (error) throw error;
  return data as (Player & { profile: Profile })[];
}

export async function getPlayerInGame(
  supabase: SupabaseClient,
  game_id: string,
  player_id: string
) {
  const { data, error } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_id", game_id)
    .eq("player_id", player_id)
    .maybeSingle();
  if (error) throw error;
  return data as Player | null;
}

export async function addScoreToPlayer(
  supabase: SupabaseClient,
  player_id: string,
  game_id: string,
  scoreToAdd: number
) {
  // Get the player row
  const { data: player, error } = await supabase
    .from("game_players")
    .select("id, score")
    .eq("player_id", player_id)
    .eq("game_id", game_id)
    .maybeSingle();
  if (error || !player) throw error || new Error("Player not found");
  // Update the score
  const { error: updateError } = await supabase
    .from("game_players")
    .update({ score: player.score + scoreToAdd })
    .eq("id", player.id);
  if (updateError) throw updateError;
  return true;
}

export function subscribeToGamePlayers(
  supabase: SupabaseClient,
  handler: (payload: {
    eventType: string;
    new: Player | null;
    old: Player | null;
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
