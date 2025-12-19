import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type {
  GameDifficulty,
  GameLanguage,
  QuestionWithCreator,
} from "@/lib/convex-types";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type UseCurrentQuestionProps = {
  gameId: Id<"games">;
  userId: Id<"users"> | undefined;
  allAnswersCount: number;
  playersCount: number;
  hasCorrectAnswer: boolean;
  winner: { playerId: string; user_name: string; score: number } | null;
  isCurrentPlayersTurn: boolean;
  gameStatus: "waiting" | "active" | "completed";
  timeLimit: number;
  onQuestionLoaded?: (question: QuestionWithCreator, startTime: number) => void;
};

export const useCurrentQuestion = ({
  gameId,
  userId,
  allAnswersCount,
  playersCount,
  hasCorrectAnswer,
  winner,
  isCurrentPlayersTurn,
  gameStatus,
  timeLimit,
  onQuestionLoaded,
}: UseCurrentQuestionProps) => {
  // Convex auto-subscribes with useQuery
  const currentQuestion = useQuery(api.queries.questions.getCurrentQuestion, {
    game_id: gameId,
  });

  const [questionStartTime, setQuestionStartTime] = useState<number | null>(
    null
  );
  const [isLoadingCreateQuestion, setIsLoadingCreateQuestion] = useState(false);

  const generateAndCreateQuestion = useAction(
    api.actions.questions.generateAndCreateQuestion
  );
  const endQuestion = useMutation(api.mutations.questions.endQuestion);
  const updateGame = useMutation(api.mutations.games.updateGame);

  // Set question start time when question loads or changes
  useEffect(() => {
    if (currentQuestion) {
      const startTime = currentQuestion.started_at ?? Date.now();
      setQuestionStartTime(startTime);
      if (onQuestionLoaded) {
        onQuestionLoaded(currentQuestion, startTime);
      }
    }
  }, [currentQuestion, onQuestionLoaded]);

  // Timer effect with atomic ending
  useEffect(() => {
    if (
      !currentQuestion?._id ||
      !questionStartTime ||
      winner ||
      currentQuestion.ended_at
    ) {
      return;
    }

    const timeLimitMs =
      (typeof timeLimit === "number" && !isNaN(timeLimit) ? timeLimit : 120) *
      1000;

    const timer = setInterval(async () => {
      const now = Date.now();
      const timeIsUp = now - questionStartTime >= timeLimitMs;
      const allPlayersAnswered =
        allAnswersCount === playersCount && allAnswersCount > 0;

      if (timeIsUp || allPlayersAnswered || hasCorrectAnswer) {
        clearInterval(timer);
        if (!currentQuestion.ended_at) {
          // Call mutation to end question atomically
          // The mutation checks ended_at before patching (first client wins)
          try {
            await endQuestion({ question_id: currentQuestion._id });
          } catch (error) {
            // Likely already ended by another client or correct answer
            console.log("Question already ended", error);
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    currentQuestion,
    questionStartTime,
    winner,
    timeLimit,
    playersCount,
    allAnswersCount,
    hasCorrectAnswer,
    endQuestion,
  ]);

  // Reset timer when question ends
  useEffect(() => {
    if (currentQuestion?.ended_at && questionStartTime !== null) {
      setQuestionStartTime(null);
    }
  }, [currentQuestion?.ended_at, questionStartTime]);

  const handleCreateQuestion = useCallback(
    async (
      selectedLanguage: GameLanguage,
      selectedDifficulty: GameDifficulty
    ): Promise<Id<"questions"> | null> => {
      if (!userId || !isCurrentPlayersTurn) return null;

      setIsLoadingCreateQuestion(true);
      try {
        // Call Convex action to generate and create question
        const questionId = await generateAndCreateQuestion({
          game_id: gameId,
          player_id: userId,
          language: selectedLanguage,
          difficulty: selectedDifficulty,
        });

        if (gameStatus !== "active") {
          await updateGame({
            game_id: gameId,
            status: "active",
          });
        }

        return questionId;
      } catch (error) {
        console.error("Failed to create question:", error);
        toast.error("Errore", {
          description: "Impossibile creare la domanda",
        });
        return null;
      } finally {
        setIsLoadingCreateQuestion(false);
      }
    },
    [
      userId,
      isCurrentPlayersTurn,
      gameId,
      gameStatus,
      generateAndCreateQuestion,
      updateGame,
    ]
  );

  return {
    currentQuestion,
    questionStartTime,
    setQuestionStartTime, // Exposed for reset
    isLoadingCreateQuestion,
    handleCreateQuestion,
  };
};
