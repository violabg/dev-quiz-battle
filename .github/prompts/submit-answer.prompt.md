Can we improve syncronization across component by using as much as possible rpc function in supabase, specificly in the submit_answer where we can calculate if it is right or wrong and calculate score in correct updating all relative tables, avoiding local front end state that could lead to out off sync between clients, reccomand other improvement if neccessary

something like this:

```sql
-- Modify the existing submit_answer function
CREATE OR REPLACE FUNCTION submit_answer(
p_question_id UUID,
p_player_id UUID,
p_game_id UUID,
p_selected_option INTEGER,
p_response_time_ms INTEGER,
p_time_limit_ms INTEGER -- Add game time limit as parameter
)
RETURNS TABLE(answer_id UUID, was_winning_answer BOOLEAN, score_earned DECIMAL) -- Return more info
AS $$
DECLARE
v_answer_id UUID;
v_ended_at TIMESTAMP;
v_correct_answer INTEGER;
v_is_correct BOOLEAN;
v_score_earned DECIMAL := 0;
v_was_winning_answer BOOLEAN := false;
v_update_count INT;
BEGIN
-- 1. Check if question already ended (lock the row)
SELECT ended_at, correct_answer
INTO v_ended_at, v_correct_answer
FROM questions
WHERE id = p_question_id
FOR UPDATE; -- Lock the question row for this transaction

IF v_ended_at IS NOT NULL THEN
RAISE EXCEPTION 'Question has already ended' USING ERRCODE = 'P0001';
END IF;

-- 2. Determine correctness (moved from frontend)
v_is_correct := (p_selected_option = v_correct_answer);

-- 3. Calculate score if correct (moved from frontend)
IF v_is_correct THEN
v_score_earned := calculate_score(p_response_time_ms, p_time_limit_ms);
END IF;

-- 4. Insert the answer (using determined values)
-- Use INSERT ... ON CONFLICT DO NOTHING to handle potential race conditions gracefully
-- The UNIQUE constraint on (question_id, player_id) is key here.
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
ON CONFLICT (question_id, player_id) DO NOTHING -- Prevent duplicate answers
RETURNING id INTO v_answer_id;

-- If the insert was skipped (due to conflict), raise an exception or return NULL/empty
IF v_answer_id IS NULL THEN
RAISE EXCEPTION 'Player has already submitted an answer or a race condition occurred' USING ERRCODE = 'P0002';
-- Or alternatively: RETURN QUERY SELECT NULL::UUID, false, 0::DECIMAL; and handle null on client
END IF;

-- 5. If correct, try to end the question and update score atomically
IF v_is_correct THEN
-- Attempt to update ended_at. Only the FIRST correct answer will succeed
-- due to the WHERE ended_at IS NULL condition.
UPDATE questions
SET ended_at = NOW()
WHERE id = p_question_id AND ended_at IS NULL
RETURNING id INTO v_update_count; -- Check if update happened

    -- Check if THIS answer was the one that ended the question
    IF v_update_count IS NOT NULL THEN
      v_was_winning_answer := true;
      -- Update player score only if this was the winning answer
      UPDATE game_players
      SET score = score + v_score_earned
      WHERE game_id = p_game_id AND player_id = p_player_id;
    END IF;

END IF;

-- 6. Return the new answer ID, whether it was the winning one, and score earned
RETURN QUERY SELECT v_answer_id, v_was_winning_answer, v_score_earned;

END;

$$
LANGUAGE plpgsql SECURITY INVOKER SET search_path = 'public';

-- Also adjust the calculate_score function signature if needed (looks ok already)
CREATE OR REPLACE FUNCTION calculate_score(
  response_time_ms INTEGER,
  time_limit_ms INTEGER
)
RETURNS DECIMAL
LANGUAGE plpgsql -- ... rest of function as before ...
$$
```

improve it if necessary, make sure to return the appropriate error code to be compatible with #file:question-display.tsx:125-142 , and to update any code referencing this part, do not create new components or change the current styles, just apply the new logic, at the and check for errors
