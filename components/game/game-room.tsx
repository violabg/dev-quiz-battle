"use client";

import { QuestionDisplay } from "@/components/game/question-display";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateQuestion } from "@/lib/groq";
import {
  getAnswersWithPlayerForQuestion,
  subscribeToAnswers,
  unsubscribeFromAnswers,
} from "@/lib/supabase-answers";
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
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface GameRoomProps {
  game: GameWithPlayers;
  isHost: boolean;
  onLeaveGame: () => void;
}

export function GameRoom({ game, onLeaveGame }: GameRoomProps) {
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

  // Add subscription to game updates with proper types
  useEffect(() => {
    if (!game.id) return;

    const channel = supabase
      .channel("game_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${game.id}`,
        },
        (payload) => {
          const updatedGame = payload.new as {
            current_turn?: number;
            status?: string;
          };
          // Handle turn changes
          if (
            updatedGame?.current_turn !== undefined &&
            currentPlayerIndex !== updatedGame.current_turn
          ) {
            setCurrentPlayerIndex(updatedGame.current_turn);
            // Reset question-related state for all clients when turn changes
            setCurrentQuestion(null);
            setWinner(null);
            setShowNextTurn(false);
            setAllAnswers([]);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [game.id, supabase, currentPlayerIndex]);

  // Determine if it's the current user's turn
  const currentPlayer = game.players[currentPlayerIndex];
  const isCurrentPlayersTurn = currentPlayer?.player_id === user?.id;
  const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
  const isNextPlayersTurn =
    game.players[nextPlayerIndex]?.player_id === user?.id;

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

  useEffect(() => {
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

    // Set up real-time subscription for answer updates (for allAnswers)
    let answerSubscription: ReturnType<typeof subscribeToAnswers> | undefined;
    if (currentQuestion) {
      answerSubscription = subscribeToAnswers(supabase, async (payload) => {
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
    } else {
      setAllAnswers([]);
    }

    return () => {
      unsubscribeFromQuestions(questionSubscription);
      if (answerSubscription) unsubscribeFromAnswers(answerSubscription);
    };
  }, [supabase, game.id, currentQuestion, game.players.length, winner]);

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
      const { data: scoreData } = await supabase.rpc("calculate_score", {
        response_time_ms: responseTime,
      });
      const scoreEarned = isCorrect ? scoreData : 0;

      // Save answer to database in a transaction to ensure data consistency
      const { error: transactionError } = await supabase.rpc("submit_answer", {
        p_question_id: currentQuestion.id,
        p_player_id: user.id,
        p_game_id: game.id,
        p_selected_option: selectedOption,
        p_is_correct: isCorrect,
        p_response_time_ms: responseTime,
        p_score_earned: scoreEarned,
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
    try {
      const nextIndex = (currentPlayerIndex + 1) % game.players.length;
      // Update current_turn in the database for all clients
      const { error } = await supabase
        .from("games")
        .update({ current_turn: nextIndex })
        .eq("id", game.id);

      if (error) throw error;

      // Local state will be updated by the subscription
      // Clear question-related state
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

  const handleCreateQuestion = async () => {
    if (!user || !isCurrentPlayersTurn) return;
    setIsLoading(true);
    try {
      // Generate question using Groq
      const questionData = await generateQuestion({ language, difficulty });
      const startedAt = new Date().toISOString();
      // Save question to database (add started_at for timer sync)
      const data = await insertQuestion(supabase, {
        game_id: game.id,
        created_by_player_id: user.id,
        language,
        difficulty,
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
        await supabase
          .from("games")
          .update({ status: "active" })
          .eq("id", game.id);
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
    if (!currentQuestion || !currentQuestion.ended_at) {
      setWinner(null);
      return;
    }
    // Find the first correct answer (by answered_at)
    const correct = allAnswers
      .filter((a) => a.is_correct)
      .sort(
        (a, b) =>
          new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime()
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
  }, [currentQuestion, currentQuestion?.ended_at, allAnswers]);

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
            <Card className="gradient-border glass-card">
              <div className="flex flex-col justify-center items-center p-6 min-h-[400px]">
                {isCurrentPlayersTurn ? (
                  <div className="space-y-6 w-full max-w-md">
                    <h2 className="font-bold text-2xl text-center">
                      È il tuo turno!
                    </h2>
                    <p className="text-muted-foreground text-center">
                      Scegli un linguaggio di programmazione e un livello di
                      difficoltà per creare una domanda per tutti.
                    </p>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="font-medium text-sm">
                          Linguaggio di programmazione
                        </label>
                        <Select
                          value={language}
                          onValueChange={(value) =>
                            setLanguage(value as GameLanguage)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona il linguaggio" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="javascript">
                              JavaScript
                            </SelectItem>
                            <SelectItem value="python">Python</SelectItem>
                            <SelectItem value="java">Java</SelectItem>
                            <SelectItem value="csharp">C#</SelectItem>
                            <SelectItem value="typescript">
                              TypeScript
                            </SelectItem>
                            <SelectItem value="go">Go</SelectItem>
                            <SelectItem value="rust">Rust</SelectItem>
                            <SelectItem value="ruby">Ruby</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="font-medium text-sm">
                          Difficoltà
                        </label>
                        <Select
                          value={difficulty}
                          onValueChange={(value) =>
                            setDifficulty(value as GameDifficulty)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona la difficoltà" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Facile</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="hard">Difficile</SelectItem>
                            <SelectItem value="expert">Esperto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        className="w-full"
                        onClick={handleCreateQuestion}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                            Generazione domanda...
                          </>
                        ) : (
                          "Genera domanda"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <h2 className="mb-2 font-bold text-2xl">
                      Turno di {currentPlayer?.profile.username}
                    </h2>
                    <p className="text-muted-foreground">
                      In attesa che crei una domanda...
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div>
          <Card className="gradient-border glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Classifica</CardTitle>
            </CardHeader>
            <CardContent>
              {[...game.players]
                .sort((a, b) => b.score - a.score)
                .map((player) => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={player.profile.avatar_url || undefined}
                        />
                        <AvatarFallback>
                          {player.profile.username
                            .substring(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {player.profile.username}
                      </span>
                      {player.player_id === game.host_id && (
                        <Badge variant="outline" className="ml-1">
                          Host
                        </Badge>
                      )}
                    </div>
                    <span className="font-bold">{player.score.toFixed(1)}</span>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="mt-4 gradient-border glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Turno attuale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarImage
                    src={currentPlayer?.profile.avatar_url || undefined}
                  />
                  <AvatarFallback>
                    {currentPlayer?.profile.username
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {currentPlayer?.profile.username}
                </span>
                {isCurrentPlayersTurn && (
                  <Badge className="ml-1">Il tuo turno</Badge>
                )}
              </div>
            </CardContent>
          </Card>
          {(winner ||
            (currentQuestion && currentQuestion.ended_at && !winner)) && (
            <Card className="mt-4 gradient-border glass-card">
              <CardContent className="flex flex-col items-center mt-6">
                {winner ? (
                  <div className="mb-2 font-bold text-green-600 text-lg">
                    {winner.username} ha indovinato! (+{winner.score.toFixed(1)}{" "}
                    punti)
                  </div>
                ) : (
                  <div className="mb-2 font-bold text-yellow-600 text-lg">
                    Tempo scaduto! Nessun giocatore ha risposto correttamente.
                  </div>
                )}
                {showNextTurn && isNextPlayersTurn && (
                  <Button onClick={handleNextTurn} className="mt-2">
                    Inizia nuovo turno
                  </Button>
                )}
                {showNextTurn && !isNextPlayersTurn && (
                  <div className="mt-2 text-muted-foreground text-sm">
                    In attesa che il prossimo giocatore inizi il nuovo turno...
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
