# Get User Profile with Score

[← Back to Convex Docs](./convex.md)

## Purpose

Returns a user's profile information along with their total score across all games.

## How it works

- In Convex, user profile data is stored directly in the `users` table.
- The `total_score` and `games_played` fields are maintained in the user record.
- No separate query needed - just access the user record.

## Implementation

```typescript
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});
```

The user document includes:

- `name` - User's display name
- `username` - Unique username
- `email` - User's email
- `image` - Avatar URL
- `total_score` - Cumulative score across all games
- `games_played` - Total number of games played

## Usage

```typescript
const user = useQuery(api.queries.auth.currentUser);

if (user) {
  console.log(`${user.name} has ${user.total_score} points`);
}
```
