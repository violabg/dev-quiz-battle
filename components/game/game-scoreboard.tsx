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
import { Home } from "lucide-react";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { PlayersStanding } from "./players-standing";

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
  return (
    <Card className="gradient-border glass-card">
      {!isRoundComplete && (
        <CardHeader>
          <CardTitle className="text-lg">Classifica</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {isRoundComplete ? (
          <PlayersStanding players={game.players} />
        ) : (
          <>
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
