"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { GameWithPlayers } from "@/types/supabase";
import { Award, Home, Medal, Trophy } from "lucide-react";
import Link from "next/link";

interface GameOverProps {
  game: GameWithPlayers;
  onNewRound: () => void;
  onLeaveGame: () => void;
}

export default function GameOver({
  game,
  onNewRound,
  onLeaveGame,
}: GameOverProps) {
  // Sort players by score (descending)
  const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);

  // Get top 3 players
  const winners = sortedPlayers.slice(0, 3);

  return (
    <Card className="gradient-border w-full max-w-2xl glass-card">
      <CardContent className="space-y-8">
        <div className="flex justify-center items-end space-x-4 py-8">
          {winners.length > 1 && (
            <div className="flex flex-col items-center">
              <div className="flex justify-center items-center mb-2 rounded-full w-16 h-16 glass-card">
                <Medal className="w-8 h-8 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="font-medium">{winners[1].profile.username}</p>
                <p className="font-bold text-2xl">{winners[1].score}</p>
              </div>
            </div>
          )}

          {winners.length > 0 && (
            <div className="flex flex-col items-center">
              <div className="flex justify-center items-center mb-2 rounded-full w-20 h-20 gradient-bg">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <div className="text-center">
                <p className="font-medium">{winners[0].profile.username}</p>
                <p className="font-bold text-gradient text-3xl">
                  {winners[0].score}
                </p>
              </div>
            </div>
          )}

          {winners.length > 2 && (
            <div className="flex flex-col items-center">
              <div className="flex justify-center items-center mb-2 rounded-full w-16 h-16 glass-card">
                <Award className="w-8 h-8 text-amber-400" />
              </div>
              <div className="text-center">
                <p className="font-medium">{winners[2].profile.username}</p>
                <p className="font-bold text-2xl">{winners[2].score}</p>
              </div>
            </div>
          )}
        </div>

        <div className="border rounded-md glass-card">
          <div className="p-4 border-white/10 border-b">
            <h3 className="font-medium">Punteggi finali</h3>
          </div>
          <ul className="divide-y divide-white/10">
            {sortedPlayers.map((player, index) => (
              <li
                key={player.id}
                className="flex justify-between items-center p-4"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <span>{player.profile.username}</span>
                </div>
                <span className="font-bold">{player.score}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center gap-4">
        <Link href="/" className="w-full max-w-xs">
          <Button
            variant="gradient"
            className="flex items-center gap-2 w-full"
            onClick={onLeaveGame}
          >
            <Home className="w-4 h-4" />
            Torna alla Home
          </Button>
        </Link>
        <Link href="/new-game" className="w-full max-w-xs">
          <Button variant="glass" className="w-full" onClick={onNewRound}>
            Gioca ancora
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
