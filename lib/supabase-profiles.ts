import type {
  GetUserProfileWithScoreArgs,
  GetUserProfileWithScoreReturn,
  Profile,
} from "@/types/supabase";
import * as crypto from "crypto";
import { createClient } from "./supabase/client";

export async function getProfileById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function getProfileByUsername(username: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function createProfile(id: string, username: string) {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").insert({ id, username });
  if (error) throw error;
  return true;
}

export async function ensureUserProfile(user: {
  id: string;
  email?: string | null;
}): Promise<boolean> {
  if (!user) return false;
  let profile: Profile | null = null;
  try {
    profile = await getProfileById(user.id);
  } catch (e: unknown) {
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      typeof (e as { code?: string }).code === "string" &&
      (e as { code: string }).code !== "PGRST116"
    ) {
      return false;
    }
  }
  if (!profile) {
    const username =
      user.email?.split("@")[0] ||
      `user_${crypto.randomBytes(6).toString("base64url").substring(0, 6)}`;
    try {
      await createProfile(user.id, username);
    } catch {
      return false;
    }
  }
  return true;
}

export async function getProfileWithScore(userId: string) {
  const supabase = createClient();
  // Use Supabase RPC to get leaderboard players (summed score, unique per player, paginated)
  const { data, error } = await supabase.rpc("get_user_profile_with_score", {
    user_id: userId,
  } as GetUserProfileWithScoreArgs);
  if (error) throw error;
  return data[0] as GetUserProfileWithScoreReturn;
}

export function subscribeToProfiles(
  handler: (payload: {
    eventType: string;
    new: Profile | null;
    old: Profile | null;
  }) => void
) {
  const supabase = createClient();
  return supabase
    .channel("profiles-updates")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles" },
      (payload) => {
        handler({
          eventType: payload.eventType,
          new: payload.new as Profile | null,
          old: payload.old as Profile | null,
        });
      }
    )
    .subscribe();
}

export function unsubscribeFromProfiles(channel: { unsubscribe: () => void }) {
  channel.unsubscribe();
}
