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
  calculateScore,
  getAnswersWithPlayerForQuestion,
  submitAnswer,
  subscribeToAnswers,
  unsubscribeFromAnswers,
} from "@/lib/supabase-answers";
import { updateGameStatus, updateGameTurn } from "@/lib/supabase-games";
import { useSupabase } from "@/lib/supabase-provider";
import {
  getQuestionsForGame,
  insertQuestion,
  subscribeToQuestions,
  unsubscribeFromQuestions,
  updateQuestion,
} from "@/lib/supabase-questions";
import type {
  GameDifficulty,
  GameLanguage,
  GameWithPlayers,
  Question,
} from "@/types/supabase";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Scoreboard from "./game-scoreboard";

type AnswerWithPlayer = {
  id: string;
  player_id: string;
  selected_option: number;
  is_correct: boolean;
  response_time_ms: number;
  score_earned: number;
  answered_at: string;
  player: { id: string; username: string; avatar_url?: string | null };
};
interface GameRoomProps {
  game: GameWithPlayers;
  onLeaveGame: () => void;
}

export function GameRoom({ game, onLeaveGame }: Omit<GameRoomProps, "isHost">) {
  const { user, supabase } = useSupabase();
  // Add ended_at to Question type for local use
  type QuestionWithEnd = Question & { ended_at?: string; started_at?: string };
  const [currentQuestion, setCurrentQuestion] =
    useState<QuestionWithEnd | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<GameLanguage>("javascript");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("medium");
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(
    null
  );
  // Stato per chi ha indovinato e punteggio assegnato
  const [winner, setWinner] = useState<{
    playerId: string;
    username: string;
    score: number;
  } | null>(null);
  const [showNextTurn, setShowNextTurn] = useState(false);

  // Determine if it's the current user's turn
  const currentPlayer = game.players[currentPlayerIndex];
  const isCurrentPlayersTurn = currentPlayer?.player_id === user?.id;
  const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
  const isNextPlayersTurn =
    game.players[nextPlayerIndex]?.player_id === user?.id;

  // --- DB check for game completion: after each question ends, check if all players have completed a turn (unique creators)
  useEffect(() => {
    if (!currentQuestion?.ended_at) return;
    const checkIfAllTurnsCompleted = async () => {
      const questions = await getQuestionsForGame(supabase, game.id);
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
        await updateGameStatus(supabase, game.id, "completed");
      }
    };
    checkIfAllTurnsCompleted();
  }, [
    currentQuestion?.ended_at,
    game.id,
    game.players.length,
    game.status,
    supabase,
  ]);

  // Prevent further turns if game is completed
  const isRoundComplete = game.status === "completed";

  useEffect(() => {
    if (!game) return;
    // Handle turn changes
    if (
      game.current_turn !== undefined &&
      currentPlayerIndex !== game.current_turn
    ) {
      setCurrentPlayerIndex(game.current_turn);
      // Reset question-related state for all clients when turn changes
      setCurrentQuestion(null);
      setWinner(null);
      setShowNextTurn(false);
      setAllAnswers([]);
    }
  }, [currentPlayerIndex, game]);

  const [allAnswers, setAllAnswers] = useState<AnswerWithPlayer[]>([]);

  // Fetch latest question on mount or when game.id changes
  useEffect(() => {
    if (!game.id) return;
    (async () => {
      const questions = await getQuestionsForGame(supabase, game.id);
      if (questions && questions.length > 0) {
        const data = questions[0];
        setCurrentQuestion(data as QuestionWithEnd);
        setQuestionStartTime(
          data.started_at ? new Date(data.started_at).getTime() : Date.now()
        );
      }
    })();
  }, [game.id, supabase]);

  // Subscribe to questions and answers
  useEffect(() => {
    if (!game.id) return;

    // Set up real-time subscription for question updates
    const questionSubscription = subscribeToQuestions(
      supabase,
      async (payload) => {
        if (payload.new && payload.new.game_id === game.id) {
          setCurrentQuestion(payload.new as QuestionWithEnd);
          setQuestionStartTime(
            payload.new.started_at
              ? new Date(payload.new.started_at).getTime()
              : Date.now()
          );
        }
      }
    );

    return () => {
      unsubscribeFromQuestions(questionSubscription);
    };
  }, [supabase, game.id]);

  // Handle answers subscription separately
  useEffect(() => {
    if (!currentQuestion) {
      setAllAnswers([]);
      return;
    }

    // Set up real-time subscription for answer updates
    const answerSubscription = subscribeToAnswers(supabase, async (payload) => {
      if (payload.new && payload.new.question_id === currentQuestion.id) {
        const answers = await getAnswersWithPlayerForQuestion(
          supabase,
          currentQuestion.id
        );
        setAllAnswers(answers);
      }
    });

    // Fetch initial answers
    (async () => {
      const answers = await getAnswersWithPlayerForQuestion(
        supabase,
        currentQuestion.id
      );
      setAllAnswers(answers);
    })();

    return () => {
      if (answerSubscription) unsubscribeFromAnswers(answerSubscription);
    };
  }, [supabase, currentQuestion]); // Changed dependencies to only include what's needed

  // Timer: check if time is up, all answered, or winner, and end question if needed
  useEffect(() => {
    if (!currentQuestion || !questionStartTime || winner) return;
    const TIME_LIMIT = 120 * 1000; // 120 seconds
    const interval = setInterval(async () => {
      const now = Date.now();
      const allPlayersAnswered =
        allAnswers.length === game.players.length && allAnswers.length > 0;
      if (now - questionStartTime >= TIME_LIMIT || allPlayersAnswered) {
        // End question: update ended_at in DB if not already set
        if (!currentQuestion.ended_at) {
          await updateQuestion(supabase, currentQuestion.id, {
            ended_at: new Date().toISOString(),
          });
        }
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [
    currentQuestion,
    questionStartTime,
    winner,
    supabase,
    allAnswers.length,
    game.players.length,
  ]);

  // Show next turn button if there is a winner OR if time is up and no winner
  useEffect(() => {
    if (!currentQuestion || !currentQuestion.ended_at) return;
    // Show next turn if there is a winner or if time is up and no winner
    if (winner || (!winner && allAnswers.length === game.players.length)) {
      setShowNextTurn(true);
    } else if (!winner && allAnswers.length < game.players.length) {
      // If time is up but not all players answered, still allow next turn
      setShowNextTurn(true);
    }
  }, [
    currentQuestion,
    currentQuestion?.ended_at,
    winner,
    allAnswers.length,
    game.players.length,
  ]);

  // --- ANSWER LOGIC ---
  // Only show correct answer (green) if someone answered correctly or time is up
  // Mark wrong answers in red for everyone as soon as they are given
  // Reset answer state on new turn
  useEffect(() => {
    // Reset winner and answer state on new question
    setWinner(null);
    setShowNextTurn(false);
  }, [currentQuestion?.id]);

  // When an answer is submitted, check if it's correct and if so, set winner and end question
  const handleSubmitAnswer = async (selectedOption: number) => {
    if (!user || !currentQuestion || !questionStartTime) return;
    try {
      const now = Date.now();
      const responseTime = now - questionStartTime;
      const isCorrect = selectedOption === currentQuestion.correct_answer;

      // Calculate score based on response time
      const { data: scoreData } = await calculateScore(supabase, responseTime);
      const scoreEarned = isCorrect ? scoreData : 0;

      // Save answer to database in a transaction to ensure data consistency
      const { error: transactionError } = await submitAnswer(supabase, {
        questionId: currentQuestion.id,
        playerId: user.id,
        gameId: game.id,
        selectedOption,
        isCorrect,
        responseTimeMs: responseTime,
        scoreEarned,
      });

      if (transactionError) {
        throw transactionError;
      }

      // If correct, end question for everyone
      if (isCorrect && !currentQuestion.ended_at) {
        await updateQuestion(supabase, currentQuestion.id, {
          ended_at: new Date(now).toISOString(),
        });
      }
    } catch {
      toast.error("Errore", {
        description: "Impossibile inviare la risposta",
      });
    }
  };

  // Patch: fallback to local state if game.current_turn is not present
  // Wait for DB update before changing local state
  const handleNextTurn = async () => {
    if (isRoundComplete) return; // Prevent next turn if game is over
    try {
      const nextIndex = currentPlayerIndex + 1;
      const isAllPlayersTurned = nextIndex >= game.players.length;
      if (isAllPlayersTurned) {
        // Game will be marked as completed by the effect above
        return;
      } else {
        // Update current_turn in the database for all clients
        const { error } = await updateGameTurn(supabase, game.id, nextIndex);
        if (error) throw error;
      }
      // Local state will be updated by the subscription
      setCurrentQuestion(null);
      setWinner(null);
      setShowNextTurn(false);
      setAllAnswers([]);
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
  ) => {
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
      const data = await insertQuestion(supabase, {
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
        await updateGameStatus(supabase, game.id, "active");
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
      // Find the first correct answer (by answered_at)
      const correct = allAnswers
        .filter((a) => a.is_correct)
        .sort(
          (a, b) =>
            new Date(a.answered_at).getTime() -
            new Date(b.answered_at).getTime()
        )[0];

      if (correct) {
        setWinner({
          playerId: correct.player_id,
          username: correct.player.username,
          score: correct.score_earned,
        });
      } else {
        setWinner(null);
      }
    };

    // Small delay to ensure we have the latest answers
    const timeoutId = setTimeout(determineWinner, 100);
    return () => clearTimeout(timeoutId);
  }, [currentQuestion?.ended_at, allAnswers]);

  // After each question ends, check in the DB if all players have completed a turn (unique creators)
  useEffect(() => {
    if (!currentQuestion?.ended_at) return;
    const checkIfAllTurnsCompleted = async () => {
      const questions = await getQuestionsForGame(supabase, game.id);
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
        await updateGameStatus(supabase, game.id, "completed");
      }
    };
    checkIfAllTurnsCompleted();
  }, [
    currentQuestion?.ended_at,
    game.id,
    game.players.length,
    game.status,
    supabase,
  ]);

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
            />
          ) : (
            <QuestionSelection
              isCurrentPlayersTurn={isCurrentPlayersTurn}
              currentPlayerUsername={currentPlayer?.profile.username}
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
          <CurrentTurnCard
            currentPlayer={{
              ...currentPlayer?.profile,
              player_id: currentPlayer?.player_id,
            }}
            isCurrentPlayersTurn={isCurrentPlayersTurn}
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
        </div>
      </div>
    </div>
  );
}
