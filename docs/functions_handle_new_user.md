# User Creation & Authentication

[← Back to Convex Docs](./convex.md)

## Purpose

Handles user creation and authentication via Convex Auth. User data is automatically stored in the `users` table.

## How it works

- Convex Auth automatically manages user accounts in the `users` table.
- User profile data (name, email, username, image) is stored directly in the `users` table.
- No separate trigger or function needed - Convex Auth handles this natively.

## Schema

The `users` table is defined in `convex/schema.ts`:

```typescript
users: defineTable({
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  first_name: v.optional(v.string()),
  last_name: v.optional(v.string()),
  username: v.optional(v.string()),
  total_score: v.optional(v.number()),
  games_played: v.optional(v.number()),
});
```

## Updating User Profile

Users can update their profile using the mutation in `convex/mutations/auth.ts`:

```typescript
export const updateUser = mutation({
  args: {
    name: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    await ctx.db.patch(userId, args);
  },
});
```

## Usage

- Authentication is configured in `convex/auth.config.ts`
- User data is automatically created when a user signs up
- Access current user via `useQuery(api.queries.auth.currentUser)`
