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
import { Loader2 } from "lucide-react";
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
    [languageFilter, page]
  );

  // Query leaderboard data
  const leaderboardData = useQuery(
    api.leaderboard.getLeaderboardPlayers,
    paginationOpts
  );

  // Redirect if page is out of bounds - must be before conditional return
  const count = leaderboardData?.totalItems ?? 0;
  const totalPages = Math.ceil(count / PAGE_SIZE);

  useEffect(() => {
    if (leaderboardData && page > totalPages && totalPages > 0) {
      router.push(
        `/leaderboard?page=${totalPages}${
          languageFilter ? `&language=${languageFilter}` : ""
        }`
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
  const players = leaderboardData.players.map((p) => {
    // Type guard to check if p.user is a users document (not a system table document)
    const isUserDoc = (obj: typeof p.user): obj is Doc<"users"> => {
      return (
        obj !== null &&
        "_id" in obj &&
        typeof obj._id === "string" &&
        obj._id.includes("users")
      );
    };

    const user = isUserDoc(p.user) ? p.user : null;

    return {
      id: p.player_id,
      score: p.total_score,
      profile: {
        id: p.player_id,
        name: user?.name || "",
        full_name: user?.name || user?.username || "Unknown",
        user_name: user?.username || "",
        avatar_url: user?.image || null,
        created_at: "",
        updated_at: "",
      },
      game_id: "",
      player_id: p.player_id,
      turn_order: 0,
      is_active: true,
      joined_at: "",
    };
  });

  return (
    <main className="mx-auto px-4 py-10 max-w-2x container">
      <h1 className="mb-8 font-dqb text-gradient text-4xl text-center">
        Classifica
      </h1>
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
    </main>
  );
};

export default LeaderboardPage;
