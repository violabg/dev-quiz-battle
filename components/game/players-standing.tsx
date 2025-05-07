import type { Player, Profile } from "@/types/supabase";
import { Award, Medal, Trophy } from "lucide-react";
import type { ElementType } from "react";

// Props for the new PlayerPodiumCard component
type PlayerPodiumCardProps = {
  player: Player & { profile: Profile };
  MedalIcon: ElementType;
  gradientClass: string;
  medalSizeClass: string;
  iconSizeClass: string;
  scoreClass: string;
};

// New PlayerPodiumCard component
const PlayerPodiumCard = ({
  player,
  MedalIcon,
  gradientClass,
  medalSizeClass,
  iconSizeClass,
  scoreClass,
}: PlayerPodiumCardProps) => {
  return (
    <div className="flex flex-col items-center w-32 min-w-0 min-h-[190px]">
      {/* Medal Row */}
      <div className="flex justify-center items-end mb-1 h-20">
        <div
          className={`flex justify-center items-center rounded-full ${medalSizeClass} ${gradientClass} emboss`}
        >
          <MedalIcon
            className={`${iconSizeClass} text-white dark:text-black`}
          />
        </div>
      </div>
      {/* Score Row */}
      <div className="flex justify-center items-end mb-1 h-10">
        <p className={`font-bold ${scoreClass}`}>{player.score}</p>
      </div>
      {/* Name Row */}
      <div className="flex justify-center items-start pt-1 w-full min-h-[3em] text-center">
        <p className="max-w-full font-medium break-words whitespace-pre-line hyphens-auto">
          {player.profile.full_name}
        </p>
      </div>
    </div>
  );
};

interface PlayersStandingProps {
  players: (Player & { profile: Profile })[];
}

export const PlayersStanding = ({ players }: PlayersStandingProps) => {
  // Sort players by score (descending)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  // Get top 3 players
  const winners = sortedPlayers.slice(0, 3);

  return (
    <>
      <div className="flex justify-center items-end space-x-4 py-8">
        {winners.length > 1 && (
          <PlayerPodiumCard
            player={winners[1]}
            MedalIcon={Medal}
            gradientClass="silver-gradient"
            medalSizeClass="w-16 h-16"
            iconSizeClass="w-8 h-8"
            scoreClass="text-2xl"
          />
        )}

        {winners.length > 0 && (
          <PlayerPodiumCard
            player={winners[0]}
            MedalIcon={Trophy}
            gradientClass="gold-gradient"
            medalSizeClass="w-20 h-20"
            iconSizeClass="w-10 h-10"
            scoreClass="text-gradient text-3xl"
          />
        )}

        {winners.length > 2 && (
          <PlayerPodiumCard
            player={winners[2]}
            MedalIcon={Award}
            gradientClass="bronze-gradient"
            medalSizeClass="w-16 h-16"
            iconSizeClass="w-8 h-8"
            scoreClass="text-2xl"
          />
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
