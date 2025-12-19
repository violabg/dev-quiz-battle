# Set Game Code

[← Back to Convex Docs](./convex.md)

## Purpose

Ensures every new game has a unique code. The code is always generated automatically in the `createGame` mutation.

## How it works

- In Convex, the game code is generated directly in the mutation logic.
- No separate trigger needed - the mutation handles code generation atomically.
- The code is required and always generated during game creation.

## Implementation

See the `createGame` mutation in `convex/mutations/games.ts`:

```typescript
export const createGame = mutation({
  args: {
    max_players: v.optional(v.number()),
    time_limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    // Generate unique code
    const code = await generateUniqueCode(ctx);
    const now = Date.now();

    // Create game with generated code
    const gameId = await ctx.db.insert("games", {
      code,
      host_id: userId,
      status: "waiting",
      max_players: args.max_players ?? 8,
      current_turn: 0,
      time_limit: args.time_limit ?? 120,
      created_at: now,
      updated_at: now,
    });

    // Auto-join host as first player
    await ctx.db.insert("game_players", {
      game_id: gameId,
      player_id: userId,
      score: 0,
      turn_order: 0,
      is_active: true,
      joined_at: now,
    });

    return { gameId, code };
  },
});
```

- Code is always generated for new games
- Uniqueness is checked during generation
- Host is automatically added as the first player

## Usage

```typescript
const createGame = useMutation(api.mutations.games.createGame);
const { gameId, code } = await createGame({
  max_players: 4,
  time_limit: 120,
});

console.log(`Game created with code: ${code}`);
```
