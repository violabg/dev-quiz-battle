import type {
  Answer,
  CalculateScoreArgs,
  CalculateScoreReturn,
} from "@/lib/supabase/types";
import { QueryData } from "@supabase/supabase-js";
import { createClient } from "./client";

const supabase = createClient();

export async function insertAnswer(answer: Answer) {
  const { data, error } = await supabase
    .from("answers")
    .insert(answer)
    .select()
    .single();
  if (error) throw error;
  return data as Answer;
}

export async function getAnswersForQuestion(question_id: string) {
  const { data, error } = await supabase
    .from("answers")
    .select("*")
    .eq("question_id", question_id);
  if (error) throw error;
  return data as Answer[];
}

const query = (question_id: string) => {
  return supabase
    .from("answers")
    .select(`*, player:player_id(id, user_name, avatar_url)`)
    .eq("question_id", question_id);
};

export async function getAnswersWithPlayerForQuestion(question_id: string) {
  const { data, error } = await query(question_id);
  if (error) throw error;
  return data;
}

export type AnswersWithPlayer = QueryData<ReturnType<typeof query>>;

export function subscribeToAnswers(
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
  args: CalculateScoreArgs
): Promise<{ data: CalculateScoreReturn | null; error: unknown }> => {
  const { data, error } = await supabase.rpc("calculate_score", args);
  return { data, error };
};

// New submitAnswer: all logic is server-side, only pass minimal info
export const submitAnswer = async (params: {
  questionId: string;
  playerId: string;
  gameId: string;
  selectedOption: number;
  responseTimeMs: number;
  timeLimitMs: number;
}) => {
  const { data, error } = await supabase.rpc("submit_answer", {
    p_question_id: params.questionId,
    p_player_id: params.playerId,
    p_game_id: params.gameId,
    p_selected_option: params.selectedOption,
    p_response_time_ms: params.responseTimeMs,
    p_time_limit_ms: params.timeLimitMs,
  });

  return { data, error };
};
