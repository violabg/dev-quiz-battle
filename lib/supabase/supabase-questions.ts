import type { Question } from "@/lib/supabase/types";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./client";

const supabase = createClient();

export async function getQuestionsForGame(game_id: string) {
  const { data, error } = await supabase
    .from("questions")
    .select(
      `
      id,
      game_id,
      created_by_player_id,
      language,
      difficulty,
      question_text,
      code_sample,
      started_at,
      ended_at,
      options,
      explanation,
      created_at
    `
    )
    .eq("game_id", game_id);
  if (error) throw error;
  return data as Omit<Question, "correct_answer">[];
}

export async function getQuestionById(question_id: string) {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", question_id)
    .single();
  if (error) throw error;
  return data as Question;
}

export async function insertQuestion(
  _supabase: SupabaseClient,
  question: Partial<Question>
) {
  const { data, error } = await _supabase
    .from("questions")
    .insert(question)
    .select(
      `
      id,
      game_id,
      created_by_player_id,
      language,
      difficulty,
      question_text,
      code_sample,
      started_at,
      ended_at,
      options,
      explanation,
      created_at
    `
    )
    .single();
  if (error) throw error;
  return data as Question;
}

export async function updateQuestion(
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
