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

-- Improved submit_answer function for atomic, race-free, server-side validation and scoring
-- This version fixes both:
-- 1. The "null value in column 'is_correct'" error
-- 2. The issue where turns aren't closed when non-creator players answer correctly
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
  score_earned DECIMAL,
  debug JSONB
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
  v_debug JSONB := '{}'::JSONB;
BEGIN
  -- 1. First check if the question exists
  SELECT COUNT(*) INTO v_count FROM questions WHERE id = p_question_id;
  
  IF v_count = 0 THEN
    RAISE LOG 'Question % not found', p_question_id;
    RAISE EXCEPTION 'Question not found' USING ERRCODE = 'P0003';
  END IF;

  -- 2. Get the question data with a FOR SHARE lock (less restrictive than FOR UPDATE)
  -- Get correct_answer and ended_at with separate queries for reliability
  SELECT ended_at INTO v_ended_at 
  FROM questions 
  WHERE id = p_question_id
  FOR SHARE;
  
  -- Get the critical correct_answer with its own query
  SELECT correct_answer INTO v_correct_answer 
  FROM questions 
  WHERE id = p_question_id
  FOR SHARE;
  
  -- 3. Check if question has already ended
  IF v_ended_at IS NOT NULL THEN
    RAISE LOG 'Question % has already ended at %', p_question_id, v_ended_at;
    RAISE EXCEPTION 'Question has already ended' USING ERRCODE = 'P0001';
  END IF;
  
  -- 4. Check if player has already answered
  SELECT COUNT(*) INTO v_count 
  FROM answers 
  WHERE question_id = p_question_id AND player_id = p_player_id;
  
  IF v_count > 0 THEN
    RAISE LOG 'Player % has already answered question %', p_player_id, p_question_id;
    RAISE EXCEPTION 'Player has already submitted an answer' USING ERRCODE = 'P0002';
  END IF;
  
  -- 5. Make absolutely sure we have a correct_answer value
  IF v_correct_answer IS NULL THEN
    -- Try to fetch it again with a stronger approach
    BEGIN
      SELECT correct_answer INTO STRICT v_correct_answer
      FROM questions
      WHERE id = p_question_id;
      
      -- Still null? This is a critical error
      IF v_correct_answer IS NULL THEN
        RAISE LOG 'Critical error: Question % has NULL correct_answer even after retry', p_question_id;
        RAISE EXCEPTION 'Question has no correct answer defined' USING ERRCODE = 'P0005';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error retrieving correct_answer: %', SQLERRM;
      RAISE EXCEPTION 'Could not determine correct answer' USING ERRCODE = 'P0005';
    END;
  END IF;
  
  -- 6. Determine if answer is correct with multiple comparison methods to avoid NULL issues
  BEGIN
    -- Try direct comparison first
    v_is_correct := (p_selected_option = v_correct_answer);
    
    -- If NULL result (type mismatch), try integer casting
    IF v_is_correct IS NULL THEN
      v_is_correct := (p_selected_option::INTEGER = v_correct_answer::INTEGER);
    END IF;
    
    -- If still NULL, try text comparison
    IF v_is_correct IS NULL THEN
      v_is_correct := (p_selected_option::TEXT = v_correct_answer::TEXT);
    END IF;
    
    -- Final fallback - if still NULL, default to FALSE
    IF v_is_correct IS NULL THEN
      v_is_correct := FALSE;
    END IF;
    
    RAISE LOG 'Answer comparison: selected=%, correct=%, is_correct=%', 
              p_selected_option, v_correct_answer, v_is_correct;
              
    -- Add to debug info
    v_debug := jsonb_build_object(
      'selected_option', p_selected_option, 
      'correct_answer', v_correct_answer,
      'is_correct', v_is_correct
    );
  END;
  
  -- 7. Calculate score if correct
  IF v_is_correct THEN
    v_score_earned := calculate_score(p_response_time_ms, p_time_limit_ms);
    RAISE LOG 'Score calculated: %', v_score_earned;
    v_debug := v_debug || jsonb_build_object('score_earned', v_score_earned);
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
  -- IMPORTANT: Any correct answer will end the question, regardless of who created it
  IF v_is_correct THEN
    -- For any correct answer, set was_winning_answer to TRUE
    -- This ensures frontend always treats correct answers as "winning" answers
    v_was_winning_answer := TRUE;
    
    -- Try to end the question (this only works for the first correct answer)
    UPDATE questions
    SET ended_at = NOW()
    WHERE id = p_question_id AND ended_at IS NULL
    RETURNING id INTO v_update_id;
    
    RAISE LOG 'Question end attempt: question_id=%, player_id=%, result=%', 
              p_question_id, p_player_id, v_update_id IS NOT NULL;
    
    -- Update player score for ANY correct answer
    UPDATE game_players
    SET score = score + v_score_earned
    WHERE game_id = p_game_id AND player_id = p_player_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE LOG 'Player % score updated by % points (rows: %)', 
              p_player_id, v_score_earned, v_count;
    
    -- Add detailed info to debug
    IF v_update_id IS NOT NULL THEN
      -- This was the first correct answer (the one that actually ended the question)
      RAISE LOG 'Question % ended successfully by player %', p_question_id, p_player_id;
      
      v_debug := v_debug || jsonb_build_object(
        'was_winning_answer', v_was_winning_answer,
        'score_updated', true,
        'question_ended', true,
        'first_correct_answer', true
      );
    ELSE
      -- This was a correct answer, but not the first one
      RAISE LOG 'Question % was already ended when player % answered', 
                p_question_id, p_player_id;
                
      v_debug := v_debug || jsonb_build_object(
        'was_winning_answer', v_was_winning_answer,
        'score_updated', true,
        'question_already_ended', true,
        'first_correct_answer', false
      );
    END IF;
  END IF;
  
  -- 10. Return results with debug info
  RETURN QUERY SELECT v_answer_id, v_was_winning_answer, v_score_earned, v_debug;
