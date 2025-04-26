import type { Answer } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/auth-helpers-nextjs";

export async function insertAnswer(
  supabase: SupabaseClient,
  answer: Partial<Answer>
) {
  const { data, error } = await supabase
    .from("answers")
    .insert(answer)
    .select()
    .single();
  if (error) throw error;
  return data as Answer;
}

export async function getAnswersForQuestion(
  supabase: SupabaseClient,
  question_id: string
) {
  const { data, error } = await supabase
    .from("answers")
    .select("*")
    .eq("question_id", question_id);
  if (error) throw error;
  return data as Answer[];
}

export async function getAnswersWithPlayerForQuestion(
  supabase: SupabaseClient,
  question_id: string
) {
  const { data, error } = await supabase
    .from("answers")
    .select(`*, player:player_id(id, username, avatar_url)`)
    .eq("question_id", question_id);
  if (error) throw error;
  return data;
}

export function subscribeToAnswers(
  supabase: SupabaseClient,
  handler: (payload: {
    eventType: string;
    new: Answer | null;
    old: Answer | null;
  }) => void
) {
  return supabase
    .channel("answers-updates")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "answers" },
      (payload) => {
        handler({
          eventType: payload.eventType,
          new: payload.new as Answer | null,
          old: payload.old as Answer | null,
        });
      }
    )
    .subscribe();
}

export function unsubscribeFromAnswers(channel: { unsubscribe: () => void }) {
  channel.unsubscribe();
}
