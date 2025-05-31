# XState Game Machine Integration

This document explains how to integrate the XState v5 game machine with Supabase Realtime subscriptions in your Next.js multiplayer quiz battle game.

## Overview

The game machine models the entire game lifecycle with the following key phases:

1. **Initialization** - Setup with game code and user
2. **Loading** - Fetch initial game data
3. **Setting Up Subscriptions** - Connect to Supabase realtime
4. **Game Active** - Main game phases (lobby and active gameplay)
5. **Completion/Leaving** - Game end states

## Usage

### Basic Integration

```tsx
import { useGameMachine } from "@/lib/hooks/useGameMachine";

function GameComponent({ gameCode, user }) {
  const {
    context,
    isLoading,
    isInLobby,
    isInActiveGame,
    startGame,
    leaveGame,
    // ... other state and actions
  } = useGameMachine(gameCode, user);

  if (isLoading) return <div>Loading...</div>;
  if (isInLobby) return <GameLobby />;
  if (isInActiveGame) return <GameRoom />;

  return null;
}
```

### Replacing Existing Hooks

The machine can replace the current hooks gradually:

#### Instead of `useGameState`:

```tsx
// Old way
const { game, isHost, handleStartGame, handleLeaveGame } = useGameState({
  code,
  user,
});

// New way with machine
const {
  context: { game, isHost },
  startGame,
  leaveGame,
} = useGameMachine(code, user);
```

#### Instead of `useGameTurns`:

```tsx
// Old way
const { currentPlayer, isCurrentPlayersTurn, handleNextTurn } = useGameTurns({
  game,
  user,
  isRoundComplete,
  resetQuestionState,
});

// New way with machine
const {
  context: { game, currentPlayerIndex },
  nextTurn,
} = useGameMachine(code, user);

// Current player derived from context
const currentPlayer = game?.players[currentPlayerIndex];
const isCurrentPlayersTurn = currentPlayer?.player_id === user?.id;
```

#### Instead of `useCurrentQuestion`:

```tsx
// Old way
const { currentQuestion, handleCreateQuestion } = useCurrentQuestion({
  game,
  user,
  allAnswers,
  winner,
  isCurrentPlayersTurn,
});

// New way with machine
const {
  context: { currentQuestion },
  createQuestion,
  selectLanguage,
  selectDifficulty,
} = useGameMachine(code, user);
```

## State Structure

### Context Properties

```typescript
interface GameMachineContext {
  // Game data
  gameCode: string;
  game: GameWithPlayers | null;
  user: User | null;

  // Player state
  isHost: boolean;
  currentPlayerIndex: number;

  // Question state
  currentQuestion: Question | null;
  questionStartTime: number | null;
  selectedLanguage: GameLanguage;
  selectedDifficulty: GameDifficulty;

  // Answer state
  allAnswers: AnswerWithPlayer[];
  userAnswer: AnswerWithPlayer | null;
  winner: { playerId: string; user_name: string; score: number } | null;

  // UI state
  isLoadingCreateQuestion: boolean;
  isLoadingSubmitAnswer: boolean;
  showNextTurn: boolean;

  // Realtime subscriptions
  gameSubscription: RealtimeChannel | null;
  playersSubscription: RealtimeChannel | null;
  questionsSubscription: RealtimeChannel | null;
  answersSubscription: RealtimeChannel | null;

  // Error handling
  error: string | null;
}
```

### State Values

The machine uses hierarchical states:

```
initializing
loading
settingUpSubscriptions
gameActive
  ├── determiningPhase
  ├── lobby
  │   ├── waiting
  │   └── starting
  ├── activeGame
  │   ├── determiningTurnPhase
  │   ├── questionSelection
  │   ├── creatingQuestion
  │   ├── questionActive
  │   │   ├── answering
  │   │   ├── submittingAnswer
  │   │   └── answered
  │   ├── showingResults
  │   └── advancingTurn
  └── completed
leaving
left
error
```

### Available Actions

```typescript
// Game management
startGame()
leaveGame()

// Question creation
selectLanguage(language: GameLanguage)
selectDifficulty(difficulty: GameDifficulty)
createQuestion()

// Answer submission
submitAnswer(selectedOption: number, responseTimeMs: number)

// Turn management
nextTurn()

// Error handling
clearError()
retry()
```

## Realtime Subscriptions

The machine automatically manages Supabase realtime subscriptions:

### Game Subscription

- Listens for game status changes
- Handles game deletion (redirects users)
- Updates game data in real-time

### Players Subscription

- Updates player list when players join/leave
- Maintains turn order and scores

### Questions Subscription

- Creates new questions in real-time
- Updates question status (like ended_at)

### Answers Subscription

- Updates answer list for current question
- Triggers winner determination logic

## Event Flow

### Game Initialization

1. `INITIALIZE` → Load game data
2. `GAME_LOADED` → Set up subscriptions
3. Transition to lobby or active game

### Question Creation Flow

1. `SELECT_LANGUAGE` / `SELECT_DIFFICULTY` → Update preferences
2. `CREATE_QUESTION` → Create question via API
3. `QUESTION_CREATED` → Start question timer
4. Transition to answering phase

### Answer Submission Flow

1. `SUBMIT_ANSWER` → Submit to Supabase
2. `ANSWER_SUBMITTED` → Update local state
3. `ANSWERS_UPDATED` → Realtime updates from others
4. `QUESTION_ENDED` → Show results

### Turn Advancement

1. `NEXT_TURN` → Advance to next player
2. `TURN_COMPLETED` → Reset question state
3. Return to question selection

## Error Handling

The machine includes comprehensive error handling:

- **Loading errors**: Network issues, game not found
- **Subscription errors**: Connection failures
- **Action errors**: Failed API calls
- **Validation errors**: Invalid inputs

Errors can be cleared with `clearError()` or retried with `retry()`.

## Migration Strategy

### Phase 1: Setup Infrastructure

1. ✅ Install XState v5 and React integration
2. ✅ Create machine definition with all states and events
3. ✅ Create useGameMachine hook

### Phase 2: Gradual Integration

1. Replace `useGameState` with machine context
2. Replace `useGameTurns` with machine state
3. Replace `useCurrentQuestion` with machine actions
4. Replace `useGameAnswers` with machine subscriptions

### Phase 3: Component Updates

1. Update GameLobby to use machine
2. Update GameRoom to use machine
3. Update QuestionSelection to use machine
4. Update QuestionDisplay to use machine

### Phase 4: Cleanup

1. Remove old hooks
2. Remove redundant state management
3. Optimize subscriptions

## Benefits

1. **Centralized State**: All game state in one place
2. **Predictable Updates**: State changes follow defined patterns
3. **Real-time Integration**: Built-in Supabase subscription management
4. **Error Recovery**: Comprehensive error handling and retry logic
5. **Type Safety**: Full TypeScript support
6. **Debugging**: Visual state machine debugging tools
7. **Testing**: Easier unit testing of game logic

## Development Tools

XState provides excellent development tools:

```tsx
// Enable XState DevTools in development
import { createMachine } from "xstate";
import { inspect } from "@xstate/inspect";

if (process.env.NODE_ENV === "development") {
  inspect({
    url: "https://stately.ai/viz?inspect",
    iframe: false,
  });
}
```

This allows you to visualize the state machine and debug state transitions in real-time.