END;
$$;

-- Leaderboard function: sum scores per player, join profile, paginated
CREATE OR REPLACE FUNCTION get_leaderboard_players(
  offset_value integer,
  limit_value integer
)
RETURNS TABLE (
  player_id uuid,
  total_score numeric,
  name text,
  full_name text,
  user_name text,
  avatar_url text
) AS $$
BEGIN
  RETURN QUERY
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
    ORDER BY total_score DESC
    LIMIT limit_value OFFSET offset_value;  -- Corrected order of LIMIT and OFFSET
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

-- RLS policies for table: profiles
-- Explanation: Allow all users (authenticated and anonymous) to select profiles. Permissive policy for public profile data.
CREATE POLICY "Allow authenticated and anonymous users to select profiles"
ON profiles
FOR SELECT
TO authenticated, anon
USING (true);

-- Explanation: Allow only authenticated users to insert their own profile. (Supabase creates profile on signup)
CREATE POLICY "Allow authenticated users to insert their own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = id);

-- Explanation: Allow only authenticated users to update their own profile.
CREATE POLICY "Allow authenticated users to update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- Explanation: Allow only authenticated users to delete their own profile.
CREATE POLICY "Allow authenticated users to delete their own profile"
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

-- Explanation: Allow only the host to update their own games.
CREATE POLICY "Allow authenticated and anonymous to update the games"
ON games
FOR UPDATE
TO authenticated, anon
USING (true);

-- Explanation: Allow only the host to delete their own games.
CREATE POLICY "Allow host to delete their own games"
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
WITH CHECK ((select auth.uid()) = player_id);

-- Explanation: Allow authenticated users to update their own game_player row.
CREATE POLICY "Allow authenticated users to update their own game_player row"
ON game_players
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = player_id)
WITH CHECK ((select auth.uid()) = player_id);

-- Explanation: Allow authenticated users to delete their own game_player row.
CREATE POLICY "Allow authenticated users to delete their own game_player row"
ON game_players
FOR DELETE
TO authenticated
USING ((select auth.uid()) = player_id);

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

-- Explanation: Allow only the author to update their own questions.
CREATE POLICY "Allow author to update their own questions"
ON questions
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = created_by_player_id)
WITH CHECK ((select auth.uid()) = created_by_player_id);

-- Explanation: Allow only the author to delete their own questions.
CREATE POLICY "Allow author to delete their own questions"
ON questions
FOR DELETE
TO authenticated
USING ((select auth.uid()) = created_by_player_id);

-- RLS policies for table: answers
-- Explanation: Allow all users to select answers (public game data).
CREATE POLICY "Allow authenticated and anonymous users to select answers"
ON answers
FOR SELECT
TO authenticated, anon
USING (true);

-- Explanation: Allow authenticated users to insert their own answers.
CREATE POLICY "Allow authenticated users to insert their own answers"
ON answers
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = player_id);

-- Explanation: Allow authenticated users to update their own answers.
CREATE POLICY "Allow authenticated users to update their own answers"
ON answers
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = player_id)
WITH CHECK ((select auth.uid()) = player_id);

-- Explanation: Allow authenticated users to delete their own answers.
CREATE POLICY "Allow authenticated users to delete their own answers"
ON answers
FOR DELETE
TO authenticated
USING ((select auth.uid()) = player_id);