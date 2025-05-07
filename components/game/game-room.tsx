"use client";

import { CurrentTurnCard } from "@/components/game/current-turn-card";
import { QuestionDisplay } from "@/components/game/question-display";
import { QuestionSelection } from "@/components/game/question-selection";
import { TurnResultCard } from "@/components/game/turn-result-card";
import { Button } from "@/components/ui/button";
import { generateQuestion } from "@/lib/groq";
import {
  getAnswersWithPlayerForQuestion,
  submitAnswer,
  subscribeToAnswers,
  unsubscribeFromAnswers,
} from "@/lib/supabase/supabase-answers";
import {
  updateGameStatus,
  updateGameTurn,
} from "@/lib/supabase/supabase-games";
import {
  getQuestionsForGame,
  insertQuestion,
  subscribeToQuestions,
  unsubscribeFromQuestions,
  updateQuestion,
} from "@/lib/supabase/supabase-questions";
import type {
  AnswerWithPlayer,
  GameDifficulty,
  GameLanguage,
  GameWithPlayers,
  Question,
} from "@/types/supabase";
import { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Scoreboard from "./game-scoreboard";

interface GameRoomProps {
  game: GameWithPlayers;
  onLeaveGame: () => void;
  user: User;
}

export function GameRoom({
  game,
  user,
  onLeaveGame,
}: Omit<GameRoomProps, "isHost">) {
  // --- State declarations ---
  const [allAnswers, setAllAnswers] = useState<AnswerWithPlayer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<GameLanguage>("javascript");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("medium");
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(
    null
  );
  const [winner, setWinner] = useState<{
    playerId: string;
    user_name: string;
    score: number;
  } | null>(null);
  const [showNextTurn, setShowNextTurn] = useState(false);

  // --- Memoized values ---
  const currentPlayer = useMemo(
    () => game.players[currentPlayerIndex],
    [game.players, currentPlayerIndex]
  );
  const isCurrentPlayersTurn = useMemo(
    () => currentPlayer?.player_id === user?.id,
    [currentPlayer?.player_id, user?.id]
  );
  const nextPlayerIndex = useMemo(
    () => (currentPlayerIndex + 1) % game.players.length,
    [currentPlayerIndex, game.players.length]
  );
  const isNextPlayersTurn = useMemo(
    () => game.players[nextPlayerIndex]?.player_id === user?.id,
    [game.players, nextPlayerIndex, user?.id]
  );
  const isRoundComplete = game.status === "completed";

  // Helper to reset question-related state
  const resetQuestionState = useCallback(() => {
    setCurrentQuestion(null);
    setWinner(null);
    setShowNextTurn(false);
    setAllAnswers([]);
  }, [setCurrentQuestion, setWinner, setShowNextTurn, setAllAnswers]);

  useEffect(() => {
    const checkGameCompletion = async () => {
      if (!currentQuestion?.ended_at) return;

      const questions = await getQuestionsForGame(game.id);
      const completedQuestions = questions.filter((q) => q.ended_at);
      const uniqueCreators = new Set(
        completedQuestions.map((q) => q.created_by_player_id)
      );

      if (
        uniqueCreators.size >= game.players.length &&
        game.status !== "completed"
      ) {
        await updateGameStatus(game.id, "completed");
      }
    };
    checkGameCompletion();
  }, [currentQuestion?.ended_at, game.id, game.players.length, game.status]);

  // Handle turn changes with optimized conditions
  useEffect(() => {
    if (!game?.current_turn) return;

    if (currentPlayerIndex !== game.current_turn) {
      setCurrentPlayerIndex(game.current_turn);
      resetQuestionState();
    }
  }, [game?.current_turn, currentPlayerIndex, resetQuestionState]);

  // Fetch latest question on mount or when game.id changes
  useEffect(() => {
    if (!game.id) return;
    (async () => {
      const questions = await getQuestionsForGame(game.id);
      if (questions && questions.length > 0) {
        const data = questions[0];
        setCurrentQuestion(data as Question);
        setQuestionStartTime(
          data.started_at ? new Date(data.started_at).getTime() : Date.now()
        );
      }
    })();
  }, [game.id]);

  useEffect(() => {
    if (!game.id) return;
    // Question subscription with memoized handler
    const handleQuestionUpdate = async (payload: { new: Question | null }) => {
      if (payload.new && payload.new.game_id === game.id) {
        setCurrentQuestion(payload.new);
        setQuestionStartTime(
          payload.new.started_at
            ? new Date(payload.new.started_at).getTime()
            : Date.now()
        );
      }
    };

    const questionSubscription = subscribeToQuestions(handleQuestionUpdate);
    return () => unsubscribeFromQuestions(questionSubscription);
  }, [game.id]);

  useEffect(() => {
    if (!currentQuestion?.id) {
      setAllAnswers([]);
      return;
    }
    // Answer subscription with memoized handler and data fetching
    const handleAnswerUpdate = async (questionId: string) => {
      const answers = await getAnswersWithPlayerForQuestion(questionId);
      setAllAnswers(answers);
    };

    const answerSubscription = subscribeToAnswers(async (payload) => {
      if (payload.new && payload.new.question_id === currentQuestion.id) {
        await handleAnswerUpdate(currentQuestion.id);
      }
    });

    // Initial answers fetch
    handleAnswerUpdate(currentQuestion.id);

    return () => unsubscribeFromAnswers(answerSubscription);
  }, [currentQuestion?.id]);

  // Timer effect with optimized checks
  useEffect(() => {
    if (
      !currentQuestion?.id ||
      !questionStartTime ||
      winner ||
      currentQuestion.ended_at
    )
      return;

    const timeLimit =
      (typeof game.time_limit === "number" && !isNaN(game.time_limit)
        ? game.time_limit
        : 120) * 1000;

    const timer = setInterval(async () => {
      const now = Date.now();
      const timeIsUp = now - questionStartTime >= timeLimit;
      const allPlayersAnswered =
        allAnswers.length === game.players.length && allAnswers.length > 0;
      const hasCorrectAnswer = allAnswers.some((a) => a.is_correct);

      if (timeIsUp || allPlayersAnswered || hasCorrectAnswer) {
        clearInterval(timer);

        if (!currentQuestion.ended_at) {
          await updateQuestion(currentQuestion.id, {
            ended_at: new Date().toISOString(),
          });

          if (hasCorrectAnswer) {
            setShowNextTurn(true);
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    currentQuestion,
    questionStartTime,
    winner,
    game.time_limit,
    game.players.length,
    allAnswers,
  ]);

  // Show next turn button for winning answers
  useEffect(() => {
    if (!currentQuestion?.ended_at) return;
    const hasAnyCorrectAnswer = allAnswers.some((a) => a.is_correct);
    const shouldShowNextTurn =
      currentQuestion.ended_at || !!winner || hasAnyCorrectAnswer;

    // Fix TypeScript error by ensuring boolean type
    setShowNextTurn((prev) => (shouldShowNextTurn ? true : prev));
  }, [currentQuestion?.ended_at, winner, allAnswers]);

  // Winner determination effect with memoized winner calculation
  useEffect(() => {
    if (!currentQuestion?.ended_at) return;

    const calculateWinner = () => {
      const correctAnswers = allAnswers.filter((a) => a.is_correct);
      if (correctAnswers.length === 0) {
        setWinner((prev) => (prev === null ? null : null));
        return;
      }

      const [firstCorrect] = correctAnswers.sort(
        (a, b) =>
          new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime()
      );

      if (firstCorrect) {
        const newWinner = {
          playerId: firstCorrect.player_id,
          user_name: firstCorrect.player.user_name,
          score: firstCorrect.score_earned,
        };

        setWinner((prev) => {
          if (!prev) return newWinner;
          return prev.playerId === newWinner.playerId &&
            prev.score === newWinner.score
            ? prev
            : newWinner;
        });

        // Only set next turn if it's not already set
        setShowNextTurn((prev) => (prev ? prev : true));
      }
    };

    const timeoutId = setTimeout(calculateWinner, 300);
    return () => clearTimeout(timeoutId);
  }, [currentQuestion?.ended_at, allAnswers]);

  // --- ANSWER LOGIC ---
  // Only show correct answer (green) if someone answered correctly or time is up
  // Mark wrong answers in red for everyone as soon as they are given
  // Reset answer state on new turn

  // When an answer is submitted, check if it's correct and if so, set winner and end question
  const handleSubmitAnswer = useCallback(
    async (selectedOption: number): Promise<void> => {
      if (!user || !currentQuestion?.id || !questionStartTime) return;

      try {
        const now = Date.now();
        const responseTime = now - questionStartTime;
        const timeLimitMs =
          typeof game.time_limit === "number" ? game.time_limit * 1000 : 120000;

        const { data, error: transactionError } = await submitAnswer({
          questionId: currentQuestion.id,
          playerId: user.id,
          gameId: game.id,
          selectedOption,
          responseTimeMs: responseTime,
          timeLimitMs,
        });

        if (transactionError) {
          const errorMessage = String(transactionError.message || "");

          if (errorMessage.includes("[QEND]")) {
            throw new Error("Question has already ended");
          } else if (errorMessage.includes("[ADUP]")) {
            throw new Error("Player has already submitted an answer");
          } else if (errorMessage.includes("[QNOTF]")) {
            throw new Error("Question not found");
          } else if (errorMessage.includes("[QINV]")) {
            throw new Error("Invalid question");
          }
          throw transactionError;
        }

        if (data?.[0]) {
          const answerResult = data[0];
          if (answerResult.score_earned > 0) {
            if (answerResult.was_winning_answer && !currentQuestion.ended_at) {
              setWinner({
                playerId: user.id,
                user_name: user.user_metadata?.user_name || user.email || "Tu",
                score: answerResult.score_earned,
              });
            }

            if (!currentQuestion.ended_at) {
              await updateQuestion(currentQuestion.id, {
                ended_at: new Date().toISOString(),
              });
            }

            setShowNextTurn(true);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("already")) {
            toast.error("Qualcuno ha già risposto!", {
              description: "Un altro giocatore ha risposto prima di te",
            });
          } else if (error.message.includes("Question has already")) {
            toast.error("Questa domanda è già conclusa", {
              description: "Si sta passando alla prossima domanda",
            });
          } else {
            toast.error("Errore", {
              description: "Impossibile inviare la risposta",
            });
          }
        }
      }
    },
    [user, currentQuestion, questionStartTime, game.id, game.time_limit]
  );

  // Patch: fallback to local state if game.current_turn is not present
  // Wait for DB update before changing local state
  const handleNextTurn = useCallback(async (): Promise<void> => {
    if (isRoundComplete) return;

    try {
      const nextIndex = currentPlayerIndex + 1;
      if (nextIndex >= game.players.length) {
        // Game will be marked as completed by the effect above
        return;
      }

      const { error } = await updateGameTurn(game.id, nextIndex);
      if (error) throw error;

      resetQuestionState();
    } catch {
      toast.error("Errore", {
        description: "Impossibile passare al turno successivo",
      });
    }
  }, [
    isRoundComplete,
    currentPlayerIndex,
    game.id,
    game.players.length,
    resetQuestionState,
  ]);

  const handleCreateQuestion = useCallback(
    async (
      selectedLanguage?: GameLanguage,
      selectedDifficulty?: GameDifficulty
    ): Promise<void> => {
      if (!user || !isCurrentPlayersTurn) return;

      setIsLoading(true);
      try {
        const lang = selectedLanguage ?? language;
        const diff = selectedDifficulty ?? difficulty;

        const questionData = await generateQuestion({
          language: lang,
          difficulty: diff,
        });

        const startedAt = new Date().toISOString();
        const data = await insertQuestion({
          game_id: game.id,
          created_by_player_id: user.id,
          language: lang,
          difficulty: diff,
          question_text: questionData.questionText,
          code_sample: questionData.codeSample,
          options: questionData.options,
          correct_answer: questionData.correctAnswer,
          explanation: questionData.explanation,
          started_at: startedAt,
        });

        setCurrentQuestion(data as Question);
        setQuestionStartTime(new Date(startedAt).getTime());

        if (game.status !== "active") {
          await updateGameStatus(game.id, "active");
        }
      } catch {
        toast.error("Errore", {
          description: "Impossibile creare la domanda",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, isCurrentPlayersTurn, language, difficulty, game.id, game.status]
  );

  const handleQuestionFormSubmit = useCallback(
    (values: { language: GameLanguage; difficulty: GameDifficulty }) => {
      setLanguage(values.language);
      setDifficulty(values.difficulty);
      handleCreateQuestion(values.language, values.difficulty);
    },
    [handleCreateQuestion]
  );

  // --- Ensure timer stops for everyone when turn is over ---
  useEffect(() => {
    if (currentQuestion?.ended_at) {
      setQuestionStartTime(null); // Stop timer for all
    }
    // Only run when currentQuestion changes
  }, [currentQuestion?.ended_at]);

  return (
    <div className="space-y-8">
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-bold text-3xl">
            <span className="text-gradient">DevQuizBattle</span>
          </h1>
          <p className="text-muted-foreground">Codice partita: {game.code}</p>
        </div>
        <Button variant="destructive" onClick={onLeaveGame}>
          Esci
        </Button>
      </div>

      <div className="gap-8 grid lg:grid-cols-3">
        <div className="lg:col-span-2">
          {currentQuestion ? (
            <QuestionDisplay
              question={currentQuestion}
              onSubmitAnswer={handleSubmitAnswer}
              winner={winner}
              allAnswers={allAnswers}
              timeIsUp={!!currentQuestion.ended_at}
              timeLimit={game.time_limit}
              user={user}
            />
          ) : (
            <QuestionSelection
              isCurrentPlayersTurn={isCurrentPlayersTurn}
              currentPlayerUsername={currentPlayer?.profile.user_name}
              isLoading={isLoading}
              language={language}
              difficulty={difficulty}
              onSubmit={handleQuestionFormSubmit}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Scoreboard
            game={game}
            isRoundComplete={isRoundComplete}
            onLeaveGame={onLeaveGame}
          />
          {(winner ||
            (currentQuestion && currentQuestion.ended_at && !winner)) && (
            <TurnResultCard
              winner={winner}
              showNextTurn={showNextTurn}
              isNextPlayersTurn={isNextPlayersTurn}
              isRoundComplete={isRoundComplete}
              handleNextTurn={handleNextTurn}
            />
          )}
          <CurrentTurnCard
            currentPlayer={{
              ...currentPlayer?.profile,
              player_id: currentPlayer?.player_id,
            }}
            isCurrentPlayersTurn={isCurrentPlayersTurn}
          />
        </div>
      </div>
    </div>
  );
}
