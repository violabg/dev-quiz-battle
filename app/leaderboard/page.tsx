"use client";

import { PlayersStanding } from "@/components/game/players-standing";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Crown, Loader2, Medal, Trophy } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import LeaderboardLanguageFilter from "./LeaderboardLanguageFilter";

const PAGE_SIZE = 10;

const LeaderboardPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const languageFilter = searchParams.get("language") || undefined;

  // Calculate pagination offset
  const paginationOpts = useMemo(
    () => ({
      languageFilter,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [languageFilter, page],
  );

  // Query leaderboard data
  const leaderboardData = useQuery(
    api.queries.leaderboard.getLeaderboardPlayers,
    paginationOpts,
  );

  // Redirect if page is out of bounds - must be before conditional return
  const count = leaderboardData?.totalItems ?? 0;
  const totalPages = Math.ceil(count / PAGE_SIZE);

  useEffect(() => {
    if (leaderboardData && page > totalPages && totalPages > 0) {
      router.push(
        `/leaderboard?page=${totalPages}${
          languageFilter ? `&language=${languageFilter}` : ""
        }`,
      );
    }
  }, [page, totalPages, languageFilter, router, leaderboardData]);

  // Loading state
  if (leaderboardData === undefined) {
    return (
      <main className="flex flex-1 justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </main>
    );
  }

  // Transform data to match PlayersStanding expected format
  const players = leaderboardData.players.map((p, index) => {
    // Create a game player structure expected by PlayersStanding
    return {
      _id: p.player_id as any, // Using player_id as the _id
      _creationTime: 0, // Not relevant for leaderboard
      game_id: "" as any, // Not relevant for leaderboard
      player_id: p.player_id as any,
      score: p.total_score,
      turn_order: index,
      is_active: true,
      joined_at: 0, // Not relevant for leaderboard
      user: p.user as Doc<"users"> | null,
    };
  });

  return (
    <main className="quest-page">
      <div className="space-y-8 container">
        <section className="p-6 md:p-8 gradient-border quest-panel">
          <div className="lg:items-end gap-6 grid lg:grid-cols-[1fr_0.85fr]">
            <div className="space-y-4">
              <p className="quest-kicker">Registro della gilda</p>
              <h1 className="font-dqb text-4xl md:text-6xl">Classifica</h1>
              <p className="max-w-2xl text-muted-foreground text-base md:text-lg leading-8">
                Un ledger competitivo per vedere chi domina davvero la campagna.
                Filtra per linguaggio e scorri la progressione come in un albo
                d&apos;onore.
              </p>
            </div>
            <div className="gap-4 grid sm:grid-cols-3">
              <div className="quest-stat">
                <Crown className="mb-3 size-5 text-primary" />
                <p className="font-dqb text-2xl">Top rank</p>
                <p className="mt-2 text-muted-foreground text-sm leading-7">
                  Focus sui campioni correnti.
                </p>
              </div>
              <div className="quest-stat">
                <Medal className="mb-3 size-5 text-accent" />
                <p className="font-dqb text-2xl">Filtro lingua</p>
                <p className="mt-2 text-muted-foreground text-sm leading-7">
                  Confronta ladder diverse senza rumore.
                </p>
              </div>
              <div className="quest-stat">
                <Trophy className="mb-3 size-5 text-primary" />
                <p className="font-dqb text-2xl">Stato vivo</p>
                <p className="mt-2 text-muted-foreground text-sm leading-7">
                  Punteggi aggiornati dal backend realtime.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="p-5 md:p-6 quest-panel">
          <div className="flex justify-center mb-6">
            <LeaderboardLanguageFilter language={languageFilter || ""} />
          </div>
          <PlayersStanding players={players} />
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={`/leaderboard?page=${page - 1}${
                        languageFilter ? `&language=${languageFilter}` : ""
                      }`}
                    />
                  </PaginationItem>
                )}
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
                {page < totalPages && (
                  <PaginationItem>
                    <PaginationNext
                      href={`/leaderboard?page=${page + 1}${
                        languageFilter ? `&language=${languageFilter}` : ""
                      }`}
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </section>
      </div>
    </main>
  );
};

export default LeaderboardPage;
