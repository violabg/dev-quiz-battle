"use client";
import { CurrentTurnCard } from "@/components/game/current-turn-card";
import { QuestionDisplay } from "@/components/game/question-display";
import { QuestionSelection } from "@/components/game/question-selection";
import { TurnResultCard } from "@/components/game/turn-result-card";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type {
  GameDifficulty,
  GameLanguage,
  GameWithPlayers,
} from "@/lib/convex-types";
import { useCurrentQuestion } from "@/lib/hooks/useCurrentQuestion";
import { useGameAnswers } from "@/lib/hooks/useGameAnswers";
import { useGameTurns } from "@/lib/hooks/useGameTurns";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Scoreboard from "./game-scoreboard";

interface GameRoomProps {
  game: GameWithPlayers;
  onLeaveGame: () => void;
  userId: Id<"users">;
}

export function GameRoom({ game, userId, onLeaveGame }: GameRoomProps) {
  // Convex mutations
  const submitAnswerMutation = useMutation(api.answers.submitAnswer);
  const updateGameMutation = useMutation(api.games.updateGame);
  const getQuestionsByGame = useQuery(api.questions.getQuestionsByGame, {
    game_id: game._id,
  });

  // --- State declarations for UI elements and inter-hook communication ---
  const [isLoadingSelection, setIsLoadingSelection] = useState(false);
  const [language, setLanguage] = useState<GameLanguage>("javascript");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("medium");
  const [winner, setWinner] = useState<{
    playerId: string;
    user_name: string;
    score: number;
  } | null>(null);
  const [showNextTurn, setShowNextTurn] = useState(false);

  // --- Custom Hooks Initialization ---
  const { allAnswers } = useGameAnswers({
    currentQuestionId: null as Id<"questions"> | null,
  });

  // Calculate initial values
  const initialPlayerIndex = game.current_turn ?? 0;
  const initialIsCurrentPlayersTurn =
    game.players[initialPlayerIndex]?.player_id === userId;

  // Helper to reset question-related state
  const resetQuestionState = useCallback(() => {
    setWinner(null);
    setShowNextTurn(false);
  }, []);

  const isRoundComplete = game.status === "completed";

  const {
    currentPlayer,
    isCurrentPlayersTurn,
    isNextPlayersTurn,
    handleNextTurn,
  } = useGameTurns({ game, userId, isRoundComplete, resetQuestionState });

  const {
    currentQuestion,
    questionStartTime,
    setQuestionStartTime,
    isLoadingCreateQuestion,
    handleCreateQuestion,
  } = useCurrentQuestion({
    gameId: game._id,
    userId,
    allAnswersCount: allAnswers?.length ?? 0,
    playersCount: game.players?.length ?? 0,
    hasCorrectAnswer: allAnswers?.some((a) => a.is_correct) ?? false,
    winner,
    isCurrentPlayersTurn,
    gameStatus: game.status,
    timeLimit: game.time_limit,
  });

  // Check game completion
  useEffect(() => {
    const checkGameCompletion = async () => {
      if (!currentQuestion?.ended_at || !getQuestionsByGame) return;

      const completedQuestions = getQuestionsByGame.filter((q) => q.ended_at);
      const uniqueCreators = new Set(
        completedQuestions.map((q) => q.created_by_player_id)
      );

      if (
        uniqueCreators.size >= game.players.length &&
        game.status !== "completed"
      ) {
        await updateGameMutation({
          game_id: game._id,
          status: "completed",
        });
      }
    };
    checkGameCompletion();
  }, [
    currentQuestion?.ended_at,
    game._id,
    game.players.length,
    game.status,
    getQuestionsByGame,
    updateGameMutation,
  ]);

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
    if (!currentQuestion?.ended_at || !allAnswers) return;

    const calculateWinner = () => {
      const correctAnswers = allAnswers.filter((a) => a.is_correct);
      if (correctAnswers.length === 0) {
        setWinner(null);
        return;
      }

      const [firstCorrect] = correctAnswers.sort((a, b) => {
        const aTime = a.answered_at || 0;
        const bTime = b.answered_at || 0;
        return aTime - bTime;
      });

      if (firstCorrect && firstCorrect.user) {
        const newWinner = {
          playerId: firstCorrect.player_id || "",
          user_name:
            firstCorrect.user.username ||
            firstCorrect.user.name ||
            "Unknown Player",
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
      if (!userId || !currentQuestion?._id || !questionStartTime) return;

      try {
        const now = Date.now();
        const responseTime = now - questionStartTime;
        const timeLimitMs =
          typeof game.time_limit === "number" ? game.time_limit * 1000 : 120000;

        await submitAnswerMutation({
          questionId: currentQuestion._id,
          playerId: userId,
          gameId: game._id,
          selectedOption,
          responseTimeMs: responseTime,
          timeLimitMs,
        });

        // The winner will be determined by the useEffect that watches allAnswers
        setShowNextTurn(true);
      } catch (error) {
        if (error instanceof Error) {
          const errorMessage = error.message;
          if (errorMessage.includes("[QEND]")) {
            toast.error("Questa domanda è già conclusa", {
              description: "Si sta passando alla prossima domanda",
            });
          } else if (errorMessage.includes("[ADUP]")) {
            toast.error("Qualcuno ha già risposto!", {
              description: "Un altro giocatore ha risposto prima di te",
            });
          } else if (errorMessage.includes("[QNOTF]")) {
            toast.error("Domanda non trovata", {
              description: "La domanda potrebbe essere stata eliminata",
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
      userId,
      currentQuestion,
      questionStartTime,
      game._id,
      game.time_limit,
      submitAnswerMutation,
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
        if (!userId || !isCurrentPlayersTurn) return; // Use isCurrentPlayersTurn from useGameTurns

        setIsLoadingSelection(true);
        try {
          const lang = selectedLanguage ?? language;
          const diff = selectedDifficulty ?? difficulty;

          const newQuestion = await handleCreateQuestion(lang, diff);

          if (newQuestion) {
            if (game.status !== "active") {
              await updateGameMutation({
                game_id: game._id,
                status: "active",
              });
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
      game._id,
      game.status,
      handleCreateQuestion,
      isCurrentPlayersTurn,
      language,
      userId,
      updateGameMutation,
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
              userId={userId}
            />
          ) : (
            <QuestionSelection
              isCurrentPlayersTurn={isCurrentPlayersTurn} // from useGameTurns
              currentPlayerUsername={
                currentPlayer?.user?.username || currentPlayer?.user?.name
              } // from useGameTurns
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
              user_name: currentPlayer?.user?.username,
              full_name: currentPlayer?.user?.name,
              avatar_url: currentPlayer?.user?.image,
              player_id: currentPlayer?.player_id,
            }}
            isCurrentPlayersTurn={isCurrentPlayersTurn} // from useGameTurns
          />
        </div>
      </div>
    </div>
  );
}
