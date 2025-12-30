# Convex Schema Reference

The schema.ts file defines all database tables for dev-quiz-battle:

## Users Table
- `_id`: Document ID
- `email`: User email (unique)
- `name`: User name
- `avatar`: Avatar URL
- `totalScore`: Cumulative score
- `language`: Preferred programming language
- `createdAt`: Registration timestamp

## Games Table
- `_id`: Document ID
- `code`: Unique game code (6 characters)
- `creatorId`: Reference to user who created game
- `status`: "waiting" | "in-progress" | "finished"
- `language`: Programming language quiz
- `players`: Array of player IDs
- `currentRound`: Current round number
- `maxRounds`: Total rounds in game
- `createdAt`: Game creation timestamp

## Questions Table
- `_id`: Document ID
- `text`: Question text
- `language`: Programming language
- `difficulty`: "easy" | "medium" | "hard"
- `category`: Code, syntax, logic, etc.
- `correctAnswer`: The correct answer
- `options`: Array of multiple choice options
- `generatedAt`: When question was generated

## Answers Table
- `_id`: Document ID
- `gameId`: Reference to game
- `playerId`: Reference to answering player
- `questionId`: Reference to question
- `answer`: User's submitted answer
- `isCorrect`: Whether answer is correct
- `timeMs`: Time spent (milliseconds)
- `scoreEarned`: Points awarded
- `submittedAt`: Submission timestamp

## Leaderboard Table
- `_id`: Document ID
- `userId`: Reference to user
- `totalScore`: User's total score
- `gamesPlayed`: Number of games
- `winRate`: Win percentage
- `language`: Primary language
- `lastUpdated`: When score was updated
