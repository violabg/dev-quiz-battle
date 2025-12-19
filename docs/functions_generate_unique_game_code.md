# Generate Unique Game Code

[← Back to Convex Docs](./convex.md)

## Purpose

Generates a unique 6-character code for each new game, used for joining games easily.

## How it works

- This is a helper function in the `createGame` mutation in `convex/mutations/games.ts`.
- Returns a random code made of uppercase letters and numbers (excluding ambiguous ones).
- Checks for uniqueness in the database before returning.

## TypeScript Implementation

```typescript
const generateUniqueCode = async (ctx: MutationCtx): Promise<string> => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");

    const existing = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!existing) {
      return code;
    }

    attempts++;
  } while (attempts < maxAttempts);

  throw new ConvexError("Failed to generate unique game code");
};
```

- `chars` is the set of allowed characters (excludes ambiguous characters like 0, O, I, 1).
- The loop generates random codes and checks for uniqueness.
- Returns the generated code or throws an error if unable to generate a unique code after max attempts.

## Usage

```typescript
export const createGame = mutation({
  handler: async (ctx, args) => {
    const code = await generateUniqueCode(ctx);
    const gameId = await ctx.db.insert("games", {
      code,
      // ... other fields
    });
    return { gameId, code };
  },
});
```
