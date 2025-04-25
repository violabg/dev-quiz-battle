-- Users table (extends Supabase auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'active', 'completed')),
  max_players INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Create function to generate unique game codes
CREATE OR REPLACE FUNCTION generate_unique_game_code()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_game_code
BEFORE INSERT ON games
FOR EACH ROW
EXECUTE FUNCTION set_game_code();

-- Create function to calculate score based on response time
CREATE OR REPLACE FUNCTION calculate_score(response_time_ms INTEGER)
RETURNS DECIMAL AS $$
DECLARE
  base_score DECIMAL := 1.0;
  time_bonus DECIMAL := 0.0;
BEGIN
  IF response_time_ms < 15000 THEN
    time_bonus := 3.0;
  ELSIF response_time_ms < 30000 THEN
    time_bonus := 2.0;
  ELSIF response_time_ms < 60000 THEN
    time_bonus := 1.0;
  ELSIF response_time_ms < 120000 THEN
    time_bonus := 0.5;
  END IF;
  
  RETURN base_score + time_bonus;
END;
$$ LANGUAGE plpgsql;
