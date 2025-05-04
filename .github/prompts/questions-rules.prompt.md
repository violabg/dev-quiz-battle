**Real-Time Quiz Game: Question & Answer Flow Implementation**

Implement a synchronized quiz game flow with the following requirements:

**Database Schema & Real-time Subscriptions**

- Create game_sessions table with current_state, active_player, current_question
- Create player_answers table with timestamped submissions
- Establish Supabase real-time subscriptions on both tables
- Use database triggers to maintain state consistency

**Question Round Flow**

1. Active player selects a question:

   - Lock question selection for other players
   - Broadcast selected question to all players
   - Initialize 30-second timer

2. Answer submission handling:

   - Store answers in player_answers table with TIMESTAMP
   - Implement optimistic locking for concurrent submissions
   - Use database constraints to prevent multiple submissions per player

3. Visual feedback requirements:

   - Show "Submitted" status for player who answered
   - Display "Correct" or "Incorrect" immediately after validation
   - Broadcast result to all players via real-time subscription
   - Highlight correct answer in green, incorrect in red
   - Display who answered what to all players

4. State transitions:

   - Question Active → Answer Submitted → Result Shown → Next Player
   - Update game_session.current_state atomically
   - Broadcast state changes via Supabase real-time

5. Round completion:

   - Auto-advance when correct answer submitted
   - Auto-advance when timer expires
   - Update scores and active player atomically
   - Reset answer buttons and visual states for next round

6. Game completion:
   - Trigger after all players have had one turn
   - Calculate final scores from player_answers table
   - Update game_session.status to 'completed'
   - Display winner and final scoreboard to all players

Technical constraints:

- Use Supabase row-level security for data integrity
- Implement exponential backoff for real-time reconnection
- Add database indexes on frequently queried columns
- Set appropriate CASCADE rules for related tables
