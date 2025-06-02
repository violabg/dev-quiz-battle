# XState Machine Documentation

This document provides a comprehensive guide to the XState v5 state machine that powers DevQuizBattle's game logic and state management.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [State Hierarchy](#state-hierarchy)
- [Context Structure](#context-structure)
- [Events and Actions](#events-and-actions)
- [Usage Patterns](#usage-patterns)
- [Real-time Integration](#real-time-integration)
- [Error Handling](#error-handling)
- [Migration from Hooks](#migration-from-hooks)
- [Development Tools](#development-tools)
- [Best Practices](#best-practices)

## Overview

DevQuizBattle uses XState v5 to manage complex game state transitions, real-time synchronization, and multiplayer interactions. The state machine replaces traditional React hooks with a more predictable and maintainable approach to state management.

### Key Benefits

- **Predictable State Transitions**: Clear state flow prevents impossible states
- **Real-time Synchronization**: Built-in Supabase subscription management
- **Error Recovery**: Comprehensive error handling and retry mechanisms
- **Type Safety**: Full TypeScript integration with type-safe events and context
- **Testability**: Isolated business logic that's easy to unit test
- **Visual Debugging**: State machine visualization tools for development

## Architecture

The game machine follows a hierarchical state structure that models the entire game lifecycle:

```text
Game Machine
├── Context (shared data)
├── States (game phases)
├── Events (user actions, real-time updates)
├── Actions (state mutations)
├── Guards (transition conditions)
└── Services (async operations)
```

### Core Components

1. **GameMachineProvider**: React context provider for the machine
2. **useGameMachine**: Hook for component integration
3. **useGameSelectors**: Hook for derived state selection
4. **gameMachine**: The actual state machine definition

## State Hierarchy

```text
initializing
├── loading
├── settingUpSubscriptions
├── gameActive
│   ├── determiningPhase
│   ├── lobby
│   │   ├── waiting
│   │   └── starting
│   ├── activeGame
│   │   ├── determiningTurnPhase
│   │   ├── questionSelection
│   │   ├── creatingQuestion
│   │   ├── questionActive
│   │   │   ├── answering
│   │   │   ├── submittingAnswer
│   │   │   └── answered
│   │   ├── showingResults
│   │   └── advancingTurn
│   └── completed
├── leaving
├── left
└── error
```

### State Descriptions

#### Initial States

- **initializing**: Machine startup, waiting for game code and user
- **loading**: Fetching initial game data from Supabase
- **settingUpSubscriptions**: Establishing real-time connections

#### Game Active States

- **determiningPhase**: Checking if game is in lobby or active
- **lobby**: Pre-game state where players join and wait
  - **waiting**: Host hasn't started the game yet
  - **starting**: Game start sequence initiated
- **activeGame**: Main gameplay state
  - **determiningTurnPhase**: Checking whose turn it is
  - **questionSelection**: Current player selects language/difficulty
  - **creatingQuestion**: AI generates question based on selections
  - **questionActive**: Question is live, players can answer
    - **answering**: Players submit their answers
    - **submittingAnswer**: Answer submission in progress
    - **answered**: User has submitted answer, waiting for others
  - **showingResults**: Displaying round results and scores
  - **advancingTurn**: Moving to next player's turn

#### End States

- **completed**: Game finished, showing final results
- **leaving**: User initiated game exit
- **left**: User has left the game
- **error**: Error state with recovery options

## Context Structure

The machine context holds all game-related data:

```typescript
interface GameMachineContext {
  // Core game data
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
  winner: {
    playerId: string;
    user_name: string;
    score: number;
  } | null;

  // UI state
  isLoadingCreateQuestion: boolean;
  isLoadingSubmitAnswer: boolean;
  showNextTurn: boolean;

  // Real-time subscriptions
  gameSubscription: RealtimeChannel | null;
  playersSubscription: RealtimeChannel | null;
  questionsSubscription: RealtimeChannel | null;
  answersSubscription: RealtimeChannel | null;

  // Error handling
  error: string | null;
}
```

### Context Properties Explained

#### Core Game Data

- `gameCode`: Unique identifier for the game session
- `game`: Complete game object with players and metadata
- `user`: Current authenticated user

#### Player State

- `isHost`: Whether current user is the game host
- `currentPlayerIndex`: Index of player whose turn it is

#### Question State

- `currentQuestion`: Active question object with options
- `questionStartTime`: Timestamp when question became active
- `selectedLanguage`: Programming language for current question
- `selectedDifficulty`: Difficulty level for current question

#### Answer State

- `allAnswers`: All submitted answers for current question
- `userAnswer`: Current user's submitted answer
- `winner`: Player who answered correctly (if any)

#### Real-time Subscriptions

- `gameSubscription`: Listens for game status changes
- `playersSubscription`: Tracks player joins/leaves
- `questionsSubscription`: Updates when questions are created
- `answersSubscription`: Real-time answer submissions

## Events and Actions

### Event Types

```typescript
type GameMachineEvent =
  | { type: "INITIALIZE"; gameCode: string; user: User }
  | { type: "START_GAME" }
  | { type: "LEAVE_GAME" }
  | { type: "SELECT_LANGUAGE"; language: GameLanguage }
  | { type: "SELECT_DIFFICULTY"; difficulty: GameDifficulty }
  | { type: "CREATE_QUESTION" }
  | { type: "SUBMIT_ANSWER"; selectedOption: number; responseTimeMs: number }
  | { type: "NEXT_TURN" }
  | { type: "CLEAR_ERROR" }
  | { type: "RETRY" }
  // Real-time events
  | { type: "GAME_UPDATED"; game: GameWithPlayers }
  | { type: "PLAYERS_UPDATED"; game: GameWithPlayers }
  | { type: "QUESTION_CREATED"; question: Question }
  | { type: "ANSWERS_UPDATED"; answers: AnswerWithPlayer[] }
  | { type: "QUESTION_ENDED" };
```

### Action Categories

#### State Management Actions

- `initializeGame`: Set initial game code and user
- `updateGameData`: Update game object from real-time events
- `updatePlayersData`: Update player list and scores
- `updateQuestionData`: Set current question
- `updateAnswersData`: Update answer submissions

#### UI State Actions

- `setLoadingCreateQuestion`: Show/hide question creation loading
- `setLoadingSubmitAnswer`: Show/hide answer submission loading
- `setShowNextTurn`: Control next turn button visibility

#### Subscription Management Actions

- `setupGameSubscription`: Create game status subscription
- `setupPlayersSubscription`: Create player updates subscription
- `setupQuestionsSubscription`: Create question updates subscription
- `setupAnswersSubscription`: Create answer updates subscription
- `cleanupSubscriptions`: Remove all subscriptions

#### Error Handling Actions

- `setError`: Set error message
- `clearError`: Clear error state

## Usage Patterns

### Basic Component Integration

```tsx
import { useGameMachine } from "@/lib/hooks/useGameMachine";

function GamePage({ gameCode }: { gameCode: string }) {
  const { user } = useUser();
  const {
    context,
    isLoading,
    isInLobby,
    isInActiveGame,
    startGame,
    leaveGame,
  } = useGameMachine(gameCode, user);

  if (isLoading) {
    return <GameLoadingSpinner />;
  }

  if (isInLobby) {
    return (
      <GameLobby
        game={context.game}
        isHost={context.isHost}
        onStartGame={startGame}
        onLeaveGame={leaveGame}
      />
    );
  }

  if (isInActiveGame) {
    return <GameRoom />;
  }

  return <GameNotFound />;
}
```

### Question Selection Flow

```tsx
function QuestionSelection() {
  const {
    context,
    selectLanguage,
    selectDifficulty,
    createQuestion,
    isCreatingQuestion,
  } = useGameMachine();

  return (
    <div>
      <LanguageSelector
        selected={context.selectedLanguage}
        onSelect={selectLanguage}
      />
      <DifficultySelector
        selected={context.selectedDifficulty}
        onSelect={selectDifficulty}
      />
      <button onClick={createQuestion} disabled={isCreatingQuestion}>
        {isCreatingQuestion ? "Creating..." : "Create Question"}
      </button>
    </div>
  );
}
```

### Answer Submission Flow

```tsx
function QuestionDisplay() {
  const { context, submitAnswer, isSubmittingAnswer, hasAnswered } =
    useGameMachine();

  const handleAnswerSelect = (option: number) => {
    if (hasAnswered || isSubmittingAnswer) return;

    const responseTime = Date.now() - (context.questionStartTime || 0);
    submitAnswer(option, responseTime);
  };

  return (
    <div>
      <QuestionContent question={context.currentQuestion} />
      <AnswerOptions
        options={context.currentQuestion?.options}
        onSelect={handleAnswerSelect}
        disabled={hasAnswered || isSubmittingAnswer}
        selectedAnswer={context.userAnswer?.selected_option}
      />
      {isSubmittingAnswer && <SubmissionLoader />}
    </div>
  );
}
```

### Derived State Selection

```tsx
function TurnIndicator() {
  const { context } = useGameMachine();

  // Derive current player from context
  const currentPlayer = context.game?.players[context.currentPlayerIndex];
  const isMyTurn = currentPlayer?.player_id === context.user?.id;

  return (
    <div>
      {isMyTurn ? (
        <span>Your turn!</span>
      ) : (
        <span>Waiting for {currentPlayer?.user_name}...</span>
      )}
    </div>
  );
}
```

## Real-time Integration

The machine automatically manages Supabase real-time subscriptions:

### Subscription Lifecycle

1. **Setup**: When entering `settingUpSubscriptions` state
2. **Active**: Throughout the game session
3. **Cleanup**: When leaving the game or on errors

### Event Mapping

```typescript
// Game status changes
gameSubscription.on("postgres_changes", (payload) => {
  send({ type: "GAME_UPDATED", game: payload.new });
});

// Player updates
playersSubscription.on("postgres_changes", (payload) => {
  send({ type: "PLAYERS_UPDATED", game: payload.new });
});

// Question creation
questionsSubscription.on("postgres_changes", (payload) => {
  send({ type: "QUESTION_CREATED", question: payload.new });
});

// Answer submissions
answersSubscription.on("postgres_changes", (payload) => {
  send({ type: "ANSWERS_UPDATED", answers: payload.new });
});
```

### Real-time State Synchronization

The machine ensures all clients stay synchronized:

- **Game Status**: Start/end, player count, current turn
- **Questions**: New questions appear for all players
- **Answers**: Answer submissions update in real-time
- **Scores**: Player scores update after each round

## Error Handling

### Error Categories

1. **Loading Errors**: Game not found, network issues
2. **Subscription Errors**: Real-time connection failures
3. **Action Errors**: API call failures
4. **Validation Errors**: Invalid game state transitions

### Error Recovery Patterns

```tsx
function ErrorBoundary() {
  const { hasError, context, clearError, retry } = useGameMachine();

  if (hasError) {
    return (
      <div>
        <h2>Something went wrong</h2>
        <p>{context.error}</p>
        <button onClick={clearError}>Dismiss</button>
        <button onClick={retry}>Try Again</button>
      </div>
    );
  }

  return null;
}
```

### Automatic Recovery

The machine includes automatic recovery for:

- Temporary network disconnections
- Subscription reconnections
- Failed API retries

## Migration from Hooks

### Before: Multiple Hooks

```tsx
// Old approach with multiple hooks
function GameComponent({ gameCode, user }) {
  const { game, isHost, handleStartGame } = useGameState({ gameCode, user });
  const { currentPlayer, isCurrentPlayersTurn } = useGameTurns({ game, user });
  const { currentQuestion, handleCreateQuestion } = useCurrentQuestion({
    game,
  });
  const { allAnswers, handleSubmitAnswer } = useGameAnswers({ game });

  // Complex state coordination...
}
```

### After: Single Machine

```tsx
// New approach with XState machine
function GameComponent({ gameCode, user }) {
  const {
    context,
    isInLobby,
    isSelectingQuestion,
    startGame,
    createQuestion,
    submitAnswer,
  } = useGameMachine(gameCode, user);

  // All state is coordinated by the machine
}
```

### Migration Benefits

1. **Reduced Complexity**: Single source of truth
2. **Better Type Safety**: Comprehensive TypeScript support
3. **Predictable Updates**: State transitions follow defined patterns
4. **Easier Testing**: Business logic separated from UI
5. **Visual Debugging**: State machine visualization

## Development Tools

### XState DevTools

Enable visual debugging in development:

```tsx
// In your app root
import { inspect } from "@xstate/inspect";

if (process.env.NODE_ENV === "development") {
  inspect({
    url: "https://stately.ai/viz?inspect",
    iframe: false,
  });
}
```

### State Machine Visualization

The XState visualizer provides:

- Real-time state transitions
- Event history
- Context inspection
- Performance metrics

### Debugging Patterns

```tsx
function DebugPanel() {
  const { state, context } = useGameMachine();

  return (
    <div style={{ position: "fixed", top: 0, right: 0, background: "white" }}>
      <h3>Debug Info</h3>
      <p>Current State: {JSON.stringify(state.value)}</p>
      <p>Game Code: {context.gameCode}</p>
      <p>Player Count: {context.game?.players.length || 0}</p>
      <p>Current Turn: {context.currentPlayerIndex}</p>
    </div>
  );
}
```

## Best Practices

### State Design

1. **Keep Context Minimal**: Only store necessary data
2. **Use Derived State**: Calculate values from context
3. **Normalize Data**: Avoid nested object mutations
4. **Type Everything**: Leverage TypeScript for safety

### Event Handling

1. **Semantic Events**: Use descriptive event names
2. **Payload Structure**: Keep event payloads simple
3. **Idempotent Actions**: Actions should be safe to repeat
4. **Error Boundaries**: Handle all error scenarios

### Component Integration

1. **Single Machine Hook**: Use `useGameMachine` consistently
2. **Selector Hooks**: Create specific selectors for derived state
3. **Action Composition**: Combine simple actions for complex flows
4. **Conditional Rendering**: Use state flags for UI decisions

### Performance Optimization

1. **Subscription Management**: Cleanup subscriptions properly
2. **Selective Updates**: Only re-render when necessary
3. **Memoization**: Cache expensive computations
4. **Lazy Loading**: Load game data on demand

### Testing Strategies

1. **Unit Test the Machine**: Test state transitions in isolation
2. **Integration Tests**: Test with real Supabase connections
3. **Mock Services**: Use test doubles for external dependencies
4. **Snapshot Testing**: Verify state structures

```typescript
// Example machine test
import { gameMachine } from "@/lib/xstate/game-machine";
import { createActor } from "xstate";

test("should transition from lobby to active game", () => {
  const actor = createActor(gameMachine);
  actor.start();

  // Initialize the machine
  actor.send({
    type: "INITIALIZE",
    gameCode: "TEST123",
    user: mockUser,
  });

  // Verify initial state
  expect(actor.getSnapshot().matches("loading")).toBe(true);

  // Send game data
  actor.send({
    type: "GAME_LOADED",
    game: mockGame,
  });

  // Verify transition to lobby
  expect(actor.getSnapshot().matches({ gameActive: "lobby" })).toBe(true);
});
```

This comprehensive XState machine provides a robust foundation for managing complex multiplayer game state while maintaining code clarity and type safety.
