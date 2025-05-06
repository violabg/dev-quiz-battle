# generate_unique_game_code()

[← Back to Supabase Docs](./supabase.md)

## Purpose

Generates a unique 6-character code for each new game, used for joining games easily.

## How it works

- This is a **PL/pgSQL function** that returns a random code made of uppercase letters and numbers (excluding ambiguous ones).
- Used by a trigger to set the `code` field in the `games` table if not provided.

## SQL Code Explained

```sql
CREATE OR REPLACE FUNCTION public.generate_unique_game_code()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER := 0;
  pos INTEGER := 0;
BEGIN
   FOR i IN 1..6 LOOP
    pos := 1 + FLOOR(RANDOM() * LENGTH(chars));
    result := result || SUBSTRING(chars FROM pos FOR 1);
  END LOOP;
  RETURN result;
END;
$$;
```

- `chars` is the set of allowed characters.
- The loop picks 6 random characters to build the code.
- The function returns the generated code as text.

## Usage

- Called by the `set_game_code` trigger function before inserting a new game.
