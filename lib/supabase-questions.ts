import type { Question } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/auth-helpers-nextjs";

export async function getQuestionsForGame(
  supabase: SupabaseClient,
  game_id: string
) {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("game_id", game_id);
  if (error) throw error;
  return data as Question[];
}

export async function getQuestionById(
  supabase: SupabaseClient,
  question_id: string
) {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", question_id)
    .single();
  if (error) throw error;
  return data as Question;
}

export async function insertQuestion(
  supabase: SupabaseClient,
  question: Partial<Question>
) {
  const { data, error } = await supabase
    .from("questions")
    .insert(question)
    .select()
    .single();
  if (error) throw error;
  return data as Question;
}

export async function updateQuestion(
  supabase: SupabaseClient,
  questionId: string,
  update: Partial<Question>
) {
  const { error } = await supabase
    .from("questions")
    .update(update)
    .eq("id", questionId);
  if (error) throw error;
  return true;
}

export async function getQuestionsByLanguageAndDifficulty(
  supabase: SupabaseClient,
  language: string,
  difficulty: string,
  since?: string
) {
  let query = supabase
    .from("questions")
    .select("*")
    .eq("language", language)
    .eq("difficulty", difficulty);
  if (since) {
    query = query.gte("created_at", since);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as Question[];
}

export function subscribeToQuestions(
  supabase: SupabaseClient,
  handler: (payload: {
    eventType: string;
    new: Question | null;
    old: Question | null;
  }) => void
) {
  return supabase
    .channel("questions-updates")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "questions" },
      (payload) => {
        handler({
          eventType: payload.eventType,
          new: payload.new as Question | null,
          old: payload.old as Question | null,
        });
      }
    )
    .subscribe();
}

export function unsubscribeFromQuestions(channel: { unsubscribe: () => void }) {
  channel.unsubscribe();
}
