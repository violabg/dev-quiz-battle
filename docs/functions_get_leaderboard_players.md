# get_leaderboard_players(offset, limit, language_filter)

[← Back to Supabase Docs](./supabase.md)

## Purpose

Returns a paginated list of players for the leaderboard, optionally filtered by programming language.

## How it works

- This is a **PL/pgSQL function** that returns player info and scores, with pagination and optional language filtering.
- If a language is provided, it uses the `player_language_scores` table; otherwise, it sums scores from all games.

## SQL Code Explained

```sql
CREATE OR REPLACE FUNCTION get_leaderboard_players(
  offset_value integer,
  limit_value integer,
  language_filter text DEFAULT NULL
)
RETURNS TABLE (
  player_id uuid,
  total_score numeric,
  name text,
  full_name text,
  user_name text,
  avatar_url text,
  total_items bigint
) AS $$
BEGIN
  IF language_filter IS NOT NULL AND length(trim(language_filter)) > 0 THEN
    RETURN QUERY
      WITH filtered AS (
        SELECT
          pls.player_id,
          pls.total_score,
          p.name,
          p.full_name,
          p.user_name,
          p.avatar_url
        FROM player_language_scores pls
        JOIN profiles p ON pls.player_id = p.id
        WHERE pls.language = language_filter
      ), counted AS (
        SELECT *, count(*) OVER() AS total_items
        FROM filtered
        ORDER BY total_score DESC
        LIMIT limit_value OFFSET offset_value
      )
      SELECT * FROM counted;
  ELSE
    RETURN QUERY
      WITH filtered AS (
        SELECT
          gp.player_id,
          SUM(gp.score) AS total_score,
          p.name,
          p.full_name,
          p.user_name,
          p.avatar_url
        FROM game_players gp
        JOIN profiles p ON gp.player_id = p.id
        GROUP BY gp.player_id, p.name, p.full_name, p.user_name, p.avatar_url
      ), counted AS (
        SELECT *, count(*) OVER() AS total_items
        FROM filtered
        ORDER BY total_score DESC
        LIMIT limit_value OFFSET offset_value
      )
      SELECT * FROM counted;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = 'public';
```

- Uses a CTE (WITH clause) to filter and count leaderboard entries.
- Returns player info, score, and the total number of items for pagination.
- If a language is provided, only scores for that language are shown.

## Usage

- Used to display the leaderboard in the app, with pagination and optional language filter.
