"use client";

import { CurrentTurnCard } from "@/components/game/current-turn-card";
import { QuestionDisplay } from "@/components/game/question-display";
import { QuestionSelection } from "@/components/game/question-selection";
import { TurnResultCard } from "@/components/game/turn-result-card";
import { Button } from "@/components/ui/button";
import { useCurrentQuestion } from "@/lib/hooks/useCurrentQuestion";
import { useGameAnswers } from "@/lib/hooks/useGameAnswers";
import { useGameTurns } from "@/lib/hooks/useGameTurns";
import {
  getAnswersWithPlayerForQuestion,
  submitAnswer,
} from "@/lib/supabase/supabase-answers";
import { updateGameStatus } from "@/lib/supabase/supabase-games";
import {
  getQuestionsForGame,
  updateQuestion,
} from "@/lib/supabase/supabase-questions";
import type {
  GameDifficulty,
  GameLanguage,
  GameWithPlayers,
  Question,
} from "@/lib/supabase/types";
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
  // --- State declarations for UI elements and inter-hook communication ---
  const [isLoadingSelection, setIsLoadingSelection] = useState(false);
  const [language, setLanguage] = useState<GameLanguage>("javascript");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("medium");
  // const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0); // --- Removed
  const [winner, setWinner] = useState<{
    playerId: string;
    user_name: string;
    score: number;
  } | null>(null);
  const [showNextTurn, setShowNextTurn] = useState(false);
  const [internalCurrentQuestionId, setInternalCurrentQuestionId] = useState<
    string | null | undefined
  >(null);

  // --- Custom Hooks Initialization ---
  const { allAnswers, setAllAnswers: setAllAnswersHook } = useGameAnswers({
    currentQuestionId: internalCurrentQuestionId,
  });

  // Calculate initial values for useCurrentQuestion before useGameTurns is initialized
  const initialPlayerIndex = game.current_turn ?? 0;
  const initialIsCurrentPlayersTurn =
    game.players[initialPlayerIndex]?.player_id === user?.id;

  const {
    currentQuestion,
    setCurrentQuestion: setCurrentQuestionHook,
    questionStartTime,
    setQuestionStartTime: setQuestionStartTimeHook,
    isLoadingCreateQuestion,
    handleCreateQuestion,
  } = useCurrentQuestion({
    game,
    user,
    allAnswers,
    winner,
    isCurrentPlayersTurn: initialIsCurrentPlayersTurn, // Use initial value
  });

  // Helper to reset question-related state
  const resetQuestionState = useCallback(() => {
    setCurrentQuestionHook(null);
    setWinner(null);
    setShowNextTurn(false);
    setAllAnswersHook([]);
    setQuestionStartTimeHook(null);
    setInternalCurrentQuestionId(null);
  }, [setCurrentQuestionHook, setAllAnswersHook, setQuestionStartTimeHook]);

  const isRoundComplete = game.status === "completed";

  const {
    currentPlayer,
    isCurrentPlayersTurn,
    isNextPlayersTurn,
    handleNextTurn,
  } = useGameTurns({ game, user, isRoundComplete, resetQuestionState });

  // Effect to sync currentQuestion.id from useCurrentQuestion to internalCurrentQuestionId for useGameAnswers
  useEffect(() => {
    setInternalCurrentQuestionId(currentQuestion?.id);
  }, [currentQuestion?.id]);

  // --- Memoized values derived from props, state, and hooks ---
  // --- All memoized values related to turns are now handled by useGameTurns ---

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

  // Show next turn button logic
  useEffect(() => {
    if (!currentQuestion?.ended_at) return;
    const hasAnyCorrectAnswer = allAnswers.some((a) => a.is_correct);
    const shouldShowNextTurn =
      currentQuestion.ended_at || !!winner || hasAnyCorrectAnswer;

    setShowNextTurn((prev) => (shouldShowNextTurn ? true : prev));
  }, [currentQuestion?.ended_at, winner, allAnswers]);

  // Winner determination logic
  useEffect(() => {
    if (!currentQuestion?.ended_at) return;

    const calculateWinner = () => {
      const correctAnswers = allAnswers.filter((a) => a.is_correct);
      if (correctAnswers.length === 0) {
        setWinner(null);
        return;
      }

      const [firstCorrect] = correctAnswers.sort((a, b) => {
        const aTime = a.answered_at ? new Date(a.answered_at).getTime() : 0;
        const bTime = b.answered_at ? new Date(b.answered_at).getTime() : 0;
        return aTime - bTime;
      });

      if (firstCorrect && firstCorrect.player) {
        const newWinner = {
          playerId: firstCorrect.player_id || "",
          user_name: firstCorrect.player.user_name || "Unknown Player",
          score: firstCorrect.score_earned,
        };

        setWinner((prev) => {
          if (!prev) return newWinner;
          return prev.playerId === newWinner.playerId &&
            prev.score === newWinner.score
            ? prev
            : newWinner;
        });
      }
    };

    calculateWinner();
  }, [currentQuestion?.ended_at, allAnswers]);

  // --- Action Handlers ---
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
          if (errorMessage.includes("[QEND]"))
            throw new Error("Question has already ended");
          if (errorMessage.includes("[ADUP]"))
            throw new Error("Player has already submitted an answer");
          if (errorMessage.includes("[QNOTF]"))
            throw new Error("Question not found");
          if (errorMessage.includes("[QINV]"))
            throw new Error("Invalid question");
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
              await updateQuestion(currentQuestion.id, {
                ended_at: new Date().toISOString(),
              });
              setCurrentQuestionHook(
                (
                  q: Question | null // Explicitly type q
                ) => (q ? { ...q, ended_at: new Date().toISOString() } : null)
              );
            }
            setShowNextTurn(true);
          }
          const updatedAnswers = await getAnswersWithPlayerForQuestion(
            currentQuestion.id
          );
          setAllAnswersHook(updatedAnswers);
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
    [
      user,
      currentQuestion,
      questionStartTime,
      game.id,
      game.time_limit,
      setCurrentQuestionHook,
      setAllAnswersHook,
    ]
  );

  const handleQuestionFormSubmit = useCallback(
    (values: { language: GameLanguage; difficulty: GameDifficulty }) => {
      setLanguage(values.language);
      setDifficulty(values.difficulty);

      const handleQuestionCreationRequest = async (
        selectedLanguage?: GameLanguage,
        selectedDifficulty?: GameDifficulty
      ): Promise<void> => {
        if (!user || !isCurrentPlayersTurn) return; // Use isCurrentPlayersTurn from useGameTurns

        setIsLoadingSelection(true);
        try {
          const lang = selectedLanguage ?? language;
          const diff = selectedDifficulty ?? difficulty;

          const newQuestion = await handleCreateQuestion(lang, diff);

          if (newQuestion) {
            if (game.status !== "active") {
              await updateGameStatus(game.id, "active");
            }
          }
        } catch {
          toast.error("Errore", {
            description:
              "Impossibile completare la richiesta di creazione domanda.",
          });
        } finally {
          setIsLoadingSelection(false);
        }
      };

      handleQuestionCreationRequest(values.language, values.difficulty);
    },
    [
      difficulty,
      game.id,
      game.status,
      handleCreateQuestion,
      isCurrentPlayersTurn,
      language,
      user,
    ]
  );

  return (
    <div className="space-y-8">
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-bold text-3xl">
            <span className="font-dqb text-gradient text-4xl">
              Dev Quiz Battle
            </span>
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
              isCurrentPlayersTurn={isCurrentPlayersTurn} // from useGameTurns
              currentPlayerUsername={currentPlayer?.profile.user_name} // from useGameTurns
              isLoading={isLoadingCreateQuestion || isLoadingSelection}
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
              isNextPlayersTurn={isNextPlayersTurn} // from useGameTurns
              isRoundComplete={isRoundComplete}
              handleNextTurn={handleNextTurn} // from useGameTurns
            />
          )}
          <CurrentTurnCard
            currentPlayer={{
              // from useGameTurns
              ...currentPlayer?.profile,
              player_id: currentPlayer?.player_id,
            }}
            isCurrentPlayersTurn={isCurrentPlayersTurn} // from useGameTurns
          />
        </div>
      </div>
    </div>
  );
}
