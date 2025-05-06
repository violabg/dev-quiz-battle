# get_user_profile_with_score(user_id)

[← Back to Supabase Docs](./supabase.md)

## Purpose

Returns a user's profile information along with their total score across all games.

## How it works

- This is a **PL/pgSQL function** that joins the `profiles` and `game_players` tables.
- Sums up the user's scores from all games and returns profile fields and total score.

## SQL Code Explained

```sql
CREATE OR REPLACE FUNCTION get_user_profile_with_score(user_id uuid)
RETURNS TABLE(profile_id uuid, name text, full_name text, user_name text, avatar_url text, total_score bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.name, p.full_name, p.user_name, p.avatar_url, COALESCE(SUM(gp.score)::bigint, 0) AS total_score
    FROM profiles p
    LEFT JOIN game_players gp ON p.id = gp.player_id
    WHERE p.id = user_id
    GROUP BY p.id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = 'public';
```

- Joins the user's profile with their game scores.
- Uses `COALESCE` to return 0 if the user has no games played.
- Returns all main profile fields and the total score.

## Usage

- Used to show a user's profile and their total score in the app.
