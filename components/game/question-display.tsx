"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Id } from "@/convex/_generated/dataModel";
import type { AnswerWithUser, QuestionWithCreator } from "@/lib/convex-types";
import { Check, Clock, Loader2, X } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface QuestionDisplayProps {
  question: QuestionWithCreator;
  onSubmitAnswer: (selectedOption: number) => void;
  winner?: { playerId: string; user_name: string; score: number } | null;
  allAnswers: AnswerWithUser[];
  timeIsUp?: boolean;
  timeLimit?: number;
  userId: Id<"users">;
}

export function QuestionDisplay({
  question,
  onSubmitAnswer,
  winner,
  allAnswers,
  timeIsUp,
  timeLimit,
  userId,
}: QuestionDisplayProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [submittingOptionIndex, setSubmittingOptionIndex] = useState<
    number | null
  >(null);

  // Convert string options to display format
  const options = question.options.map((text) => ({ text }));

  // --- ANSWER UI LOGIC ---
  // Only show correct answer (green) if someone answered correctly or time is up
  // Mark wrong answers in red for everyone as soon as they are given
  // Reset answer state on new turn
  const revealCorrect = Boolean(winner) || timeIsUp;

  // Get the current user's answer
  const userAnswer = useMemo(() => {
    return allAnswers?.find((a) => a.player_id === userId);
  }, [allAnswers, userId]);

  // Reset submission state when the user's answer appears in allAnswers
  useEffect(() => {
    if (userAnswer && isSubmittingAnswer) {
      const timeout = setTimeout(() => {
        setIsSubmittingAnswer(false);
        setSubmittingOptionIndex(null);

        // Show a success toast when the answer is successfully submitted
        toast.success("Risposta inviata!", {
          description: "In attesa degli altri giocatori...",
        });
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [userAnswer, isSubmittingAnswer]);

  // Compute hasAnswered from actual answers instead of local state
  const hasAnswered = Boolean(userAnswer);

  // Helper: get answer state for each option
  const getOptionState = (index: number) => {
    // If there are any correct answers, mark the correct answer
    const hasCorrectAnswers = allAnswers.some((a) => a.is_correct);

    // If time is up or there is a winner, or any correct answers, show correct answer
    if (
      (revealCorrect || hasCorrectAnswers) &&
      index === question.correct_answer
    )
      return "correct";

    // If this option has any wrong answers, mark as wrong
    if (allAnswers.some((a) => a.selected_option === index && !a.is_correct))
      return "wrong";

    // If this option has any correct answers and we can reveal correct answers, mark as correct
    if (
      (revealCorrect || hasCorrectAnswers) &&
      allAnswers.some((a) => a.selected_option === index && a.is_correct)
    )
      return "correct";

    return "default";
  };

  // Reset states when question changes (new turn)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setTimeElapsed(0);
      setIsSubmittingAnswer(false);
      setSubmittingOptionIndex(null);
    }, 0);
    return () => clearTimeout(timeout);
  }, [question._id]);

  useEffect(() => {
    // Use server time if available
    let timer: NodeJS.Timeout | null = null;

    // Check if there are any correct answers
    const hasCorrectAnswers = allAnswers.some((a) => a.is_correct);

    // Don't start or continue timer if there's a winner, time is up, or any correct answer
    if (winner || timeIsUp || hasCorrectAnswers) {
      return;
    }

    if (question.started_at) {
      const start = new Date(question.started_at).getTime();
      timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        setTimeElapsed(elapsed);
      }, 1000);
    } else {
      const startTime = Date.now();
      timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimeElapsed(elapsed);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [question._id, question.started_at, winner, timeIsUp, allAnswers]);

  const handleSelectOption = async (index: number) => {
    if (hasAnswered || winner || isSubmittingAnswer) return;

    try {
      setIsSubmittingAnswer(true);
      setSubmittingOptionIndex(index);
      await onSubmitAnswer(index);
      // Don't reset isSubmittingAnswer here - wait for the answer to appear in allAnswers
    } catch (error) {
      // Only reset on error so player can try again
      setIsSubmittingAnswer(false);
      setSubmittingOptionIndex(null);
      console.error("Error submitting answer:", error);

      // Check for specific error message when another player has already answered
      const errorMessage = String(error);
      if (errorMessage.includes("[ADUP]")) {
        toast.error("Risposta già inviata!", {
          description: "Hai già fornito una risposta a questa domanda",
        });
      } else if (errorMessage.includes("[QEND]")) {
        toast.error("Domanda conclusa", {
          description: "Si sta passando alla prossima domanda",
        });
      } else if (errorMessage.includes("[QNOTF]")) {
        toast.error("Domanda non trovata", {
          description: "La domanda non è più disponibile",
        });
      } else if (errorMessage.includes("[QINV]")) {
        toast.error("Domanda non valida", {
          description: "La domanda non ha una risposta corretta definita",
        });
      } else if (errorMessage.includes("[GNOTF]")) {
        toast.error("Errore di gioco", {
          description: "Partita o giocatore non trovato",
        });
      } else if (errorMessage.includes("[QERR]")) {
        toast.error("Errore di sistema", {
          description: "Si è verificato un errore interno",
        });
      } else {
        toast.error("Errore", {
          description: "Impossibile inviare la risposta",
        });
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!timeLimit) {
      // If no time limit, show elapsed time
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    // Show countdown
    const remaining = Math.max(0, timeLimit - seconds);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = () => {
    if (!timeLimit) return "";
    const remaining = Math.max(0, timeLimit - timeElapsed);

    if (remaining <= 10) return "text-red-500";
    if (remaining <= 20) return "text-yellow-500";
    return "";
  };

  const getTimeBonusLabel = (responseTimeMs: number) => {
    if (!timeLimit) return "";
    const timeLimitMs = timeLimit * 1000; // Convert seconds to milliseconds

    if (responseTimeMs < timeLimitMs * 0.05) return "+9 bonus";
    if (responseTimeMs < timeLimitMs * 0.1) return "+8 bonus";
    if (responseTimeMs < timeLimitMs * 0.15) return "+7 bonus";
    if (responseTimeMs < timeLimitMs * 0.2) return "+6 bonus";
    if (responseTimeMs < timeLimitMs * 0.3) return "+5 bonus";
    if (responseTimeMs < timeLimitMs * 0.4) return "+4 bonus";
    if (responseTimeMs < timeLimitMs * 0.55) return "+3 bonus";
    if (responseTimeMs < timeLimitMs * 0.7) return "+2 bonus";
    if (responseTimeMs < timeLimitMs * 0.85) return "+1 bonus";
    if (responseTimeMs < timeLimitMs) return "+0.5 bonus";
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
      <div className="p-6">
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
            <span className={getTimeColor()}>{formatTime(timeElapsed)}</span>
          </div>
        </div>

        <h2 className="mb-4 text-xl">{question.question_text}</h2>

        {question.code_sample && (
          <div className="mb-6 overflow-x-auto">
            <Highlight
              theme={themes.vsDark}
              code={question.code_sample}
              language={prismLanguage}
            >
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
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

            // Find correct answer with winner
            const correctAnswers = allAnswers.filter(
              (a) => a.selected_option === index && a.is_correct
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
                    ? "ring-2 ring-green-500 bg-[oklch(0.92_0.15_150/0.2)]"
                    : state === "wrong"
                    ? "ring-2 ring-red-500"
                    : ""
                } ${
                  (!!winner || timeIsUp) && !hasAnswered
                    ? "pointer-events-none cursor-default"
                    : ""
                }`}
                onClick={() => handleSelectOption(index)}
                disabled={
                  ((!winner || !timeIsUp) && hasAnswered) || isSubmittingAnswer
                }
              >
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center">
                    {isSubmittingAnswer && submittingOptionIndex === index && (
                      <Loader2 className="mr-2 w-5 h-5 text-primary animate-spin" />
                    )}
                    {state === "correct" && (
                      <Check className="mr-2 w-5 h-5 text-green-500" />
                    )}
                    {state === "wrong" && (
                      <X className="mr-2 w-5 h-5 text-red-500" />
                    )}
                    <span
                      className={
                        state === "correct"
                          ? "text-black dark:text-white"
                          : undefined
                      }
                    >
                      {option.text}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-end gap-2 ml-4">
                    {/* Show wrong players for this option */}
                    {wrongPlayers.length > 0 && (
                      <div className="flex flex-col items-end">
                        {wrongPlayers
                          .filter((a) => a.user)
                          .map((a) => (
                            <span
                              key={a.user!._id}
                              className="bg-[oklch(0.98_0.005_210)] shadow mt-1 px-2 py-1 border border-[oklch(0.6_0.18_22.5)] rounded font-bold text-[oklch(0.65_0.18_22.5)] text-xs uppercase tracking-wide"
                            >
                              {a.user!.username || a.user!.name}
                            </span>
                          ))}
                      </div>
                    )}

                    {/* Show correct answers with points */}
                    {correctAnswers.length > 0 && (
                      <div className="flex flex-col items-end">
                        {correctAnswers
                          .filter((a) => a.user)
                          .map((a) => (
                            <div
                              key={a.user!._id}
                              className="flex flex-col items-end"
                            >
                              <span className="flex items-center gap-1.5 bg-[oklch(0.45_0.2_140)] shadow mt-1 px-3 py-1.5 border border-[oklch(0.55_0.25_140)] rounded-md font-bold text-[oklch(0.98_0.005_140)] text-xs uppercase tracking-wide">
                                {a.user!.username || a.user!.name}
                                <span className="bg-[oklch(0.98_0.005_140)] px-1.5 py-0.5 rounded-sm text-[oklch(0.45_0.2_140)]">
                                  +{a.score_earned.toFixed(1)}
                                </span>
                                {winner && a.player_id === winner.playerId && (
                                  <span className="ml-0.5 text-[oklch(1_0.1_60)]">
                                    ⭐
                                  </span>
                                )}
                              </span>
                              {a.is_correct && (
                                <span className="mt-1 ml-auto px-2 py-1 rounded text-black dark:text-white text-xs">
                                  {getTimeBonusLabel(a.response_time_ms)} (
                                  {(a.response_time_ms / 1000).toFixed(1)}s)
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
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

        {/* Time bonus legend */}
        <div className="mt-6 text-muted-foreground text-xs">
          <div className="mb-1 font-bold">Legenda bonus tempo:</div>
          <div>
            &lt; 5%: +9 | &lt; 10%: +8 | &lt; 15%: +7 | &lt; 20%: +6 | &lt; 30%:
            +5 | &lt; 40%: +4 | &lt; 55%: +3 | &lt; 70%: +2 | &lt; 85%: +1 |
            &lt; 100%: +0.5
          </div>
        </div>
      </div>
    </Card>
  );
}
