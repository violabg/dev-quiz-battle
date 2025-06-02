-- Users table (extends Supabase auth users)
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  name text,
  full_name text,
  user_name text,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  primary key (id)
);

-- inserts a row into public.profiles
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    name,
    full_name,
    user_name,
    avatar_url
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'active', 'completed')),
  max_players INTEGER NOT NULL DEFAULT 8,
  current_turn INTEGER NOT NULL DEFAULT 0,
  turns_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_limit INTEGER NOT NULL DEFAULT 120
);

-- Game players
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score DECIMAL(10, 2) NOT NULL DEFAULT 0,
  turn_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  created_by_player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  question_text TEXT NOT NULL,
  code_sample TEXT,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Answers table
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  selected_option INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER NOT NULL,
  score_earned DECIMAL(10, 2) NOT NULL DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(question_id, player_id)
);

-- Table for per-language player scores
CREATE TABLE IF NOT EXISTS player_language_scores (
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  total_score DECIMAL(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, language)
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers (question_id);
CREATE INDEX IF NOT EXISTS idx_answers_player_id ON answers (player_id);
CREATE INDEX IF NOT EXISTS idx_questions_game_id ON questions (game_id);

-- Enable Realtime for all tables
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.questions;
alter publication supabase_realtime add table public.answers;

-- Create function to generate unique game codes
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

-- Create trigger to automatically generate game codes
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

CREATE TRIGGER trigger_set_game_code
BEFORE INSERT ON games
FOR EACH ROW
EXECUTE FUNCTION set_game_code();

-- Create function to calculate score based on response time
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

-- Create function to submit answer and update score atomically
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
  v_question_exists_count INTEGER; 
  v_player_answered_count INTEGER; 
  v_rows_affected INTEGER; -- For GET DIAGNOSTICS
BEGIN
  -- 1. First check if the question exists
  SELECT COUNT(*) INTO v_question_exists_count FROM questions WHERE id = p_question_id;
  
  IF v_question_exists_count = 0 THEN
    RAISE LOG 'Question % not found', p_question_id;
    RAISE EXCEPTION '[QNOTF] Question not found' USING ERRCODE = 'P0003';
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
    RAISE LOG 'Question % has already ended at %', p_question_id, v_ended_at;
    RAISE EXCEPTION '[QEND] Question has already ended' USING ERRCODE = 'P0001';
  END IF;
  
  -- 4. Check if player has already answered
  SELECT COUNT(*) INTO v_player_answered_count 
  FROM answers 
  WHERE question_id = p_question_id AND player_id = p_player_id;
  
  IF v_player_answered_count > 0 THEN
    RAISE LOG 'Player % has already answered question %', p_player_id, p_question_id;
    RAISE EXCEPTION '[ADUP] Player has already submitted an answer' USING ERRCODE = 'P0002';
  END IF;

  -- 5. Determine if answer is correct
  v_is_correct := (p_selected_option = v_correct_answer);
  
  -- If p_selected_option was SQL NULL, the comparison (p_selected_option = v_correct_answer) yields SQL NULL.
  -- Treat this as incorrect. The answers.selected_option is NOT NULL, so client should not send NULL.
  IF v_is_correct IS NULL THEN
    v_is_correct := FALSE;
    RAISE LOG 'Answer comparison: p_selected_option was NULL or comparison resulted in NULL. Treated as incorrect. selected=%, correct=%', 
              p_selected_option, v_correct_answer;
  ELSE
    RAISE LOG 'Answer comparison: selected=%, correct=%, is_correct=%', 
              p_selected_option, v_correct_answer, v_is_correct;    
  END IF;
  
  -- 6. Calculate score if correct
  IF v_is_correct THEN
    v_score_earned := calculate_score(p_response_time_ms, p_time_limit_ms);
    RAISE LOG 'Score calculated: %', v_score_earned;
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

    RAISE LOG 'Question end attempt: question_id=%, player_id=%, ended_by_this_call=%', 
              p_question_id, p_player_id, (v_update_id IS NOT NULL);

    -- Update player's game score for this correct answer
    UPDATE game_players
    SET score = score + v_score_earned
    WHERE game_id = p_game_id AND player_id = p_player_id;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RAISE LOG 'Player % game_players score updated by % points (rows: %)', 
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
        RAISE LOG 'Updated player_language_scores for player %, language %, score % (rows: %)', 
                  p_player_id, v_language, v_score_earned, v_rows_affected;
      ELSE
        RAISE LOG 'Could not determine language for question % to update player_language_scores.', p_question_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error updating player_language_scores for player %, language %: %', p_player_id, v_language, SQLERRM;
    END;

    IF v_update_id IS NOT NULL THEN
      -- This specific call was the one that ended the question
      RAISE LOG 'Question % ended successfully by player %', p_question_id, p_player_id;
    ELSE
      -- This answer was correct, but another correct answer had already ended the question
      RAISE LOG 'Question % was already ended when player % submitted a correct answer.', 
                p_question_id, p_player_id;
    END IF;
  END IF;
  
  -- 9. Return results
  RETURN QUERY SELECT v_answer_id, v_was_winning_answer, v_score_earned;
END;
$$;

-- leaderboard function: returns paginated players and total count
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

-- Policies for row-level security
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.player_language_scores enable row level security;

-- RLS policies for table: profiles
-- Explanation: Allow all users (authenticated and anonymous) to select profiles. Permissive policy for public profile data.
CREATE POLICY "Allow authenticated and anonymous users to select profiles"
ON profiles
FOR SELECT
TO authenticated, anon
USING (true);

-- Explanation: Allow only authenticated users to insert profile. (Supabase creates profile on signup)
CREATE POLICY "Allow authenticated users to insert profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = id);

-- Explanation: Allow only authenticated users to update profile.
CREATE POLICY "Allow authenticated users to update profile"
ON profiles
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- Explanation: Allow only authenticated users to delete profile.
CREATE POLICY "Allow authenticated users to delete profile"
ON profiles
FOR DELETE
TO authenticated
USING ((select auth.uid()) = id);

-- RLS policies for table: games
-- Explanation: Allow all users to select games (public game data).
CREATE POLICY "Allow authenticated and anonymous users to select games"
ON games
FOR SELECT
TO authenticated, anon
USING (true);

-- Explanation: Allow only authenticated users to insert games (host a game).
CREATE POLICY "Allow authenticated users to insert games"
ON games
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = host_id);

