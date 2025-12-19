# Leaderboard Query

[← Back to Convex Docs](./convex.md)

## Purpose

Returns a paginated list of players for the leaderboard, optionally filtered by programming language.

## How it works

- This is a **Convex query** located in `convex/queries/leaderboard.ts`.
- Returns player info and scores with pagination and optional language filtering.
- If a language is provided, it uses the `player_language_scores` table; otherwise, it uses the `users` table.

## Convex Query Implementation

```typescript
export const getLeaderboard = query({
  args: {
    language: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    let players: LeaderboardPlayer[];

    if (args.language) {
      // Get scores filtered by language
      const languageScores = await ctx.db
        .query("player_language_scores")
        .withIndex("by_language", (q) => q.eq("language", args.language!))
        .collect();

      players = await Promise.all(
        languageScores.map(async (score) => {
          const user = await ctx.db.get(score.player_id);
          return {
            player_id: score.player_id,
            total_score: score.total_score,
            user,
          };
        })
      );
    } else {
      // Get all users sorted by total score
      const allUsers = await ctx.db
        .query("users")
        .withIndex("by_total_score")
        .order("desc")
        .collect();

      players = allUsers.map((user) => ({
        player_id: user._id,
        total_score: user.total_score ?? 0,
        user,
      }));
    }

    // Sort and paginate
    players.sort((a, b) => b.total_score - a.total_score);
    const total = players.length;
    const paginatedPlayers = players.slice(offset, offset + pageSize);

    return {
      players: paginatedPlayers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },
});
```

- Queries either `player_language_scores` (if language filter provided) or `users` table.
- Sorts by total score in descending order.
- Returns paginated results with metadata.

## Usage

```typescript
const leaderboard = useQuery(api.queries.leaderboard.getLeaderboard, {
  language: "javascript",
  page: 1,
  pageSize: 10,
});
```
