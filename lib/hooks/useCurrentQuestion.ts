import { updateGameStatus } from "@/lib/supabase/supabase-games";
import {
  getQuestionsForGame,
  subscribeToQuestions,
  unsubscribeFromQuestions,
  updateQuestion,
} from "@/lib/supabase/supabase-questions";
import type {
  GameDifficulty,
  GameLanguage,
  GameWithPlayers,
  Question,
} from "@/lib/supabase/types";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AnswersWithPlayer } from "../supabase/supabase-answers";

type UseCurrentQuestionProps = {
  game: GameWithPlayers;
  user: User | null;
  allAnswers: AnswersWithPlayer;
  winner: { playerId: string; user_name: string; score: number } | null;
  isCurrentPlayersTurn: boolean;
  onQuestionLoaded?: (question: Question, startTime: number) => void;
};

export const useCurrentQuestion = ({
  game,
  user,
  allAnswers,
  winner,
  isCurrentPlayersTurn,
  onQuestionLoaded,
}: UseCurrentQuestionProps) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(
    null
  );
  const [isLoadingCreateQuestion, setIsLoadingCreateQuestion] = useState(false);

  // Fetch latest question on mount or when game.id changes
  useEffect(() => {
    if (!game.id) return;
    let isMounted = true;
    (async () => {
      const questions = await getQuestionsForGame(game.id);
      if (isMounted && questions && questions.length > 0) {
        const data = questions.sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        })[0];
        setCurrentQuestion(data as Question);
        const startTime = data.started_at
          ? new Date(data.started_at).getTime()
          : Date.now();
        setQuestionStartTime(startTime);
        if (onQuestionLoaded) {
          onQuestionLoaded(data as Question, startTime);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [game.id, onQuestionLoaded]);

  // Question subscription
  useEffect(() => {
    if (!game.id) return;
    let isMounted = true;
    const handleQuestionUpdate = (payload: { new: Question | null }) => {
      if (isMounted && payload.new && payload.new.game_id === game.id) {
        // Ensure we are only updating if it's a newer question or the same question
        if (
          !currentQuestion ||
          payload.new.id === currentQuestion.id ||
          (payload.new.created_at &&
            currentQuestion.created_at &&
            new Date(payload.new.created_at) >
              new Date(currentQuestion.created_at))
        ) {
          setCurrentQuestion(payload.new);
          const startTime = payload.new.started_at
            ? new Date(payload.new.started_at).getTime()
            : Date.now();
          setQuestionStartTime(startTime);
          if (onQuestionLoaded && payload.new) {
            onQuestionLoaded(payload.new, startTime);
          }
        }
      }
    };

    const questionSubscription = subscribeToQuestions(handleQuestionUpdate);
    return () => {
      isMounted = false;
      unsubscribeFromQuestions(questionSubscription);
    };
  }, [game.id, onQuestionLoaded, currentQuestion]);

  // Timer effect
  useEffect(() => {
    if (
      !currentQuestion?.id ||
      !questionStartTime ||
      winner ||
      currentQuestion.ended_at
    ) {
      return;
    }

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
          // Update local state immediately and then update DB
          // This helps prevent race conditions if DB update is slow
          setCurrentQuestion((q) =>
            q ? { ...q, ended_at: new Date().toISOString() } : null
          );
          await updateQuestion(currentQuestion.id, {
            ended_at: new Date().toISOString(),
          });
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

  // Ensure timer stops if question is externally marked as ended
  useEffect(() => {
    if (currentQuestion?.ended_at && questionStartTime !== null) {
      setQuestionStartTime(null);
    }
  }, [currentQuestion?.ended_at, questionStartTime]);

  const handleCreateQuestion = useCallback(
    async (
      selectedLanguage: GameLanguage,
      selectedDifficulty: GameDifficulty
    ): Promise<Question | null> => {
      if (!user || !isCurrentPlayersTurn) return null;

      setIsLoadingCreateQuestion(true);
      try {
        const response = await fetch("/api/questions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gameId: game.id,
            language: selectedLanguage,
            difficulty: selectedDifficulty,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create question");
        }

        const newQuestion = await response.json();
        const startTime = new Date(newQuestion.started_at).getTime();

        // Explicitly set after creation to ensure UI updates quickly
        // though subscription should also catch it.
        setCurrentQuestion(newQuestion as Question);
        setQuestionStartTime(startTime);
        if (onQuestionLoaded && newQuestion) {
          onQuestionLoaded(newQuestion as Question, startTime);
        }

        if (game.status !== "active") {
          await updateGameStatus(game.id, "active");
        }
        return newQuestion as Question;
      } catch {
        toast.error("Errore", {
          description: "Impossibile creare la domanda",
        });
        return null;
      } finally {
        setIsLoadingCreateQuestion(false);
      }
    },
    [user, isCurrentPlayersTurn, game.id, game.status, onQuestionLoaded]
  );

  return {
    currentQuestion,
    setCurrentQuestion, // Exposed for reset and handleSubmitAnswer updates
    questionStartTime,
    setQuestionStartTime, // Exposed for reset
    isLoadingCreateQuestion,
    handleCreateQuestion,
  };
};