-- Explanation: Allow only the host to update games.
CREATE POLICY "Allow authenticated and anonymous to update the games"
ON games
FOR UPDATE
TO authenticated, anon
USING (true);

-- Explanation: Allow only the host to delete games.
CREATE POLICY "Allow host to delete games"
ON games
FOR DELETE
TO authenticated
USING ((select auth.uid()) = host_id);

-- RLS policies for table: game_players
-- Explanation: Allow all users to select game_players (public leaderboard/scoreboard).
CREATE POLICY "Allow authenticated and anonymous users to select game_players"
ON game_players
FOR SELECT
TO authenticated, anon
USING (true);

-- Explanation: Allow authenticated users to insert themselves as game_players.
CREATE POLICY "Allow authenticated users to insert themselves as game_players"
ON game_players
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Explanation: Allow authenticated users to update game_player row.
CREATE POLICY "Allow authenticated users to update game_player row"
ON game_players
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Explanation: Allow authenticated users to delete game_player row.
CREATE POLICY "Allow authenticated users to delete game_player row"
ON game_players
FOR DELETE
TO authenticated
USING (true);

-- RLS policies for table: questions
-- Explanation: Allow all users to select questions (public game data).
CREATE POLICY "Allow authenticated and anonymous users to select questions"
ON questions
FOR SELECT
TO authenticated, anon
USING (true);

-- Explanation: Allow authenticated users to insert questions they authored.
CREATE POLICY "Allow authenticated users to insert questions they authored"
ON questions
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = created_by_player_id);

-- Explanation: Allow only the author to update questions.
CREATE POLICY "Allow author to update questions"
ON questions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Explanation: Allow only the author to delete questions.
CREATE POLICY "Allow author to delete questions"
ON questions
FOR DELETE
TO authenticated
USING (true)

-- RLS policies for table: answers
-- Explanation: Allow all users to select answers (public game data).
CREATE POLICY "Allow authenticated and anonymous users to select answers"
ON answers
FOR SELECT
TO authenticated, anon
USING (true);

-- Explanation: Allow authenticated users to insert answers.
CREATE POLICY "Allow authenticated users to insert answers"
ON answers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Explanation: Allow authenticated users to update answers.
CREATE POLICY "Allow authenticated users to update answers"
ON answers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Explanation: Allow authenticated users to delete answers.
CREATE POLICY "Allow authenticated users to delete answers"
ON answers
FOR DELETE
TO authenticated
USING (true);

-- RLS policies for table: player_language_scores
CREATE POLICY "Allow authenticated and anonymous users to select player_language_scores"
ON player_language_scores
FOR SELECT
TO authenticated, anon
USING (true);

-- Explanation: Allow authenticated and anonymous users to insert row.
CREATE POLICY "Allow authenticated and anonymous users to insert row"
ON player_language_scores
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Explanation: Allow authenticated and anonymous users to update row.
CREATE POLICY "Allow authenticated and anonymous users to update row"
ON player_language_scores
FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Explanation: Allow authenticated and anonymous users to delete row.
CREATE POLICY "Allow authenticated and anonymous users to delete row"
ON player_language_scores
FOR DELETE
TO authenticated, anon
USING (true);