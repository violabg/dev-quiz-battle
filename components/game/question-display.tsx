"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAnswersWithPlayerForQuestion } from "@/lib/supabase/supabase-answers";
import type { AnswerWithPlayer, Question } from "@/types/supabase";
import { User } from "@supabase/supabase-js";
import { Check, Clock, X } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { useEffect, useMemo, useState } from "react";

interface QuestionDisplayProps {
  question: Question & { ended_at?: string; started_at?: string };
  onSubmitAnswer: (selectedOption: number) => void;
  winner?: { playerId: string; user_name: string; score: number } | null;
  allAnswers: AnswerWithPlayer[];
  timeIsUp?: boolean;
  user: User;
}

export function QuestionDisplay({
  question,
  onSubmitAnswer,
  winner,
  allAnswers,
  timeIsUp,
  user,
}: QuestionDisplayProps) {
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
      const answers = await getAnswersWithPlayerForQuestion(question.id);
      if (answers && answers.some((a) => a.player_id === user.id)) {
        setHasAnswered(true);
      }
    };

    checkUserAnswer();

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [question.id, question.started_at, user]);

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

  // Map question.language to Prism supported language
  const prismLanguage = useMemo(() => {
    switch ((question.language || "").toLowerCase()) {
      case "javascript":
      case "js":
        return "javascript";
      case "typescript":
      case "ts":
        return "typescript";
      case "python":
      case "py":
        return "python";
      case "java":
        return "java";
      case "c#":
      case "csharp":
        return "csharp";
      case "cpp":
      case "c++":
        return "cpp";
      case "go":
        return "go";
      case "ruby":
        return "ruby";
      case "php":
        return "php";
      case "swift":
        return "swift";
      case "kotlin":
        return "kotlin";
      case "html":
      case "css":
        return "markup";
      default:
        return "javascript";
    }
  }, [question.language]);

  return (
    <Card className="pt-[2px] gradient-border glass-card">
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
              <Highlight
                theme={themes.vsDark}
                code={question.code_sample}
                language={prismLanguage}
              >
                {({
                  className,
                  style,
                  tokens,
                  getLineProps,
                  getTokenProps,
                }) => (
                  <pre
                    className={
                      "p-4 rounded-lg font-mono text-sm bg-[oklch(0.18_0.02_260)] text-[oklch(0.95_0_0)] border border-[oklch(0.3_0.02_260)] " +
                      className
                    }
                    style={style}
                  >
                    <code>
                      {tokens.map((line, i) => {
                        const { key: lineKey, ...lineProps } = getLineProps({
                          line,
                          key: i,
                        });
                        return (
                          <div key={String(lineKey)} {...lineProps}>
                            {line.map((token, key) => {
                              const { key: tokenKey, ...rest } = getTokenProps({
                                token,
                                key,
                              });
                              return <span key={String(tokenKey)} {...rest} />;
                            })}
                          </div>
                        );
                      })}
                    </code>
                  </pre>
                )}
              </Highlight>
            </div>
          )}

          <div className="space-y-3">
            {options.map((option, index) => {
              const state = getOptionState(index);
              // Find all players who selected this option and got it wrong
              const wrongPlayers = allAnswers.filter(
                (a) => a.selected_option === index && !a.is_correct
              );
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
                  className={`w-full justify-start text-left h-auto py-3 px-4 whitespace-normal break-words ${
                    state === "correct"
                      ? "ring-2 ring-green-500"
                      : state === "wrong"
                      ? "ring-2 ring-red-500"
                      : ""
                  }`}
                  onClick={() => handleSelectOption(index)}
                  disabled={hasAnswered || !!winner || timeIsUp}
                >
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center">
                      {state === "correct" && (
                        <Check className="mr-2 w-5 h-5 text-green-500" />
                      )}
                      {state === "wrong" && (
                        <X className="mr-2 w-5 h-5 text-red-500" />
                      )}
                      <span>{option.text}</span>
                    </div>
                    {/* Show wrong player user_names for this option */}
                    {wrongPlayers.length > 0 && (
                      <div className="flex flex-col items-end ml-4">
                        {wrongPlayers.map((a) => (
                          <span
                            key={a.player.id}
                            className="bg-[oklch(0.98_0.005_210)] shadow mt-1 px-2 py-1 border border-[oklch(0.6_0.18_22.5)] rounded font-bold text-[oklch(0.65_0.18_22.5)] text-xs uppercase tracking-wide"
                          >
                            {a.player.user_name}
                          </span>
                        ))}
                      </div>
                    )}
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
                  <span className="font-medium">{answer.player.user_name}</span>
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
    </Card>
  );
}
