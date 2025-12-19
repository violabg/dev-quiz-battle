import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials } from "@/lib/utils";

interface CurrentTurnCardProps {
  currentPlayer: {
    user_name?: string | null;
    avatar_url?: string | null;
    player_id?: string | null;
    full_name?: string | null;
  };
  isCurrentPlayersTurn: boolean;
}

export const CurrentTurnCard = ({
  currentPlayer,
  isCurrentPlayersTurn,
}: CurrentTurnCardProps) => {
  const displayName =
    currentPlayer?.full_name || currentPlayer?.user_name || "Giocatore";

  return (
    <Card className="gradient-border glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Turno attuale</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src={currentPlayer?.avatar_url || undefined} />
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{displayName}</span>
          {isCurrentPlayersTurn && <Badge className="ml-1">Il tuo turno</Badge>}
        </div>
      </CardContent>
    </Card>
  );
};
