import { PlayersStanding } from "@/components/game/players-standing";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  getLeaderboardPlayers,
  LeaderboardPlayer,
} from "@/lib/supabase/supabase-game-players";
import { redirect } from "next/navigation";

const PAGE_SIZE = 10;

// This type matches the shape expected by PlayersStanding
interface LeaderboardPlayerForStanding {
  id: string;
  score: number;
  profile: {
    id: string;
    username: string;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
  };
  // The following fields are required by Player but are not used in leaderboard context
  game_id: string;
  player_id: string;
  turn_order: number;
  is_active: boolean;
  joined_at: string;
}

async function getPlayers(page: number) {
  const offset = (page - 1) * PAGE_SIZE;
  const limit = PAGE_SIZE;
  // Use helper from supabase-game-players
  const data = await getLeaderboardPlayers(offset, limit);
  // Map to expected structure for PlayersStanding
  const players: LeaderboardPlayerForStanding[] = (
    data as LeaderboardPlayer[]
  ).map((p) => ({
    id: p.player_id,
    score: Number(p.total_score),
    profile: {
      id: p.player_id,
      username: p.username,
      avatar_url: p.avatar_url,
      created_at: "",
      updated_at: "",
    },
    game_id: "",
    player_id: p.player_id,
    turn_order: 0,
    is_active: true,
    joined_at: "",
  }));
  return {
    players,
    count: data.length || 0,
  };
}

export default async function LeaderboardPage(props: {
  searchParams: { page?: string };
}) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const { players, count } = await getPlayers(page);
  const totalPages = Math.ceil(count / PAGE_SIZE);

  if (page > totalPages && totalPages > 0)
    redirect(`/leaderboard?page=${totalPages}`);

  return (
    <main className="mx-auto px-4 py-10 max-w-2x container">
      <h1 className="mb-8 font-bold text-gradient text-3xl text-center">
        Leaderboard
      </h1>
      <PlayersStanding players={players} />
      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={`/leaderboard?page=${page - 1}`}
                aria-disabled={page === 1}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href={`/leaderboard?page=${i + 1}`}
                  isActive={page === i + 1}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href={`/leaderboard?page=${page + 1}`}
                aria-disabled={page === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </main>
  );
}
