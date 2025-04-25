"use client";

import { QuestionDisplay } from "@/components/game/question-display";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GradientCard } from "@/components/ui/gradient-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateQuestion } from "@/lib/groq";
import { useSupabase } from "@/lib/supabase-provider";
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
      const { data } = await supabase
        .from("questions")
        .select("*")
        .eq("game_id", game.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setCurrentQuestion(data as QuestionWithEnd);
        setQuestionStartTime(
          data.started_at ? new Date(data.started_at).getTime() : Date.now()
        );
      }
    })();
  }, [game.id, supabase]);

  useEffect(() => {
    // Set up real-time subscription for question updates
    const questionSubscription = supabase
      .channel("question-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "questions",
          filter: `game_id=eq.${game.id}`,
        },
        async (payload) => {
          // Fetch the full question data
          const { data } = await supabase
            .from("questions")
            .select("*")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setCurrentQuestion(data as QuestionWithEnd);
            setQuestionStartTime(
              data.started_at ? new Date(data.started_at).getTime() : Date.now()
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "questions",
          filter: `game_id=eq.${game.id}`,
        },
        async (payload) => {
          // Update ended_at if question is ended
          const { data } = await supabase
            .from("questions")
            .select("*")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setCurrentQuestion(data as QuestionWithEnd);
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for answer updates (for allAnswers)
    let answerSubscription: ReturnType<typeof supabase.channel> | undefined;
    if (currentQuestion) {
      answerSubscription = supabase
        .channel("all-answers")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "answers",
            filter: `question_id=eq.${currentQuestion.id}`,
          },
          async () => {
            const { data } = await supabase
              .from("answers")
              .select(`*, player:player_id(id, username, avatar_url)`)
              .eq("question_id", currentQuestion.id);
            if (data) setAllAnswers(data);
          }
        )
        .subscribe();
      // Fetch initial answers
      (async () => {
        const { data } = await supabase
          .from("answers")
          .select(`*, player:player_id(id, username, avatar_url)`)
          .eq("question_id", currentQuestion.id);
        if (data) setAllAnswers(data);
      })();
    } else {
      setAllAnswers([]);
    }

    return () => {
      questionSubscription.unsubscribe();
      if (answerSubscription) answerSubscription.unsubscribe();
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
          await supabase
            .from("questions")
            .update({ ended_at: new Date().toISOString() })
            .eq("id", currentQuestion.id);
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

  // Avvia nuovo turno: solo il prossimo giocatore può farlo
  const handleNextTurn = () => {
    setCurrentPlayerIndex((prev) => (prev + 1) % game.players.length);
    setCurrentQuestion(null);
    setWinner(null);
    setShowNextTurn(false);
  };

  const handleCreateQuestion = async () => {
    if (!user || !isCurrentPlayersTurn) return;

    setIsLoading(true);
    try {
      // Generate question using Groq
      const questionData = await generateQuestion({ language, difficulty });
      const startedAt = new Date().toISOString();

      // Save question to database (add started_at for timer sync)
      const { data, error } = await supabase
        .from("questions")
        .insert({
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
        })
        .select()
        .single();

      if (error) throw error;

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

  const handleSubmitAnswer = async (selectedOption: number) => {
    if (!user || !currentQuestion || !questionStartTime) return;

    try {
      const responseTime = Date.now() - questionStartTime;
      const isCorrect = selectedOption === currentQuestion.correct_answer;

      // Calculate score based on response time
      const { data: scoreData } = await supabase.rpc("calculate_score", {
        response_time_ms: responseTime,
      });

      const scoreEarned = isCorrect ? scoreData : 0;

      // Save answer to database
      const { error } = await supabase.from("answers").insert({
        question_id: currentQuestion.id,
        player_id: user.id,
        selected_option: selectedOption,
        is_correct: isCorrect,
        response_time_ms: responseTime,
        score_earned: scoreEarned,
      });

      if (error) throw error;

      // Update player's score
      if (isCorrect) {
        const { error: updateError } = await supabase
          .from("game_players")
          .update({
            score:
              game.players.find((p) => p.player_id === user.id)?.score +
              scoreEarned,
          })
          .eq("game_id", game.id)
          .eq("player_id", user.id);

        if (updateError) throw updateError;
      }
    } catch {
      toast.error("Errore", {
        description: "Impossibile inviare la risposta",
      });
    }
  };

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
            <GradientCard>
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
            </GradientCard>
          )}
        </div>

        <div>
          <Card>
            <div className="p-4">
              <h2 className="mb-4 font-bold text-xl">Classifica</h2>
              <div className="space-y-2">
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
                      <span className="font-bold">
                        {player.score.toFixed(1)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </Card>

          <Card className="mt-4">
            <div className="p-4">
              <h2 className="mb-2 font-bold text-xl">Turno attuale</h2>
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
            </div>
          </Card>
          {winner && (
            <Card className="mt-4">
              <div className="flex flex-col items-center mt-6">
                <div className="mb-2 font-bold text-green-600 text-lg">
                  {winner.username} ha indovinato! (+{winner.score.toFixed(1)}{" "}
                  punti)
                </div>
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
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
