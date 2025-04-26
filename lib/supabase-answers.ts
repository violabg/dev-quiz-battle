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

export const calculateScore = async (
  supabase: SupabaseClient,
  responseTimeMs: number
) => {
  const { data, error } = await supabase.rpc("calculate_score", {
    response_time_ms: responseTimeMs,
  });
  return { data, error };
};

export const submitAnswer = async (
  supabase: SupabaseClient,
  params: {
    questionId: string;
    playerId: string;
    gameId: string;
    selectedOption: number;
    isCorrect: boolean;
    responseTimeMs: number;
    scoreEarned: number;
  }
) => {
  const { error } = await supabase.rpc("submit_answer", {
    p_question_id: params.questionId,
    p_player_id: params.playerId,
    p_game_id: params.gameId,
    p_selected_option: params.selectedOption,
    p_is_correct: params.isCorrect,
    p_response_time_ms: params.responseTimeMs,
    p_score_earned: params.scoreEarned,
  });
  return { error };
};
