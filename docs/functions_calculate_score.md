# calculate_score(response_time_ms, time_limit_ms)

[← Back to Supabase Docs](./supabase.md)

## Purpose

Calculates a player's score for a question based on how quickly they answered, rewarding faster responses.

## How it works

- This is a **PL/pgSQL function** that takes the player's response time and the allowed time limit.
- Returns a score: base score (1.0) plus a time bonus (ranging from 0.0 to 9.0). The total score can range from 1.0 (if `time_bonus` is 0.0) to 10.0 (if `time_bonus` is 9.0).

## SQL Code Explained

```sql
CREATE OR REPLACE FUNCTION calculate_score(
  response_time_ms INTEGER,
  time_limit_ms INTEGER
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  base_score DECIMAL := 1.0;
  time_bonus DECIMAL := 0.0;
  t1 DECIMAL := time_limit_ms * 0.05;   -- 5%
  t2 DECIMAL := time_limit_ms * 0.10;   -- 10%
  t3 DECIMAL := time_limit_ms * 0.15;   -- 15%
  t4 DECIMAL := time_limit_ms * 0.20;   -- 20%
  t5 DECIMAL := time_limit_ms * 0.30;   -- 30%
  t6 DECIMAL := time_limit_ms * 0.40;   -- 40%
  t7 DECIMAL := time_limit_ms * 0.55;   -- 55%
  t8 DECIMAL := time_limit_ms * 0.70;   -- 70%
  t9 DECIMAL := time_limit_ms * 0.85;   -- 85%
  t10 DECIMAL := time_limit_ms;         -- 100%
BEGIN
  IF response_time_ms < t1 THEN
    time_bonus := 9.0;
  ELSIF response_time_ms < t2 THEN
    time_bonus := 8.0;
  ELSIF response_time_ms < t3 THEN
    time_bonus := 7.0;
  ELSIF response_time_ms < t4 THEN
    time_bonus := 6.0;
  ELSIF response_time_ms < t5 THEN
    time_bonus := 5.0;
  ELSIF response_time_ms < t6 THEN
    time_bonus := 4.0;
  ELSIF response_time_ms < t7 THEN
    time_bonus := 3.0;
  ELSIF response_time_ms < t8 THEN
    time_bonus := 2.0;
  ELSIF response_time_ms < t9 THEN
    time_bonus := 1.0;
  ELSIF response_time_ms < t10 THEN
    time_bonus := 0.5;
  END IF;

  RETURN base_score + time_bonus;
END;
$$;
```

- The function divides the time limit into intervals.
- The faster the answer, the higher the bonus (up to 9.0).
- If the `response_time_ms` is equal to or exceeds `time_limit_ms` (i.e., `t10`), the `time_bonus` is 0.0, resulting in a score of 1.0.
- Returns the total score for the answer.

## Usage

- Used by the `submit_answer` function to calculate points for correct answers.
