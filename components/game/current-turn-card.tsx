import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials } from "@/lib/utils";
import type { GameWithPlayers } from "@/types/supabase";

interface CurrentTurnCardProps {
  currentPlayer: GameWithPlayers["players"][number]["profile"] & {
    player_id: string;
  };
  isCurrentPlayersTurn: boolean;
}

export const CurrentTurnCard = ({
  currentPlayer,
  isCurrentPlayersTurn,
}: CurrentTurnCardProps) => (
  <Card className="gradient-border glass-card">
    <CardHeader>
      <CardTitle className="text-lg">Turno attuale</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center gap-2">
        <Avatar>
          <AvatarImage src={currentPlayer?.avatar_url || undefined} />
          <AvatarFallback>
            {getInitials(currentPlayer?.full_name)}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{currentPlayer?.full_name}</span>
        {isCurrentPlayersTurn && <Badge className="ml-1">Il tuo turno</Badge>}
      </div>
    </CardContent>
  </Card>
);
