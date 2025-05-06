# submit_answer(...)

[← Back to Supabase Docs](./supabase.md)

## Purpose

Handles answer submission for a question, checks correctness, updates scores, and ends the question if answered correctly. All in a single, atomic operation.

## How it works

- This is a **PL/pgSQL function** that:
  1. Checks if the question exists and is still open.
  2. Ensures the player hasn't already answered.
  3. Checks if the answer is correct (with multiple comparison methods).
  4. If correct, calculates score, ends the question, and updates player and per-language scores.
  5. Inserts the answer and returns the result (answer id, if it was the winning answer, and score earned).

## SQL Code Explained

```sql
CREATE OR REPLACE FUNCTION submit_answer(
  p_question_id UUID,
  p_player_id UUID,
  p_game_id UUID,
  p_selected_option INTEGER,
  p_response_time_ms INTEGER,
  p_time_limit_ms INTEGER
)
RETURNS TABLE(
  answer_id UUID,
  was_winning_answer BOOLEAN,
  score_earned DECIMAL
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  v_answer_id UUID;
  v_ended_at TIMESTAMP;
  v_correct_answer INTEGER;
  v_is_correct BOOLEAN := FALSE;
  v_score_earned DECIMAL := 0;
  v_was_winning_answer BOOLEAN := FALSE;
  v_update_id UUID;
  v_count INTEGER;
BEGIN
  -- 1. First check if the question exists
  SELECT COUNT(*) INTO v_count FROM questions WHERE id = p_question_id;
  IF v_count = 0 THEN
    RAISE LOG 'Question % not found', p_question_id;
    RAISE EXCEPTION '[QNOTF] Question not found' USING ERRCODE = 'P0003';
  END IF;

  -- 2. Get the question data with a FOR SHARE lock (less restrictive than FOR UPDATE)
  SELECT
    ended_at,
    correct_answer
  INTO
    v_ended_at,
    v_correct_answer
  FROM questions
  WHERE id = p_question_id
  FOR SHARE;

  -- 3. Check if question has already ended
  IF v_ended_at IS NOT NULL THEN
    RAISE LOG 'Question % has already ended at %', p_question_id, v_ended_at;
    RAISE EXCEPTION '[QEND] Question has already ended' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Check if player has already answered
  SELECT COUNT(*) INTO v_count
  FROM answers
  WHERE question_id = p_question_id AND player_id = p_player_id;
  IF v_count > 0 THEN
    RAISE LOG 'Player % has already answered question %', p_player_id, p_question_id;
    RAISE EXCEPTION '[ADUP] Player has already submitted an answer' USING ERRCODE = 'P0002';
  END IF;

  -- 5. Make absolutely sure we have a correct_answer value
  IF v_correct_answer IS NULL THEN
    -- Try to fetch it again with a stronger approach
    BEGIN
      SELECT correct_answer INTO STRICT v_correct_answer
      FROM questions
      WHERE id = p_question_id;
      IF v_correct_answer IS NULL THEN
        RAISE LOG 'Critical error: Question % has NULL correct_answer even after retry', p_question_id;
        RAISE EXCEPTION '[QINV] Question has no correct answer defined' USING ERRCODE = 'P0005';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error retrieving correct_answer: %', SQLERRM;
      RAISE EXCEPTION '[QINV] Could not determine correct answer' USING ERRCODE = 'P0005';
    END;
  END IF;

  -- 6. Determine if answer is correct with multiple comparison methods to avoid NULL issues
  BEGIN
    v_is_correct := (p_selected_option = v_correct_answer);
    IF v_is_correct IS NULL THEN
      v_is_correct := (p_selected_option::INTEGER = v_correct_answer::INTEGER);
    END IF;
    IF v_is_correct IS NULL THEN
      v_is_correct := (p_selected_option::TEXT = v_correct_answer::TEXT);
    END IF;
    IF v_is_correct IS NULL THEN
      v_is_correct := FALSE;
    END IF;
  END;

  -- 7. Calculate score if correct
  IF v_is_correct THEN
    v_score_earned := calculate_score(p_response_time_ms, p_time_limit_ms);
  END IF;

  -- 8. Insert the answer
  INSERT INTO answers (
    question_id,
    player_id,
    selected_option,
    is_correct,
    response_time_ms,
    score_earned
  )
  VALUES (
    p_question_id,
    p_player_id,
    p_selected_option,
    v_is_correct,
    p_response_time_ms,
    v_score_earned
  )
  RETURNING id INTO v_answer_id;

  -- 9. If correct answer, end the question and update score
  IF v_is_correct THEN
    v_was_winning_answer := TRUE;
    UPDATE questions
    SET ended_at = NOW()
    WHERE id = p_question_id AND ended_at IS NULL
    RETURNING id INTO v_update_id;
    UPDATE game_players
    SET score = score + v_score_earned
    WHERE game_id = p_game_id AND player_id = p_player_id;
    DECLARE v_language TEXT;
    BEGIN
      SELECT language INTO v_language FROM questions WHERE id = p_question_id;
      IF v_language IS NOT NULL THEN
        INSERT INTO player_language_scores (player_id, language, total_score)
        VALUES (p_player_id, v_language, v_score_earned)
        ON CONFLICT (player_id, language)
        DO UPDATE SET total_score = player_language_scores.total_score + EXCLUDED.total_score;
      END IF;
    END;
  END IF;

  -- 10. Return results
  RETURN QUERY SELECT v_answer_id, v_was_winning_answer, v_score_earned;
END;
$$;
```

- The function is very defensive: it checks for question existence, if the question is still open, and if the player already answered.
- It uses multiple ways to compare answers to avoid type issues.
- If the answer is correct, it ends the question, updates scores, and records the answer.
- Returns the answer id, whether it was the winning answer, and the score earned.

## Usage

- Called from the app when a player submits an answer to a question.
