import type { Player, Profile } from "@/types/supabase";
import { Award, Medal, Trophy } from "lucide-react";

interface PlayersStandingProps {
  players: (Player & { profile: Profile })[];
}

export const PlayersStanding = ({ players }: PlayersStandingProps) => {
  // Sort players by score (descending)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  // Get top 3 players
  const winners = sortedPlayers.slice(0, 3);
  console.log("🚀 ~ PlayersStanding ~ winners:", winners);

  return (
    <>
      <div className="flex justify-center items-end space-x-4 py-8">
        {winners.length > 1 && (
          <div className="flex flex-col items-center w-32 min-w-0">
            <div className="flex justify-center items-center mb-2 rounded-full w-16 h-16 silver-gradient emboss">
              <Medal className="w-8 h-8 text-white dark:text-black" />
            </div>
            <div className="w-full min-w-0 text-center">
              <p className="max-w-full font-medium break-words whitespace-pre-line hyphens-auto">
                {winners[1].profile.full_name}
              </p>
              <p className="font-bold text-2xl">{winners[1].score}</p>
            </div>
          </div>
        )}

        {winners.length > 0 && (
          <div className="flex flex-col items-center w-32 min-w-0">
            <div className="flex justify-center items-center mb-2 rounded-full w-20 h-20 gold-gradient emboss">
              <Trophy className="w-10 h-10 text-white dark:text-black" />
            </div>
            <div className="w-full min-w-0 text-center">
              <p className="max-w-full font-medium break-words whitespace-pre-line hyphens-auto">
                {winners[0].profile.full_name}
              </p>
              <p className="font-bold text-gradient text-3xl">
                {winners[0].score}
              </p>
            </div>
          </div>
        )}

        {winners.length > 2 && (
          <div className="flex flex-col items-center w-32 min-w-0">
            <div className="flex justify-center items-center mb-2 rounded-full w-16 h-16 bronze-gradient emboss">
              <Award className="w-8 h-8 text-white dark:text-black" />
            </div>
            <div className="w-full min-w-0 text-center">
              <p className="max-w-full font-medium break-words whitespace-pre-line hyphens-auto">
                {winners[2].profile.full_name}
              </p>
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
                <span>{player.profile.full_name}</span>
              </div>
              <span className="font-bold">{player.score}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};
