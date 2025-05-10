import type {
  AnswerWithPlayer,
  GameDifficulty,
  GameLanguage,
  GameWithPlayers,
  Player,
  Question,
} from "@/types/supabase";
import { assign, createMachine } from "xstate";

// Game state machine context
type GameStateContext = {
  game: GameWithPlayers | null;
  players: Player[];
  currentPlayerIndex: number;
  currentQuestion: Question | null;
  answers: AnswerWithPlayer[];
  error?: string;
};

// Game state machine events
type GameStateEvent =
  | { type: "PLAYER_JOIN"; player: Player }
  | { type: "PLAYER_LEAVE"; playerId: string }
  | { type: "START_GAME" }
  | {
      type: "CREATE_QUESTION";
      language: GameLanguage;
      difficulty: GameDifficulty;
    }
  | { type: "QUESTION_CREATED"; question: Question }
  | { type: "SUBMIT_ANSWER"; answer: AnswerWithPlayer }
  | { type: "ANSWER_SUBMITTED"; answer: AnswerWithPlayer }
  | { type: "END_QUESTION" }
  | { type: "NEXT_TURN" }
  | { type: "COMPLETE_GAME" }
  | { type: "ERROR"; error: string }
  | { type: "RESET_ERROR" }
  | {
      type: "RECEIVE_UPDATE";
      game: GameWithPlayers;
      question?: Question;
      answers?: AnswerWithPlayer[];
    };

