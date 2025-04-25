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

export function GameRoom({ game, isHost, onLeaveGame }: GameRoomProps) {
  const { user, supabase } = useSupabase();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<GameLanguage>("javascript");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("medium");
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(
    null
  );

  // Determine if it's the current user's turn
  const currentPlayer = game.players[currentPlayerIndex];
  const isCurrentPlayersTurn = currentPlayer?.player_id === user?.id;

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
            setCurrentQuestion(data as Question);
            setQuestionStartTime(Date.now());
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for answer updates
    const answerSubscription = supabase
      .channel("answer-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "answers",
          filter: `question_id=eq.${currentQuestion?.id}`,
        },
        async () => {
          // Check if all active players have answered
          if (!currentQuestion) return;

          const { data: answers } = await supabase
            .from("answers")
            .select("*")
            .eq("question_id", currentQuestion.id);

          const activePlayers = game.players.filter((p) => p.is_active);

          if (answers && answers.length >= activePlayers.length) {
            // All players have answered, move to next player's turn
            setCurrentPlayerIndex((prev) => (prev + 1) % game.players.length);
            setCurrentQuestion(null);
          }
        }
      )
      .subscribe();

    return () => {
      questionSubscription.unsubscribe();
      answerSubscription.unsubscribe();
    };
  }, [
    supabase,
    game.id,
    currentQuestion.id,
    game.players.length,
    game.players,
    currentQuestion,
  ]);

  const handleCreateQuestion = async () => {
    if (!user || !isCurrentPlayersTurn) return;

    setIsLoading(true);
    try {
      // Generate question using Groq
      const questionData = await generateQuestion({ language, difficulty });

      // Save question to database
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
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentQuestion(data as Question);
      setQuestionStartTime(Date.now());
    } catch (error: any) {
      toast.error("Error", {
        description: "Failed to create question",
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
    } catch (error: any) {
      toast.error("Error", {
        description: "Failed to submit answer",
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
          <p className="text-muted-foreground">Game Code: {game.code}</p>
        </div>
        <Button variant="destructive" onClick={onLeaveGame}>
          Leave Game
        </Button>
      </div>

      <div className="gap-8 grid lg:grid-cols-3">
        <div className="lg:col-span-2">
          {currentQuestion ? (
            <QuestionDisplay
              question={currentQuestion}
              onSubmitAnswer={handleSubmitAnswer}
            />
          ) : (
            <GradientCard>
              <div className="flex flex-col justify-center items-center p-6 min-h-[400px]">
                {isCurrentPlayersTurn ? (
                  <div className="space-y-6 w-full max-w-md">
                    <h2 className="font-bold text-2xl text-center">
                      It's your turn!
                    </h2>
                    <p className="text-muted-foreground text-center">
                      Choose a programming language and difficulty level to
                      create a question for everyone.
                    </p>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="font-medium text-sm">
                          Programming Language
                        </label>
                        <Select
                          value={language}
                          onValueChange={(value) =>
                            setLanguage(value as GameLanguage)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
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
                          Difficulty
                        </label>
                        <Select
                          value={difficulty}
                          onValueChange={(value) =>
                            setDifficulty(value as GameDifficulty)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                            <SelectItem value="expert">Expert</SelectItem>
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
                            Generating Question...
                          </>
                        ) : (
                          "Generate Question"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <h2 className="mb-2 font-bold text-2xl">
                      {currentPlayer?.profile.username}'s Turn
                    </h2>
                    <p className="text-muted-foreground">
                      Waiting for them to create a question...
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
              <h2 className="mb-4 font-bold text-xl">Leaderboard</h2>
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
              <h2 className="mb-2 font-bold text-xl">Current Turn</h2>
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
                  <Badge className="ml-1">Your Turn</Badge>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
