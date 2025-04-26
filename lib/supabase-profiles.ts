import type { Profile } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/auth-helpers-nextjs";

export async function getProfileById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function getProfileByUsername(
  supabase: SupabaseClient,
  username: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function createProfile(
  supabase: SupabaseClient,
  id: string,
  username: string
) {
  const { error } = await supabase.from("profiles").insert({ id, username });
  if (error) throw error;
  return true;
}

export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null }
): Promise<boolean> {
  if (!user) return false;
  let profile: Profile | null = null;
  try {
    profile = await getProfileById(supabase, user.id);
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
      `user_${Math.random().toString(36).substring(2, 8)}`;
    try {
      await createProfile(supabase, user.id, username);
    } catch {
      return false;
    }
  }
  return true;
}

export function subscribeToProfiles(
  supabase: SupabaseClient,
  handler: (payload: {
    eventType: string;
    new: Profile | null;
    old: Profile | null;
  }) => void
) {
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