export const gameStateMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5RQIYFswGIBKBRAwrgJIBquA+gKoAKAIgIIAquA2gAwC6ioADgPawAlgBdBfAHbcQAD0QBOAOwKAdAFZVAFgBsAZi1y2qgExG5RgDQgAnogCMbBQA5lOnYe22dcneo0BfP0tUDEx8AHkAWWoAGVxmcgBxegjWTil+IVEJKVkEVQVLGwQ5Ry01RzZdRx0nBVcFAKD0MGUAGz4AIw6rAHUUEUFxKEwY+gBNXGxyACkwogA5di4kEAyB7JXcxw1lLU8jJU8FVT09QsRHTzU2IxOtR3zbb39AkGCW9q7e-tEhkejxpNyLF6GQlukBOtJJtEE5dqotEYdBUHmw2HINBZrLDbCo2BozHJVIo0QijI03s02p1un0Bn8AMqMejYRiJZKpZa8SFZaGgXJGXS7XFPDQ6WylDTaDTnYq3FxuYnIsW43QU97Ur5037DSbYMLYcErNa8nKIQU6YUKUXiyXS2UmVTKExaTQIsyXVRsRzqqmfboM4QoABOOswRu5mTEfJkiF0tmUdTFpQUcjkWldtllBktDw0+PyxiRmN9GGUwgArsHxNrBlAAGJ8YMARQrcF5oTwTAozcouCZRDCizSxp50bNxQeykxEtux0FGlxstTcmdjgMFWtiIUgtLLUr1drQ0bLbbsA7eoNEdWY42-PkU5njjnxi0i4K2IQemcRPFGc8VSnHuygAI5nry9AAMaiAAblgvb9owg7zOQ+BdswtDXia44wggtgSquCiutaNzeGYlTLoY5TEmYqa2KYezAWB7bRlBsFYAylAAEIREQbL0PMDI9JMWG3jGuT0Tcyj4voJTpgo+JIrKWjoso+zHE8+K2MSTHgax0GCHBmACUJQKcTxfEYaJUZ3rGeESmUWipkoRjrqYrkfkUqj0bsqb6BoO4IjOuksRIbGGVguDzLQ5AIQOQ7WVCE62PmToaNs2jeURqh5rKlxGMoRLqBibA+CR5KvBqzHnvp7GYJehojpGSW4SlVHpVKmbZbln75KuTyCp4+RosiWghTVEi4OIECQJg8y4AAGmyjCUNgw5cjeNniXYCgBc6ErWtpGKZaoeVPC4O6mPhZj0SWlVUtVvJTTNED1dg+qNRt2G2RJu0qEYB34cSnXqMuJiFQNOj5gBDi2MBB7iPQEAwSg4iQXW4ZNZtLX3nhFQFZiiiuhomjWiT2Y+SYBgk8VClsHD91lmAwbBk2OD9nE5ANYlpqtX9+2OIdwMnWd1xoiKpXqBmFWvOIfAzfAKzvBCW0TnIsoALRlGiOu67rYrAf63z0lAKs43Z67ScWYr3J466g5+cgpYV6jA5LJEvE0ZZG4GIY6mbvO4wFzjbDUXp6Bm246Nm8rVIY3ih6qOjw1WNY-HWJ6tqFMbfdtCC7ZarjErYiIGLoxIx06cdKonRHJ4zLSPbVEUBzhuP0c7Bw+JiAUAdoeUONJXj4mm+iXDoFVe43emTdNkCtz9dg5ZaGbQ2RDy3Orn7j9Ors3BKbU3Cn1ZIyjaN1gvecDTspX0RiGIIhvMdlPRAM1IoE-eaowHvPgfBoDwVoYBhDz1HKrXCForQ2gcp1GUjspzV28A4NwXgxoN2UMzVmwZL7JTMDfcUpgCQk3uMYWUXgdiEn0N5ewJF65T2pCgCAF8wHm1yGmIeZdNBGExPTe4ykcpqCIRUKUjh8o+gCH4IAA */
    id: "game",
    types: {} as {
      context: GameStateContext;
      events: GameStateEvent;
    },
    initial: "lobbyWaiting",
    context: {
      game: null,
      players: [],
      currentPlayerIndex: 0,
      currentQuestion: null,
      answers: [],
      error: undefined,
    },
    states: {
      lobbyWaiting: {
        on: {
          PLAYER_JOIN: {
            actions: assign({
              players: ({ context, event }) => [
                ...context.players,
                event.player,
              ],
            }),
          },
          PLAYER_LEAVE: {
            actions: assign({
              players: ({ context, event }) =>
                context.players.filter((p) => p.player_id !== event.playerId),
            }),
          },
          START_GAME: "lobbyStarting",
          ERROR: {
            target: "error",
            actions: assign({ error: ({ event }) => event.error }),
          },
        },
      },
      lobbyStarting: {
        always: {
          target: "turnWaitingForQuestion",
          actions: assign({
            // Optionally update game status here
            game: ({ context }) =>
              context.game
                ? ({ ...context.game, status: "active" } as GameWithPlayers)
                : null,
          }),
        },
      },
      turnWaitingForQuestion: {
        on: {
          CREATE_QUESTION: "questionActive",
          ERROR: {
            target: "error",
            actions: assign({ error: ({ event }) => event.error }),
          },
        },
      },
      questionActive: {
        on: {
          QUESTION_CREATED: {
            actions: assign({
              currentQuestion: ({ event }) => event.question,
              answers: () => [],
            }),
          },
          SUBMIT_ANSWER: {
            actions: assign({
              answers: ({ context, event }) => {
                // Prevent duplicate answers from same player
                const filtered = context.answers.filter(
                  (a) => a.player_id !== event.answer.player_id
                );
                return [...filtered, event.answer];
              },
            }),
          },
          ANSWER_SUBMITTED: {
            actions: assign({
              answers: ({ context, event }) => {
                const filtered = context.answers.filter(
                  (a) => a.player_id !== event.answer.player_id
                );
                return [...filtered, event.answer];
              },
            }),
          },
          END_QUESTION: "questionEnded",
          ERROR: {
            target: "error",
            actions: assign({ error: ({ event }) => event.error }),
          },
        },
      },
      questionEnded: {
        on: {
          NEXT_TURN: "turnAdvancing",
          ERROR: {
            target: "error",
            actions: assign({ error: ({ event }) => event.error }),
          },
        },
      },
      turnAdvancing: {
        always: {
          target: "turnWaitingForQuestion",
          actions: assign({
            currentPlayerIndex: ({ context }) =>
              (context.currentPlayerIndex + 1) % context.players.length,
            currentQuestion: () => null,
            answers: () => [],
          }),
        },
      },
      gameCompleted: {
        type: "final",
      },
      error: {
        on: {
          RESET_ERROR: {
            target: "lobbyWaiting",
            actions: assign({ error: () => undefined }),
          },
        },
      },
      loading: {},
    },
    on: {
      RECEIVE_UPDATE: {
        actions: assign({
          game: ({ event }) => event.game,
          currentQuestion: ({ event }) => event.question ?? null,
          answers: ({ event }) => event.answers ?? [],
        }),
      },
      COMPLETE_GAME: "gameCompleted",
    },
  },
  {
    actions: {},
  }
);

export type GameState = typeof gameStateMachine;
