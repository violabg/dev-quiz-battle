import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface TurnResultCardProps {
  winner: { user_name: string; score: number } | null;
  showNextTurn: boolean;
  isNextPlayersTurn: boolean;
  isRoundComplete: boolean;
  handleNextTurn: () => void;
}

export const TurnResultCard = ({
  winner,
  showNextTurn,
  isNextPlayersTurn,
  isRoundComplete,
  handleNextTurn,
}: TurnResultCardProps) => (
  <Card className="gradient-border glass-card">
    <CardContent className="flex flex-col items-center mt-6">
      {winner ? (
        <div className="mb-2 font-bold text-green-600 text-lg">
          {winner.user_name} ha indovinato! (+{winner.score.toFixed(1)} punti)
        </div>
      ) : (
        <div className="mb-2 font-bold text-yellow-600 text-lg">
          Tempo scaduto! Nessun giocatore ha risposto correttamente.
        </div>
      )}
      {showNextTurn && isNextPlayersTurn && !isRoundComplete && (
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
);
