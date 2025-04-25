"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradientCard } from "@/components/ui/gradient-card";
import type { GameWithPlayers } from "@/types/supabase";
import { Copy, Users } from "lucide-react";
import { toast } from "sonner";

interface GameLobbyProps {
  game: GameWithPlayers;
  isHost: boolean;
  onStartGame: () => void;
  onLeaveGame: () => void;
}

export function GameLobby({
  game,
  isHost,
  onStartGame,
  onLeaveGame,
}: GameLobbyProps) {
  const copyGameCode = () => {
    navigator.clipboard.writeText(game.code);
    toast.success("Codice partita copiato", {
      description:
        "Condividi questo codice con i tuoi amici per unirsi alla partita",
    });
  };

  // Trova il giocatore di turno (turn_order === 1 all'inizio, poi gestito dal game-room)
  const currentTurnPlayer = game.players.find((p) => p.turn_order === 1);

  let lobbyMessage = "";
  if (game.status === "waiting") {
    lobbyMessage = "In attesa che i giocatori si uniscano...";
  } else if (game.status === "active") {
    lobbyMessage =
      "In attesa che venga generata la domanda da " +
      (currentTurnPlayer?.profile.username || "...");
  }

  return (
    <div className="space-y-8">
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-bold text-3xl">
            <span className="text-gradient">{"Sala d'attesa"}</span>
          </h1>
          <p className="text-muted-foreground">{lobbyMessage}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 font-mono text-lg">
              {game.code}
            </Badge>
            <Button variant="ghost" size="icon" onClick={copyGameCode}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="destructive" onClick={onLeaveGame}>
            Esci
          </Button>
        </div>
      </div>

      <GradientCard>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" />
            <h2 className="font-semibold text-xl">
              Giocatori ({game.players.length}/{game.max_players})
            </h2>
          </div>

          <div className="gap-4 grid md:grid-cols-2">
            {game.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <Avatar>
                  <AvatarImage src={player.profile.avatar_url || undefined} />
                  <AvatarFallback>
                    {player.profile.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{player.profile.username}</p>
                  <p className="text-muted-foreground text-sm">
                    Ordine di turno: {player.turn_order}
                  </p>
                </div>
                {player.player_id === game.host_id && <Badge>Host</Badge>}
              </div>
            ))}
          </div>
        </div>
      </GradientCard>

      {isHost && (
        <div className="flex flex-col items-center gap-2">
          <Button
            size="lg"
            onClick={onStartGame}
            disabled={game.players.length < 2}
            className="px-8"
          >
            {game.players.length < 2
              ? "Servono almeno 2 giocatori per iniziare"
              : "Inizia la partita"}
          </Button>
          {game.players.length < 2 && (
            <p className="text-muted-foreground text-sm">
              Condividi il codice partita{" "}
              <span className="font-mono font-bold">{game.code}</span> con gli
              amici per unirsi
            </p>
          )}
        </div>
      )}
    </div>
  );
}
