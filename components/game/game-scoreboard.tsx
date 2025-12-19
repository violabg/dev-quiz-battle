"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GameWithPlayers } from "@/lib/convex-types";
import { getInitials } from "@/lib/utils";
import { Home } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import ReactConfetti from "react-confetti";
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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    };

    // Initial measurement
    updateDimensions();

    // Setup resize observer
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <Card ref={containerRef} className="relative gradient-border glass-card">
      {isRoundComplete && (
        <ReactConfetti
          width={dimensions.width}
          height={dimensions.height}
          numberOfPieces={500}
          colors={[
            "oklch(58.92% 0.25 296.91)", // Purple
            "oklch(65% 0.2 220)", // Blue
            "oklch(95% 0.13 90)", // Gold
            "oklch(60.2% 0.18 22.5)", // Red
            "oklch(98% 0.005 210)", // White
          ]}
          recycle={false}
          gravity={0.25}
        />
      )}
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
              .map((player) => {
                return (
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
                          {getInitials(player.profile.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {player.profile.full_name}
                      </span>
                      {player.player_id === game.host_id && (
                        <Badge variant="outline" className="ml-1">
                          Host
                        </Badge>
                      )}
                    </div>
                    <span className="font-bold">{player.score.toFixed(1)}</span>
                  </div>
                );
              })}
          </>
        )}
      </CardContent>
      {isRoundComplete && (
        <CardFooter className="flex justify-center gap-4">
          <Link href="/dashboard" className="w-full">
            <Button
              variant="gradient"
              className="flex items-center gap-2 w-full"
              onClick={onLeaveGame}
            >
              <Home className="w-4 h-4" />
              Gioca ancora
            </Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
