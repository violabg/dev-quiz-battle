import type { Question } from "@/types/supabase";
import { createClient } from "./supabase/server";

export async function getQuestionsForGame(game_id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("game_id", game_id);
  if (error) throw error;
  return data as Question[];
}

export async function getQuestionById(question_id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", question_id)
    .single();
  if (error) throw error;
  return data as Question;
}

export async function insertQuestion(question: Partial<Question>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .insert(question)
    .select()
    .single();
  if (error) throw error;
  return data as Question;
}

export async function updateQuestion(
  questionId: string,
  update: Partial<Question>
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("questions")
    .update(update)
    .eq("id", questionId);
  if (error) throw error;
  return true;
}

export async function getQuestionsByLanguageAndDifficulty(
  language: string,
  difficulty: string,
  since?: string
) {
  const supabase = await createClient();
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

export async function subscribeToQuestions(
  handler: (payload: {
    eventType: string;
    new: Question | null;
    old: Question | null;
  }) => void
) {
  const supabase = await createClient();
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
