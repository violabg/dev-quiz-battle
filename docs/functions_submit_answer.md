# submit_answer(...)

[← Back to Supabase Docs](./supabase.md)

## Purpose

Handles answer submission for a question, checks correctness, updates scores, and ends the question if answered correctly. All in a single, atomic operation.

## How it works

- This is a **PL/pgSQL function** that:
  1. Checks if the question exists.
  2. Retrieves question data (including `ended_at` and `correct_answer`) using `FOR SHARE` to allow concurrent reads but prevent changes to the row by other transactions until the current transaction completes.
  3. Checks if the question has already ended. If so, it raises an exception.
  4. Ensures the player hasn\'t already answered this specific question. If so, it raises an exception.
  5. Determines if the submitted `p_selected_option` matches the `v_correct_answer`. It handles cases where `p_selected_option` might be `NULL` by treating the answer as incorrect.
  6. If the answer is correct, it calculates the score using the `calculate_score` function.
  7. Inserts the answer (correct or incorrect) into the `answers` table.
  8. If the answer was correct:
     a. Sets `v_was_winning_answer` to `TRUE`.
     b. Atomically attempts to update the `questions` table to set `ended_at = NOW()`. This update only succeeds if `ended_at` is currently `NULL`, ensuring only the first correct answer effectively ends the question.
     c. Updates the player\'s score in the `game_players` table.
     d. Updates the player\'s score for the specific language of the question in the `player_language_scores` table.
     e. Logs details about the score updates and whether this call was the one that ended the question.
  9. Returns the `answer_id`, `was_winning_answer` flag, and `score_earned`.

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
SET search_path = \'public\'
AS $$
DECLARE
  v_answer_id UUID;
  v_ended_at TIMESTAMP;
  v_correct_answer INTEGER;
  v_is_correct BOOLEAN := FALSE;
  v_score_earned DECIMAL := 0;
  v_was_winning_answer BOOLEAN := FALSE;
  v_update_id UUID;
  v_question_exists_count INTEGER;
  v_player_answered_count INTEGER;
  v_rows_affected INTEGER; -- For GET DIAGNOSTICS
BEGIN
  -- 1. First check if the question exists
  SELECT COUNT(*) INTO v_question_exists_count FROM questions WHERE id = p_question_id;

  IF v_question_exists_count = 0 THEN
    RAISE LOG \'Question % not found\', p_question_id;
    RAISE EXCEPTION \'[QNOTF] Question not found\' USING ERRCODE = \'P0003\';
  END IF;

  -- 2. Get the question data with a FOR SHARE lock
  -- correct_answer is NOT NULL in the questions table, so it will be populated.
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
    RAISE LOG \'Question % has already ended at %\', p_question_id, v_ended_at;
    RAISE EXCEPTION \'[QEND] Question has already ended\' USING ERRCODE = \'P0001\';
  END IF;

  -- 4. Check if player has already answered
  SELECT COUNT(*) INTO v_player_answered_count
  FROM answers
  WHERE question_id = p_question_id AND player_id = p_player_id;

  IF v_player_answered_count > 0 THEN
    RAISE LOG \'Player % has already answered question %\', p_player_id, p_question_id;
    RAISE EXCEPTION \'[ADUP] Player has already submitted an answer\' USING ERRCODE = \'P0002\';
  END IF;

  -- 5. Determine if answer is correct
  v_is_correct := (p_selected_option = v_correct_answer);

  -- If p_selected_option was SQL NULL, the comparison (p_selected_option = v_correct_answer) yields SQL NULL.
  -- Treat this as incorrect. The answers.selected_option is NOT NULL, so client should not send NULL.
  IF v_is_correct IS NULL THEN
    v_is_correct := FALSE;
    RAISE LOG \'Answer comparison: p_selected_option was NULL or comparison resulted in NULL. Treated as incorrect. selected=%, correct=%\',
              p_selected_option, v_correct_answer;
  ELSE
    RAISE LOG \'Answer comparison: selected=%, correct=%, is_correct=%\',
              p_selected_option, v_correct_answer, v_is_correct;
  END IF;

  -- 6. Calculate score if correct
  IF v_is_correct THEN
    v_score_earned := calculate_score(p_response_time_ms, p_time_limit_ms);
    RAISE LOG \'Score calculated: %\', v_score_earned;
  END IF;

  -- 7. Insert the answer
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

  -- 8. If correct answer, try to end the question and update scores
  IF v_is_correct THEN
    -- This flag indicates to the calling client that *their* answer was correct.
    v_was_winning_answer := TRUE;

    -- Try to end the question. This only succeeds for the first correct answer
    -- due to the "ended_at IS NULL" condition, ensuring atomicity for ending.
    UPDATE questions
    SET ended_at = NOW()
    WHERE id = p_question_id AND ended_at IS NULL
    RETURNING id INTO v_update_id;

    RAISE LOG \'Question end attempt: question_id=%, player_id=%, ended_by_this_call=%\',
              p_question_id, p_player_id, (v_update_id IS NOT NULL);

    -- Update player\'s game score for this correct answer
    UPDATE game_players
    SET score = score + v_score_earned
    WHERE game_id = p_game_id AND player_id = p_player_id;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RAISE LOG \'Player % game_players score updated by % points (rows: %)\',
              p_player_id, v_score_earned, v_rows_affected;

    -- Update player_language_scores for the language of the question
    DECLARE
      v_language TEXT;
    BEGIN
      SELECT language INTO v_language FROM questions WHERE id = p_question_id;
      IF v_language IS NOT NULL THEN
        INSERT INTO player_language_scores (player_id, language, total_score)
        VALUES (p_player_id, v_language, v_score_earned)
        ON CONFLICT (player_id, language)
        DO UPDATE SET total_score = player_language_scores.total_score + EXCLUDED.total_score;

        GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
        RAISE LOG \'Updated player_language_scores for player %, language %, score % (rows: %)\',
                  p_player_id, v_language, v_score_earned, v_rows_affected;
      ELSE
        RAISE LOG \'Could not determine language for question % to update player_language_scores.\', p_question_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG \'Error updating player_language_scores for player %, language %: %\', p_player_id, v_language, SQLERRM;
    END;

    IF v_update_id IS NOT NULL THEN
      -- This specific call was the one that ended the question
      RAISE LOG \'Question % ended successfully by player %\', p_question_id, p_player_id;
    ELSE
      -- This answer was correct, but another correct answer had already ended the question
      RAISE LOG \'Question % was already ended when player % submitted a correct answer.\',
                p_question_id, p_player_id;
    END IF;
  END IF;

  -- 9. Return results
  RETURN QUERY SELECT v_answer_id, v_was_winning_answer, v_score_earned;
END;
$$;
```

- The function is defensive: it checks for question existence, if the question is still open, and if the player already answered.
- It relies on the `NOT NULL` constraint for `questions.correct_answer` and the `NOT NULL` constraint for `answers.selected_option`.
- If the answer is correct, it ends the question (atomically), updates scores, and records the answer.
- Returns the `answer_id`, whether this answer was the one that ended the question (`was_winning_answer`), and the `score_earned`.
- Uses `RAISE LOG` for detailed logging of operations and potential issues.
- Uses `GET DIAGNOSTICS` to check row counts for score updates.

## Usage

- Called from the app when a player submits an answer to a question.
