"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GradientCard } from "@/components/ui/gradient-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabase } from "@/lib/supabase-provider";
import type { Question } from "@/types/supabase";
import { Check, Clock, X } from "lucide-react";
import { useEffect, useState } from "react";

interface QuestionDisplayProps {
  question: Question & { ended_at?: string; started_at?: string };
  onSubmitAnswer: (selectedOption: number) => void;
  winner?: { playerId: string; username: string; score: number } | null;
  allAnswers: AnswerWithPlayer[];
  timeIsUp?: boolean;
}

// Definizione globale del tipo AnswerWithPlayer
export type AnswerWithPlayer = {
  id: string;
  player_id: string;
  selected_option: number;
  is_correct: boolean;
  response_time_ms: number;
  score_earned: number;
  answered_at: string;
  player: { id: string; username: string; avatar_url?: string | null };
};

export function QuestionDisplay({
  question,
  onSubmitAnswer,
  winner,
  allAnswers,
  timeIsUp,
}: QuestionDisplayProps) {
  const { user, supabase } = useSupabase();
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("question");

  // Parse options from JSON
  const options = question.options as { text: string }[];

  // --- ANSWER UI LOGIC ---
  // Only show correct answer (green) if someone answered correctly or time is up
  // Mark wrong answers in red for everyone as soon as they are given
  // Reset answer state on new turn
  const revealCorrect = Boolean(winner) || timeIsUp;

  // Helper: get answer state for each option
  const getOptionState = (index: number) => {
    // If time is up or there is a winner, show correct answer
    if (revealCorrect && index === question.correct_answer) return "correct";
    // If this option was selected by any player and is wrong, mark as wrong
    if (allAnswers.some((a) => a.selected_option === index && !a.is_correct))
      return "wrong";
    return "default";
  };

  // Reset hasAnswered when question changes (new turn)
  useEffect(() => {
    setHasAnswered(false);
  }, [question.id]);

  useEffect(() => {
    // Use server time if available
    let timer: NodeJS.Timeout | null = null;
    if (question.started_at) {
      const start = new Date(question.started_at).getTime();
      timer = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      const startTime = Date.now();
      timer = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    // Check if user has already answered
    const checkUserAnswer = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("answers")
        .select("*")
        .eq("question_id", question.id)
        .eq("player_id", user.id)
        .maybeSingle();

      if (data) {
        setHasAnswered(true);
      }
    };

    checkUserAnswer();

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [question.id, question.started_at, supabase, user]);

  const handleSelectOption = (index: number) => {
    if (hasAnswered || winner) return;
    setHasAnswered(true);
    onSubmitAnswer(index);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeBonusLabel = (ms: number) => {
    const s = ms / 1000;
    if (s < 15) return "+3 bonus";
    if (s < 30) return "+2 bonus";
    if (s < 60) return "+1 bonus";
    if (s < 120) return "+0.5 bonus";
    return "";
  };

  return (
    <GradientCard>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="question">Domanda</TabsTrigger>
          <TabsTrigger value="results" disabled={allAnswers.length === 0}>
            Risultati {allAnswers.length > 0 && `(${allAnswers.length})`}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="question" className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="inline-block bg-primary/10 px-3 py-1 rounded-full font-medium text-primary text-sm">
                {question.language}
              </span>
              <span className="inline-block bg-secondary ml-2 px-3 py-1 rounded-full font-medium text-secondary-foreground text-sm">
                {question.difficulty}
              </span>
            </div>
            <div className="flex items-center">
              <Clock className="mr-1 w-4 h-4" />
              <span>{formatTime(timeElapsed)}</span>
            </div>
          </div>

          <h2 className="mb-4 font-bold text-xl">{question.question_text}</h2>

          {question.code_sample && (
            <div className="mb-6 overflow-x-auto">
              <pre className="bg-muted p-4 rounded-lg font-mono text-sm">
                <code>{question.code_sample}</code>
              </pre>
            </div>
          )}

          <div className="space-y-3">
            {options.map((option, index) => {
              const state = getOptionState(index);
              return (
                <Button
                  key={index}
                  variant={
                    state === "correct"
                      ? "default"
                      : state === "wrong"
                      ? "destructive"
                      : "outline"
                  }
                  className={`w-full justify-start text-left h-auto py-3 px-4 ${
                    state === "correct"
                      ? "ring-2 ring-green-500"
                      : state === "wrong"
                      ? "ring-2 ring-red-500"
                      : ""
                  }`}
                  onClick={() => handleSelectOption(index)}
                  disabled={hasAnswered || !!winner || timeIsUp}
                >
                  <div className="flex items-center">
                    {state === "correct" && (
                      <Check className="mr-2 w-5 h-5 text-green-500" />
                    )}
                    {state === "wrong" && (
                      <X className="mr-2 w-5 h-5 text-red-500" />
                    )}
                    <span>{option.text}</span>
                  </div>
                </Button>
              );
            })}
          </div>
          {/* Show explanation only if there is a winner or time is up */}
          {revealCorrect && question.explanation && (
            <Card className="bg-muted/50 mt-6 p-4">
              <h3 className="mb-2 font-bold">Spiegazione:</h3>
              <p>{question.explanation}</p>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="results" className="p-6">
          <h2 className="mb-4 font-bold text-xl">Risultati</h2>
          <div className="space-y-4">
            {allAnswers.map((answer) => (
              <div
                key={answer.id}
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  answer.is_correct
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-red-500/10 border-red-500/30"
                }`}
              >
                <div className="flex items-center">
                  {answer.is_correct ? (
                    <Check className="mr-2 w-5 h-5 text-green-500" />
                  ) : (
                    <X className="mr-2 w-5 h-5 text-red-500" />
                  )}
                  <span className="font-medium">{answer.player.username}</span>
                  {winner && answer.player_id === winner.playerId && (
                    <span className="ml-2 font-bold text-green-700">
                      (Vincitore)
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end text-sm">
                  <span className="font-bold">
                    {answer.is_correct
                      ? `+${answer.score_earned.toFixed(1)}`
                      : "0"}
                  </span>
                  {answer.is_correct && (
                    <span className="text-green-700 text-xs">
                      {getTimeBonusLabel(answer.response_time_ms)}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {(answer.response_time_ms / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-muted-foreground text-xs">
            <div className="mb-1 font-bold">Legenda bonus tempo:</div>
            <div>
              &lt; 15s: +3 | 15–30s: +2 | 30–60s: +1 | 60–120s: +0.5 | &gt;120s:
              +0
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </GradientCard>
  );
}
