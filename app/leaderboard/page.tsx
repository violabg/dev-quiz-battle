import { PlayersStanding } from "@/components/game/players-standing";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboardPlayers } from "@/lib/supabase/supabase-game-players";
import { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import LeaderboardLanguageFilter from "./LeaderboardLanguageFilter";

const PAGE_SIZE = 10;

// This type matches the shape expected by PlayersStanding
interface LeaderboardPlayerForStanding {
  id: string;
  score: number;
  profile: {
    id: string;
    avatar_url: string | null;
    user_name: string;
    name: string;
    full_name: string;
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

async function getPlayers(
  supabase: SupabaseClient,
  page: number,
  languageFilter?: string
) {
  const offset = (page - 1) * PAGE_SIZE;
  const limit = PAGE_SIZE;
  const data = await getLeaderboardPlayers(
    supabase,
    offset,
    limit,
    languageFilter
  );
  const players: LeaderboardPlayerForStanding[] = data.map((p) => ({
    id: p.player_id,
    score: Number(p.total_score),
    profile: {
      id: p.player_id,
      name: p.name,
      full_name: p.full_name,
      user_name: p.user_name,
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
  // Use total_items from the first row if available, otherwise fallback to 0
  const count = data.length > 0 ? Number(data[0].total_items) : 0;
  return {
    players,
    count,
  };
}

const LeaderboardPage = async (props: {
  searchParams: { page?: string; language?: string };
}) => {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const languageFilter = searchParams?.language || undefined;
  const { players, count } = await getPlayers(supabase, page, languageFilter);
  const totalPages = Math.ceil(count / PAGE_SIZE);

  if (page > totalPages && totalPages > 0)
    redirect(
      `/leaderboard?page=${totalPages}${
        languageFilter ? `&language=${languageFilter}` : ""
      }`
    );

  return (
    <main className="mx-auto px-4 py-10 max-w-2x container">
      <h1 className="mb-8 font-bold text-gradient text-3xl text-center">
        Leaderboard
      </h1>
      <div className="flex justify-center mb-6">
        {/* Client component for language filter */}
        <LeaderboardLanguageFilter language={languageFilter || ""} />
      </div>
      <PlayersStanding players={players} />
      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={`/leaderboard?page=${page - 1}${
                  languageFilter ? `&language=${languageFilter}` : ""
                }`}
                aria-disabled={page === 1}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href={`/leaderboard?page=${i + 1}${
                    languageFilter ? `&language=${languageFilter}` : ""
                  }`}
                  isActive={page === i + 1}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href={`/leaderboard?page=${page + 1}${
                  languageFilter ? `&language=${languageFilter}` : ""
                }`}
                aria-disabled={page === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </main>
  );
};

export default LeaderboardPage;
