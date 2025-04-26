"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface RoundSummaryProps {
  winnerUsername: string;
  winnerScore: number;
  onNewRound: () => void;
  onLeaveGame: () => void;
}

export function RoundSummary({
  winnerUsername,
  winnerScore,
  onNewRound,
  onLeaveGame,
}: RoundSummaryProps) {
  return (
    <Card className="gradient-border glass-card">
      <div className="flex flex-col justify-center items-center p-8 min-h-[400px] text-center">
        <h2 className="mb-4 font-bold text-3xl">
          <span className="text-gradient">Fine del round!</span>
        </h2>
        <div className="mb-6">
          <p className="mb-2 font-semibold text-xl">
            {winnerUsername} è in testa con {winnerScore.toFixed(1)} punti!
          </p>
          <p className="text-muted-foreground">
            Tutti i giocatori hanno completato il loro turno.
          </p>
        </div>
        <div className="flex gap-4">
          <Button onClick={onNewRound}>Nuovo round</Button>
          <Button variant="outline" onClick={onLeaveGame}>
            Torna alla home
          </Button>
        </div>
      </div>
    </Card>
  );
}
