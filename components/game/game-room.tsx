"use client";

import { QuestionDisplay } from "@/components/game/question-display";
import { QuestionSelection } from "@/components/game/question-selection";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
import { CurrentTurnCard } from "@/components/game/current-turn-card";
import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
import { TurnResultCard } from "@/components/game/turn-result-card";
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
import { useCallback, useEffect, useState } from "react";
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
  // --- Place these at the very top to avoid 'used before declaration' errors ---
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
  // Helper to reset question-related state
  const resetQuestionState = useCallback(() => {
    setCurrentQuestion(null);
    setWinner(null);
    setShowNextTurn(false);
    setAllAnswers([]);
  }, [setCurrentQuestion, setWinner, setShowNextTurn, setAllAnswers]);

  // Determine if it's the current user's turn
  const currentPlayer = game.players[currentPlayerIndex];
  const isCurrentPlayersTurn = currentPlayer?.player_id === user?.id;
  const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
  const isNextPlayersTurn =
    game.players[nextPlayerIndex]?.player_id === user?.id;

  useEffect(() => {
    if (!currentQuestion?.ended_at) return;
    // --- DB check for game completion: after each question ends, check if all players have completed a turn (unique creators)
    const checkIfAllTurnsCompleted = async () => {
      const questions = await getQuestionsForGame(game.id);
      // Only consider questions that are completed
      const completedQuestions = questions.filter((q) => q.ended_at);
      // Get unique player IDs who have created a completed question
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

    checkIfAllTurnsCompleted();
  }, [currentQuestion?.ended_at, game.id, game.players.length, game.status]);

  // Prevent further turns if game is completed
  const isRoundComplete = game.status === "completed";

  useEffect(() => {
    if (!game) return;
    // Handle turn changes
    if (
      game.current_turn !== undefined &&
      currentPlayerIndex !== game.current_turn
    ) {
      if (currentPlayerIndex !== game.current_turn) {
        setCurrentPlayerIndex(game.current_turn);
      }
      // Reset question-related state for all clients when turn changes
      resetQuestionState();
    }
  }, [currentPlayerIndex, game, resetQuestionState]);

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

  // Subscribe to questions and answers
  useEffect(() => {
    if (!game.id) return;

    const questionSubscription = subscribeToQuestions(async (payload) => {
      if (payload.new && payload.new.game_id === game.id) {
        setCurrentQuestion(payload.new as Question);
        setQuestionStartTime(
          payload.new.started_at
            ? new Date(payload.new.started_at).getTime()
            : Date.now()
        );
      }
    });

    return () => {
      unsubscribeFromQuestions(questionSubscription);
    };
  }, [game.id]);

  // Handle answers subscription separately
  useEffect(() => {
    if (!currentQuestion) {
      setAllAnswers([]);
      return;
    }

    const answerSubscription = subscribeToAnswers(async (payload) => {
      if (payload.new && payload.new.question_id === currentQuestion.id) {
        const answers = await getAnswersWithPlayerForQuestion(
          currentQuestion.id
        );
        setAllAnswers(answers);
      }
    });

    // Fetch initial answers
    (async () => {
      const answers = await getAnswersWithPlayerForQuestion(currentQuestion.id);
      setAllAnswers(answers);
    })();

    return () => {
      unsubscribeFromAnswers(answerSubscription);
    };
  }, [currentQuestion]); // Changed dependencies to only include what's needed

  // Timer: check if time is up, all answered, or winner, and end question if needed
  useEffect(() => {
    if (!currentQuestion || !questionStartTime || winner) return;
    const TIME_LIMIT =
      (typeof game.time_limit === "number" && !isNaN(game.time_limit)
        ? game.time_limit
        : 120) * 1000;
    const interval = setInterval(async () => {
      const now = Date.now();
      const allPlayersAnswered =
        allAnswers.length === game.players.length && allAnswers.length > 0;

      // Check for any correct answers - this should end the question too
      const hasCorrectAnswer = allAnswers.some((a) => a.is_correct);

      if (
        now - questionStartTime >= TIME_LIMIT ||
        allPlayersAnswered ||
        hasCorrectAnswer
      ) {
        console.log("Ending question because:", {
          timeUp: now - questionStartTime >= TIME_LIMIT,
          allAnswered: allPlayersAnswered,
          hasCorrectAnswer,
        });

        // End question: update ended_at in DB if not already set
        if (!currentQuestion.ended_at) {
          await updateQuestion(currentQuestion.id, {
            ended_at: new Date().toISOString(),
          });

          // If a correct answer was given, make sure we show next turn
          if (hasCorrectAnswer) {
            setShowNextTurn(true);
          }
        }
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [
    allAnswers,
    currentQuestion,
    game.players.length,
    game.time_limit,
    questionStartTime,
    winner,
  ]);

  // Show next turn button if there is a winner OR if time is up and no winner
  // OR if there's a correct answer (even without a recognized 'winner')
  useEffect(() => {
    if (!currentQuestion || !currentQuestion.ended_at) return;

    // Show next turn if:
    // 1. There is a recognized winner
    // 2. Question has ended and all players answered
    // 3. Question has ended and time is up
    // 4. There is any correct answer (even if wasn't winning)
    const hasAnyCorrectAnswer = allAnswers.some((a) => a.is_correct);

    // Log the decision factors for debugging
    console.log("Next turn decision factors:", {
      hasWinner: !!winner,
      questionHasEnded: !!currentQuestion.ended_at,
      answersCount: allAnswers.length,
      totalPlayers: game.players.length,
      hasAnyCorrectAnswer,
    });

    // Always show next turn button if the question has ended,
    // regardless of the specific scenario
    if (currentQuestion.ended_at || winner || hasAnyCorrectAnswer) {
      setShowNextTurn(true);
    }
  }, [
    currentQuestion,
    currentQuestion?.ended_at,
    winner,
    allAnswers,
    game.players.length,
  ]);

  // --- ANSWER LOGIC ---
  // Only show correct answer (green) if someone answered correctly or time is up
  // Mark wrong answers in red for everyone as soon as they are given
  // Reset answer state on new turn

  // When an answer is submitted, check if it's correct and if so, set winner and end question
  const handleSubmitAnswer = async (selectedOption: number): Promise<void> => {
    if (!user || !currentQuestion || !questionStartTime) return;
    try {
      const now = Date.now();
      const responseTime = now - questionStartTime;
      const timeLimitMs =
        typeof game.time_limit === "number" ? game.time_limit * 1000 : 120000;

      // Use new submitAnswer: all logic is server-side
      const { data, error: transactionError } = await submitAnswer({
        questionId: currentQuestion.id,
        playerId: user.id,
        gameId: game.id,
        selectedOption,
        responseTimeMs: responseTime,
        timeLimitMs,
      });

      if (transactionError) {
        // Add specific error message for duplicate answers or race
        if (
          (typeof transactionError === "object" &&
            "code" in transactionError &&
            (transactionError.code === "P0001" ||
              transactionError.code === "P0002")) ||
          transactionError.message?.includes("already answered") ||
          transactionError.message?.includes("already been answered") ||
          transactionError.message?.includes("already submitted")
        ) {
          // P0001: question ended, P0002: already answered/race
          if (
            typeof transactionError === "object" &&
            "code" in transactionError &&
            transactionError.code === "P0001"
          ) {
            throw new Error("Question has already ended");
          } else {
            throw new Error(
              "Player has already submitted an answer or a race condition occurred"
            );
          }
        }
        throw transactionError;
      }

      // Check if the answer was correct based on the response
      if (data && Array.isArray(data) && data[0]) {
        const answerResult = data[0];

        // If score_earned is > 0, the answer was correct
        if (answerResult.score_earned > 0) {
          // Ensure the UI knows this is a correct answer immediately
          // Don't wait for the subscription to fetch this
          console.log(
            "Correct answer submitted with score:",
            answerResult.score_earned
          );

          // Force update question ended_at if needed (this ensures UI updates)
          if (!currentQuestion.ended_at) {
            await updateQuestion(currentQuestion.id, {
              ended_at: new Date().toISOString(),
            });
          }

          // Force show the next turn button
          setShowNextTurn(true);
        }
      }
    } catch (error) {
      // Log the error for debugging
      console.error("Error submitting answer:", error);

      // Check for specific race condition error
      if (
        error instanceof Error &&
        (error.message.includes("already answered") ||
          error.message.includes("already been answered") ||
          error.message.includes("already submitted") ||
          error.message.includes("race condition occurred"))
      ) {
        toast.error("Qualcuno ha già risposto!", {
          description: "Un altro giocatore ha risposto prima di te",
        });
      } else if (
        error instanceof Error &&
        error.message.includes("Question has already")
      ) {
        toast.error("Questa domanda è già conclusa", {
          description: "Si sta passando alla prossima domanda",
        });
      } else {
        toast.error("Errore", {
          description: "Impossibile inviare la risposta",
        });
      }
    }
  };

  // Patch: fallback to local state if game.current_turn is not present
  // Wait for DB update before changing local state
  const handleNextTurn = async (): Promise<void> => {
    if (isRoundComplete) return; // Prevent next turn if game is over
    try {
      const nextIndex = currentPlayerIndex + 1;
      const isAllPlayersTurned = nextIndex >= game.players.length;
      if (isAllPlayersTurned) {
        // Game will be marked as completed by the effect above
        return;
      } else {
        // Update current_turn in the database for all clients
        const { error } = await updateGameTurn(game.id, nextIndex);
        if (error) throw error;
      }
      // Local state will be updated by the subscription
      resetQuestionState();
    } catch {
      toast.error("Errore", {
        description: "Impossibile passare al turno successivo",
      });
    }
  };

  // New: handle form submit from QuestionSelection
  const handleQuestionFormSubmit = (values: {
    language: GameLanguage;
    difficulty: GameDifficulty;
  }) => {
    setLanguage(values.language);
    setDifficulty(values.difficulty);
    // Call question creation with the selected values
    handleCreateQuestion(values.language, values.difficulty);
  };

  // Overload handleCreateQuestion to accept values
  const handleCreateQuestion = async (
    selectedLanguage?: GameLanguage,
    selectedDifficulty?: GameDifficulty
  ): Promise<void> => {
    if (!user || !isCurrentPlayersTurn) return;
    setIsLoading(true);
    try {
      const lang = selectedLanguage ?? language;
      const diff = selectedDifficulty ?? difficulty;
      // Generate question using Groq
      const questionData = await generateQuestion({
        language: lang,
        difficulty: diff,
      });
      const startedAt = new Date().toISOString();
      // Save question to database (add started_at for timer sync)
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
      // Aggiorna lo stato della partita a 'active' se non già attivo
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
  };

  // --- Ensure timer stops for everyone when turn is over ---
  useEffect(() => {
    if (currentQuestion && currentQuestion.ended_at) {
      setQuestionStartTime(null); // Stop timer for all
    }
    // Only run when currentQuestion changes
  }, [currentQuestion]);

  // --- Winner sync: determine winner from allAnswers when question is over ---
  useEffect(() => {
    // Only run this effect when the question ends or we get new answers
    if (!currentQuestion?.ended_at) return;

    const determineWinner = () => {
      // Find all correct answers
      const correctAnswers = allAnswers.filter((a) => a.is_correct);

      // No correct answers
      if (correctAnswers.length === 0) {
        setWinner(null);
        return;
      }

      // Sort by answered_at to get the first correct answer
      const firstCorrect = correctAnswers.sort(
        (a, b) =>
          new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime()
      )[0];

      // Set the winner to the first player who answered correctly
      // regardless of the was_winning_answer flag from the backend
      if (firstCorrect) {
        console.log("Recognizing winner:", {
          playerId: firstCorrect.player_id,
          userName: firstCorrect.player.user_name,
          score: firstCorrect.score_earned,
          answeredAt: firstCorrect.answered_at,
        });

        // Always set as winner the first player who answered correctly,
        // even if there was a race condition in the database
        setWinner({
          playerId: firstCorrect.player_id,
          user_name: firstCorrect.player.user_name,
          score: firstCorrect.score_earned,
        });
      } else {
        setWinner(null);
      }
    };

    // Small delay to ensure we have the latest answers
    const timeoutId = setTimeout(determineWinner, 300);
    return () => clearTimeout(timeoutId);
  }, [currentQuestion?.ended_at, allAnswers]);

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
