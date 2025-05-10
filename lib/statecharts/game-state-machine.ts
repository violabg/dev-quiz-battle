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

export const gameStateMachine = createMachine<GameStateContext, GameStateEvent>(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5RQIYFswGIBKBRAwrgJIBquA+gKoAKAIgIIAquA2gAwC6ioADgPawAlgBdBfAHbcQAD0QBOAOwKAdAFZVAFgVsAjHMX6AHACYANCACeiHWwWHlAZgdsAbIY1sDWnQF8f51AxMfAB5AFlqABlcZnIAcXow1k4pfiFRCSlZBFUFcysEOUMXNUNXVWMbbTKNPwD0MGUAGz4AI1aLAHUUEUFxKEwo+gBNXGxyACkQogA5di4kEDTezMXs92UXHSc2YzldJwVjF3zEQ221XdUdFw0nNwUXOpBAxpb2rp7RfsHIkbHyNF6GR5qkBCtJGtEHZNqoXMcHC4FDolPs5KcEMiVGwNHINPjjhoynInv4Xg1mm0Ot1ej8AMqMejYRjxRLJBa8cEZSGgbIIzYoypufFeDFyYyqRzOFw41QGIpyZ6vSkfGnfAZjbAhbCgxbLblZRD8rZHG7uXEKPEY4wS5Q2lzwiUkx5aWpk5XvDp04QoABO6swus56TEPJkiBcDh0ygUDjuhlRzjYuTFbAcykMmllu0zzgcSopwgArr7xGq+lAAGJ8X0ARSLcG5wTwTAotcouAZRBCcxSeq5ocNhUzyg0lTRlqjhgxlrkdsMhn2rjYxU0+fdhZLZa+FerdYbsCbmu1QaWA9WvPkI7Hek8k5008siER9jkqijqmK52MaYUBYwygAI4Hty9AAMaiAAblg7adow3YzOQ+AtswtCnvqg5QggOgPnOjxwhoFT7LkyYzsmpSfg4cg2E4RSqP+jTAY2obgVBWB0pQABCYRECy9AzHSnRjOh55htkOg-sYyg4m4dH6ARZhPggMpztsxiPC4chxhUrgMUBIEsRBgjQZg-GCQCHHcbxqEiSGF7hthD4lEiig-uo+iKI+BTXFJLmaVoLgKX+G4AUxh6GWxmC4DMtDkLBXY9rZEJDjoHiSkSdzUbkMoOF5ZwScob7qAuMoSoF9EhYxBkSKxxlYMeOp9sGyVYal5EZVROjZWmeU5Jayh6Mc2WWu+CgVfUoXVeIuDiBAkCYDMuAABosowlDYL2HJnnZYnWAoWh2g+NSVIuCa9ecc4OEcQ1acYmaEXpYXcjNc0QFF2Bao1W0YfZ4n7SoJ3HbhZ0zjahV6HoV2RoogV6cWpb0BAkEoOIYEVoGTXbS1l7YWUUljooY4mHGRx5Ep1FSTa+xbLsVGRoYelgL6vo1jgnYxOQDVJQarX-YdC44idRR2Bi5yXGwK6BRJDgSkofhkuIfBzfAiyvGCO1DuiSkALSSh5+sG65emep8tJQOr2MOYu0nGHG8IkjKWy9dRGiFeon7FFc5XG1SFjen66oWzzONaPY7hQz+hjSvoYq2lHy6EfKi5w1u5b9Hu9bMfZP27ZidxSnKGhmndUOx5K8cyons7J5V+lZ+ItXQUHmE4xJqV2rGhGuDauTbKLtjSbl1ESddLqPVNL2QM3v3WJRmy3CuDi5EcUeqKLFyEcVntleoKcI0jKNo-00+54NrtphJzrbM4RKxyUEkSqlgWEbJemvPgfBoDwTRgMIU-9hrLCxpBRmhFJaDQYoRwVzcLkRQMtSQTUaEzFmvoT4pXFOfKMewkTXxxL1KirtxQO3Uv9MaDNa4tBQBACsaCsL6EHvsF0b53AVEUgUQK9hNBaTxvHMh8sfBAA */
    id: "game",
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
              players: (ctx, evt) => [...ctx.players, evt.player],
            }),
          },
          PLAYER_LEAVE: {
            actions: assign({
              players: (ctx, evt) =>
                ctx.players.filter((p) => p.player_id !== evt.playerId),
            }),
          },
          START_GAME: "lobbyStarting",
          ERROR: {
            target: "error",
            actions: assign({ error: (_, evt) => evt.error }),
          },
        },
      },
      lobbyStarting: {
        always: {
          target: "turnWaitingForQuestion",
          actions: assign({
            // Optionally update game status here
            game: (ctx) =>
              ctx.game ? { ...ctx.game, status: "active" } : null,
          }),
        },
      },
      turnWaitingForQuestion: {
        on: {
          CREATE_QUESTION: "questionActive",
          ERROR: {
            target: "error",
            actions: assign({ error: (_, evt) => evt.error }),
          },
        },
      },
      questionActive: {
        on: {
          QUESTION_CREATED: {
            actions: assign({
              currentQuestion: (_, evt) => evt.question,
              answers: () => [],
            }),
          },
          SUBMIT_ANSWER: {
            actions: assign({
              answers: (ctx, evt) => {
                // Prevent duplicate answers from same player
                const filtered = ctx.answers.filter(
                  (a) => a.player_id !== evt.answer.player_id
                );
                return [...filtered, evt.answer];
              },
            }),
          },
          ANSWER_SUBMITTED: {
            actions: assign({
              answers: (ctx, evt) => {
                const filtered = ctx.answers.filter(
                  (a) => a.player_id !== evt.answer.player_id
                );
                return [...filtered, evt.answer];
              },
            }),
          },
          END_QUESTION: "questionEnded",
          ERROR: {
            target: "error",
            actions: assign({ error: (_, evt) => evt.error }),
          },
        },
      },
      questionEnded: {
        on: {
          NEXT_TURN: "turnAdvancing",
          ERROR: {
            target: "error",
            actions: assign({ error: (_, evt) => evt.error }),
          },
        },
      },
      turnAdvancing: {
        always: {
          target: "turnWaitingForQuestion",
          actions: assign({
            currentPlayerIndex: (ctx) =>
              (ctx.currentPlayerIndex + 1) % ctx.players.length,
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
          game: (_, evt) => evt.game,
          currentQuestion: (_, evt) => evt.question ?? null,
          answers: (_, evt) => evt.answers ?? [],
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
