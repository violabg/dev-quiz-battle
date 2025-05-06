# set_game_code()

[← Back to Supabase Docs](./supabase.md)

## Purpose

Ensures every new game in the `games` table has a unique code. If a code is not provided, it generates one using `generate_unique_game_code()`.

## How it works

- This is a **trigger function**: it runs before a new row is inserted into the `games` table.
- If the `code` field is empty, it generates a new code and checks for uniqueness.

## SQL Code Explained

```sql
CREATE OR REPLACE FUNCTION set_game_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    LOOP
      NEW.code := generate_unique_game_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM games WHERE code = NEW.code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = 'public';
```

- Checks if the new game's code is missing.
- Generates a code and ensures it doesn't already exist in the `games` table.
- Returns the new row with the code set.

## Usage

- Linked to the `trigger_set_game_code` trigger on the `games` table.
