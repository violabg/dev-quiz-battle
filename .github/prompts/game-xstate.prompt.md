Create an XState v5 state machine for DevQuizBattle that implements multiplayer game flow with Supabase integration. The machine should:

1. Define core game states: lobby, active gameplay, and completion phases
2. Handle player actions, turn management, and scoring
3. Integrate Supabase real-time updates
4. Manage question lifecycle and answer validation
5. Track player scores and game progression
6. Include error handling and loading states

Schema:

- Game room with unique code
- Players collection with status and scores
- Current question and timer state
- Turn order and active player
- Answer submissions and validation
- Real-time state sync

Required features:

- Player join/leave handling
- Host privileges and game control
- Turn-based question selection
- Simultaneous answer submission
- Score calculation with time bonuses
- Real-time updates via Supabase
- Error recovery and state restoration

Implementation constraints:

- Use XState v5 syntax and features
- Handle concurrent player actions safely
- Maintain consistent state across clients
- Prevent race conditions in submissions
- Support game recovery on connection loss
- Implement timeout handling
- Validate all state transitions

Example usage:

```typescript
import { createMachine, assign } from "xstate";
import { supabase } from "./supabaseClient";

type GameContext = {
  gameCode: string;
  players: Player[];
  currentPlayer: Player | null;
  currentQuestion: Question | null;
  scores: Record<string, number>;
  timer: number;
  error?: string;
};

type GameEvents =
  | { type: "JOIN"; player: Player }
  | { type: "START_GAME" }
  | { type: "SELECT_QUESTION"; question: Question }
  | { type: "SUBMIT_ANSWER"; playerId: string; answer: string }
  | { type: "TIMER_EXPIRED" }
  | { type: "NEXT_TURN" }
  | { type: "ERROR"; message: string };

const gameMachine = createMachine(
  {
    id: "devQuizBattle",
    context: {
      gameCode: "",
      players: [],
      currentPlayer: null,
      currentQuestion: null,
      scores: {},
      timer: 0,
    },
    initial: "lobby",
    states: {
      lobby: {
        on: {
          JOIN: {
            actions: "addPlayer",
            guard: "canJoinGame",
          },
          START_GAME: {
            target: "gameplay",
            guard: "isHost",
          },
        },
      },
      gameplay: {
        initial: "selectingQuestion",
        states: {
          selectingQuestion: {
            on: {
              SELECT_QUESTION: {
                target: "activeQuestion",
                actions: "setQuestion",
              },
            },
          },
          activeQuestion: {
            entry: "startTimer",
            on: {
              SUBMIT_ANSWER: {
                actions: "validateAnswer",
              },
              TIMER_EXPIRED: {
                target: "questionEnded",
              },
            },
          },
          questionEnded: {
            on: {
              NEXT_TURN: {
                target: "selectingQuestion",
                actions: "advanceTurn",
              },
            },
          },
        },
      },
      completed: {
        type: "final",
      },
      error: {
        on: {
          RETRY: "lobby",
        },
      },
    },
  },
  {
    actions: {
      addPlayer: assign({
        players: (context, event) => [...context.players, event.player],
      }),
      setQuestion: assign({
        currentQuestion: (_, event) => event.question,
      }),
      validateAnswer: (context, event) => {
        // Implement answer validation and scoring
      },
      advanceTurn: assign({
        currentPlayer: (context) =>
          getNextPlayer(context.players, context.currentPlayer),
      }),
    },
    guards: {
      canJoinGame: (context) => context.players.length < 8,
      isHost: (context, event, meta) => isPlayerHost(context, meta),
    },
  }
);

// Supabase realtime subscription setup
const setupRealtimeSubscription = (gameCode: string) => {
  return supabase
    .channel(`game:${gameCode}`)
    .on("*", (payload) => {
      // Handle real-time updates and sync state
    })
    .subscribe();
};
```

Integrate this machine with your React/Vue/other frontend framework and Supabase backend to create a fully functional multiplayer quiz game.
