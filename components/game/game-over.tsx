"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GameWithPlayers } from "@/types/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Award, Home, Medal, Trophy } from "lucide-react";
import Link from "next/link";
import { Badge } from "../ui/badge";

interface ScoreboardProps {
  game: GameWithPlayers;
  isRoundComplete: boolean;
  onLeaveGame: () => void;
}

export default function Scoreboard({
  game,
  isRoundComplete,
  onLeaveGame,
}: ScoreboardProps) {
  // Sort players by score (descending)
  const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);

  // Get top 3 players
  const winners = sortedPlayers.slice(0, 3);

  return (
    <Card className="gradient-border glass-card">
      {!isRoundComplete && (
        <CardHeader>
          <CardTitle className="text-lg">Classifica</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-8">
        {isRoundComplete ? (
          <>
            {" "}
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
            <div className="border-input rounded-md glass-card">
              <div className="p-4 border-input border-b">
                <h3 className="font-medium">Punteggi finali</h3>
              </div>
              <ul className="divide-y divide-input">
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
          </>
        ) : (
          <>
            {" "}
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
                        {player.profile.username.substring(0, 2).toUpperCase()}
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
          </>
        )}
      </CardContent>
      {isRoundComplete && (
        <CardFooter className="flex justify-center gap-4">
          <Link href="/" className="w-full">
            <Button
              variant="gradient"
              className="flex items-center gap-2 w-full"
              onClick={onLeaveGame}
            >
              <Home className="w-4 h-4" />
              Torna alla Home
            </Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
