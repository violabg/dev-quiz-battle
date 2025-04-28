import { PlayersStanding } from "@/components/game/players-standing";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { createServerSupabase } from "@/lib/supabase-server";
import type { Player, Profile } from "@/types/supabase";
import { redirect } from "next/navigation";

const PAGE_SIZE = 10;

async function getPlayers(page: number) {
  const supabase = createServerSupabase();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  // Query unique players by player_id, highest score per player
  const { data, error } = await supabase
    .from("game_players")
    .select("*, profile:profiles(*)")
    .order("score", { ascending: false })
    .order("joined_at", { ascending: true })
    .limit(1000); // fetch enough to dedupe in-memory
  if (error) throw error;
  // Deduplicate by player_id, keep highest score
  const uniqueMap = new Map<string, Player & { profile: Profile }>();
  (data as (Player & { profile: Profile })[]).forEach((p) => {
    if (!uniqueMap.has(p.player_id)) {
      uniqueMap.set(p.player_id, p);
    }
  });
  const uniquePlayers = Array.from(uniqueMap.values()).sort(
    (a, b) => b.score - a.score
  );
  const pagedPlayers = uniquePlayers.slice(from, to + 1);
  return {
    players: pagedPlayers,
    count: uniquePlayers.length,
  };
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
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
