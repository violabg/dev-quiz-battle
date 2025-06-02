import {
  subscribeToAnswers,
  unsubscribeFromAnswers,
} from "@/lib/supabase/supabase-answers";
import {
  subscribeToGamePlayers,
  unsubscribeFromGamePlayers,
} from "@/lib/supabase/supabase-game-players";
import {
  subscribeToGame,
  unsubscribeFromGame,
} from "@/lib/supabase/supabase-games";
import {
  subscribeToQuestions,
  unsubscribeFromQuestions,
} from "@/lib/supabase/supabase-questions";
import type {
  GameDifficulty,
  GameLanguage,
  GameWithPlayers,
  Question,
} from "@/types/supabase";
import type { User } from "@supabase/supabase-js";
import { assign, fromCallback, fromPromise, setup } from "xstate";
import { gameServices } from "./game-machine.services";
import type {
  GameMachineContext,
  GameMachineEvent,
} from "./game-machine.types";

export const gameMachine = setup({
  types: {
    context: {} as GameMachineContext,
    events: {} as GameMachineEvent,
  },
  actions: {
    // Game initialization actions
    initializeGame: assign({
      gameCode: ({ event }) => {
        if (event.type !== "INITIALIZE") return "";
        return event.gameCode;
      },
      user: ({ event }) => {
        if (event.type !== "INITIALIZE") return null;
        return event.user;
      },
      error: null,
    }),

    // Game data update actions
    setGameData: assign({
      game: ({ event }) => {
        // Handle both direct GAME_LOADED events and actor onDone events
        if (event.type === "GAME_LOADED") {
          return event.game;
        }
        // Handle onDone from fetchGameData actor - correct pattern for XState v5
        if (event.type.includes("done.actor") && "output" in event) {
          const output = (
            event as { output: { game: GameWithPlayers; isHost: boolean } }
          ).output;
          return output.game;
        }
        return null;
      },
      isHost: ({ event, context }) => {
        if (!context.user) return false;

        // Handle both direct GAME_LOADED events and actor onDone events
        if (event.type === "GAME_LOADED") {
          return context.user.id === event.game.host_id;
        }
        // Handle onDone from fetchGameData actor - correct pattern for XState v5
        if (event.type.includes("done.actor") && "output" in event) {
          const output = (
            event as { output: { game: GameWithPlayers; isHost: boolean } }
          ).output;
          return output.isHost;
        }
        return false;
      },
      currentPlayerIndex: ({ event }) => {
        // Handle both direct GAME_LOADED events and actor onDone events
        if (event.type === "GAME_LOADED") {
          return event.game.current_turn ?? 0;
        }
        // Handle onDone from fetchGameData actor - correct pattern for XState v5
        if (event.type.includes("done.actor") && "output" in event) {
          const output = (
            event as { output: { game: GameWithPlayers; isHost: boolean } }
          ).output;
          return output.game?.current_turn ?? 0;
        }
        return 0;
      },
    }),

    updateGameData: assign({
      game: ({ event, context }) => {
        if (event.type !== "GAME_UPDATED" || !context.game) return context.game;
        return { ...context.game, ...event.game };
      },
      currentPlayerIndex: ({ event, context }) => {
        if (
          event.type !== "GAME_UPDATED" ||
          event.game.current_turn === undefined
        ) {
          return context.currentPlayerIndex;
        }
        return event.game.current_turn;
      },
      // Reset question state when turn changes
      currentQuestion: ({ event, context }) => {
        if (
          event.type !== "GAME_UPDATED" ||
          event.game.current_turn === undefined ||
          event.game.current_turn === context.currentPlayerIndex
        ) {
          return context.currentQuestion;
        }
        // Turn changed, reset question
        return null;
      },
      questionStartTime: ({ event, context }) => {
        if (
          event.type !== "GAME_UPDATED" ||
          event.game.current_turn === undefined ||
          event.game.current_turn === context.currentPlayerIndex
        ) {
          return context.questionStartTime;
        }
        // Turn changed, reset question start time
        return null;
      },
      allAnswers: ({ event, context }) => {
        if (
          event.type !== "GAME_UPDATED" ||
          event.game.current_turn === undefined ||
          event.game.current_turn === context.currentPlayerIndex
        ) {
          return context.allAnswers;
        }
        // Turn changed, reset answers
        return [];
      },
      winner: ({ event, context }) => {
        if (
          event.type !== "GAME_UPDATED" ||
          event.game.current_turn === undefined ||
          event.game.current_turn === context.currentPlayerIndex
        ) {
          return context.winner;
        }
        // Turn changed, reset winner
        return null;
      },
      showNextTurn: ({ event, context }) => {
        if (
          event.type !== "GAME_UPDATED" ||
          event.game.current_turn === undefined ||
          event.game.current_turn === context.currentPlayerIndex
        ) {
          return context.showNextTurn;
        }
        // Turn changed, reset show next turn
        return false;
      },
    }),

    updatePlayers: assign({
      game: ({ event, context }) => {
        if (event.type !== "PLAYERS_UPDATED" || !context.game)
          return context.game;
        return { ...context.game, players: event.players };
      },
    }),

    updateHost: assign({
      game: ({ event, context }) => {
        if (event.type !== "HOST_UPDATED" || !context.game) return context.game;
        return { ...context.game, host: event.host };
      },
    }),

    // Question actions
    setSelectedLanguage: assign({
      selectedLanguage: ({ event }) => {
        if (event.type !== "SELECT_LANGUAGE") return "javascript";
        return event.language;
      },
    }),

    setSelectedDifficulty: assign({
      selectedDifficulty: ({ event }) => {
        if (event.type !== "SELECT_DIFFICULTY") return "medium";
        return event.difficulty;
      },
    }),

    setCurrentQuestion: assign({
      currentQuestion: ({ event }) => {
        // Handle QUESTION_CREATED from subscription
        if (event.type === "QUESTION_CREATED") {
          return event.question;
        }
        // Handle onDone from createQuestion actor
        if (event.type.includes("done.actor") && "output" in event) {
          const output = event.output as {
            question: Question;
            startTime: number;
          };
          return output.question;
        }
        return null;
      },
      questionStartTime: ({ event }) => {
        // Handle QUESTION_CREATED from subscription
        if (event.type === "QUESTION_CREATED") {
          return event.startTime;
        }
        // Handle onDone from createQuestion actor
        if (event.type.includes("done.actor") && "output" in event) {
          const output = event.output as {
            question: Question;
            startTime: number;
          };
          return output.startTime;
        }
        return null;
      },
      isLoadingCreateQuestion: false,
    }),

    updateCurrentQuestion: assign({
      currentQuestion: ({ event }) => {
        if (event.type !== "QUESTION_UPDATED") return null;
        return event.question;
      },
    }),

    startQuestionTimer: assign({
      questionStartTime: () => Date.now(),
    }),

    stopQuestionTimer: assign({
      questionStartTime: null,
    }),

    resetQuestionState: assign({
      currentQuestion: null,
      questionStartTime: null,
      allAnswers: [],
      winner: null,
      showNextTurn: false,
      isLoadingCreateQuestion: false,
    }),

    // Answer actions
    updateAnswers: assign({
      allAnswers: ({ event }) => {
        if (event.type !== "ANSWERS_UPDATED") return [];
        return event.answers;
      },
    }),

    setWinner: assign({
      winner: ({ event }) => {
        if (event.type === "SET_WINNER") {
          return event.winner;
        }
        if (event.type.includes("done.actor") && "output" in event) {
          const output = event as {
            output: { playerId: string; user_name: string; score: number };
          };
          return output.output;
        }
        return null;
      },
    }),

    // Loading state actions
    setLoadingCreateQuestion: assign({
      isLoadingCreateQuestion: true,
    }),

    clearLoadingCreateQuestion: assign({
      isLoadingCreateQuestion: false,
    }),

    setShowNextTurn: assign({
      showNextTurn: true,
    }),

    // Error handling actions
    setError: assign({
      error: ({ event }) => {
        if (event.type !== "ERROR") return null;
        return event.error;
      },
    }),

    clearError: assign({
      error: null,
    }),

    // Subscription cleanup actions
    cleanupSubscriptions: ({ context }) => {
      if (context.gameSubscription) {
        unsubscribeFromGame(context.gameSubscription);
      }
      if (context.playersSubscription) {
        unsubscribeFromGamePlayers(context.playersSubscription);
      }
      if (context.questionsSubscription) {
        unsubscribeFromQuestions(context.questionsSubscription);
      }
      if (context.answersSubscription) {
        unsubscribeFromAnswers(context.answersSubscription);
      }
    },
  },

  actors: {
    // Fetch game data
    fetchGameData: fromPromise(
      async ({ input }: { input: { gameCode: string; user: User } }) => {
        return gameServices.fetchGame(input);
      }
    ),

    // Start game
    startGame: fromPromise(async ({ input }: { input: { gameId: string } }) => {
      return gameServices.startGame(input);
    }),

    // Create question
    createQuestion: fromPromise(
      async ({
        input,
      }: {
        input: {
          gameId: string;
          language: GameLanguage;
          difficulty: GameDifficulty;
        };
      }) => {
        return gameServices.createQuestion(input);
      }
    ),

    // Submit answer
    submitAnswer: fromPromise(
      async ({
        input,
      }: {
        input: {
          questionId: string;
          playerId: string;
          gameId: string;
          selectedOption: number;
          responseTimeMs: number;
          timeLimitMs: number;
        };
      }) => {
        return gameServices.submitAnswer(input);
      }
    ),

    // Advance turn
    advanceTurn: fromPromise(
      async ({
        input,
      }: {
        input: {
          gameId: string;
          currentPlayerIndex: number;
          totalPlayers: number;
        };
      }) => {
        return gameServices.advanceTurn(input);
      }
    ),

    // Handle question timeout
    handleQuestionTimeout: fromPromise(
      async ({
        input,
      }: {
        input: {
          gameId: string;
          isHost: boolean;
          hasCorrectAnswer: boolean;
        };
      }) => {
        return gameServices.handleQuestionTimeout(input);
      }
    ),

    // Leave game
    leaveGame: fromPromise(
      async ({ input }: { input: { gameId: string; playerId: string } }) => {
        return gameServices.leaveGame(input);
      }
    ),

    // Realtime subscription actors
    setupGameSubscription: fromCallback(({ sendBack, input }) => {
      const { gameId } = input as { gameId: string };

      const subscription = subscribeToGame({
        gameId,
        onUpdate: (payload) => {
          if (payload.eventType === "UPDATE" && payload.new) {
            sendBack({ type: "GAME_UPDATED", game: payload.new });
          } else if (payload.eventType === "DELETE") {
            sendBack({ type: "GAME_COMPLETED" });
          }
        },
      });

      return () => {
        unsubscribeFromGame(subscription);
      };
    }),

    setupPlayersSubscription: fromCallback(({ sendBack, input }) => {
      const { gameId } = input as { gameId: string };

      const subscription = subscribeToGamePlayers(() => {
        // Refetch players when there's a change
        import("@/lib/supabase/supabase-game-players").then(
          ({ getPlayersForGame }) => {
            getPlayersForGame(gameId).then((players) => {
              sendBack({ type: "PLAYERS_UPDATED", players });
            });
          }
        );
      });

      return () => {
        unsubscribeFromGamePlayers(subscription);
      };
    }),
    setupQuestionsSubscription: fromCallback(({ sendBack, input }) => {
      try {
        const { gameId } = input as { gameId: string };

        const subscription = subscribeToQuestions((payload) => {
          if (
            payload.eventType === "INSERT" &&
            payload.new &&
            payload.new.game_id === gameId
          ) {
            const startTime = payload.new.started_at
              ? new Date(payload.new.started_at).getTime()
              : Date.now();

            sendBack({
              type: "QUESTION_CREATED",
              question: payload.new,
              startTime,
            });
          } else if (
            payload.eventType === "UPDATE" &&
            payload.new &&
            payload.new.game_id === gameId
          ) {
            sendBack({ type: "QUESTION_UPDATED", question: payload.new });
          }
        });

        return () => {
          unsubscribeFromQuestions(subscription);
        };
      } catch {
        return () => {};
      }
    }),

    setupAnswersSubscription: fromCallback(({ sendBack, input }) => {
      const { questionId } = input as { questionId: string };

      // Validate questionId before setting up subscription
      if (!questionId || questionId.trim() === "") {
        return () => {};
      }

      const subscription = subscribeToAnswers(() => {
        // Refetch answers when there's a change
        import("@/lib/supabase/supabase-answers").then(
          ({ getAnswersWithPlayerForQuestion }) => {
            getAnswersWithPlayerForQuestion(questionId).then((answers) => {
              sendBack({ type: "ANSWERS_UPDATED", answers });
            });
          }
        );
      });

      return () => {
        unsubscribeFromAnswers(subscription);
      };
    }),

    // Question timer
    questionTimer: fromCallback(({ sendBack, input }) => {
      const { timeLimit } = input as { timeLimit: number };

      const timeout = setTimeout(() => {
        sendBack({ type: "QUESTION_ENDED" });
      }, timeLimit * 1000);

      return () => {
        clearTimeout(timeout);
      };
    }),
  },

  guards: {
    // Host guards
    isHost: ({ context }) => context.isHost,

    // Turn guards
    isCurrentPlayersTurn: ({ context }) => {
      if (!context.game || !context.user) return false;
      const currentPlayer = context.game.players[context.currentPlayerIndex];
      return currentPlayer?.player_id === context.user.id;
    },

    isNextPlayersTurn: ({ context }) => {
      if (!context.game || !context.user) return false;
      const nextPlayerIndex =
        (context.currentPlayerIndex + 1) % context.game.players.length;
      const nextPlayer = context.game.players[nextPlayerIndex];
      return nextPlayer?.player_id === context.user.id;
    },

    // Game state guards
    hasGame: ({ context }) => context.game !== null,

    canStartGame: ({ context }) => {
      if (!context.game || !context.isHost) return false;
      return (
        context.game.players.length >= 2 &&
        context.game.players.length <= context.game.max_players &&
        context.game.status === "waiting"
      );
    },

    // Question guards
    hasCurrentQuestion: ({ context }) => context.currentQuestion !== null,

    isQuestionEnded: ({ context }) => {
      return context.currentQuestion?.ended_at !== null;
    },

    hasCorrectAnswer: ({ context }) => {
      return context.allAnswers.some((answer) => answer.is_correct);
    },

    allPlayersAnswered: ({ context, event }) => {
      const hasGame = !!context.game;
      const hasQuestion = !!context.currentQuestion;
      const playersCount = context.game?.players?.length || 0;

      // Use answers from the event instead of context since updateAnswers hasn't run yet
      const answersCount =
        event.type === "ANSWERS_UPDATED"
          ? event.answers?.length || 0
          : context.allAnswers?.length || 0;
      const result =
        hasGame &&
        hasQuestion &&
        answersCount === playersCount &&
        answersCount > 0;

      return result;
    },

    // Answer guards
    // Game completion guards
    isGameCompleted: ({ context }) => {
      return context.game?.status === "completed";
    },

    shouldCompleteGame: ({ context }) => {
      if (!context.game) return false;

      // Don't try to complete if already completed
      if (context.game.status === "completed") return false;

      // Each player should play 1 turn, so total turns = totalPlayers * 1
      const totalPlayers = context.game.players.length;
      const totalTurnsNeeded = totalPlayers; // 1 turn per player
      const turnsCompleted = context.game.turns_completed || 0;

      // Game should complete when we've completed all required turns
      return turnsCompleted >= totalTurnsNeeded;
    },

    // Error guards
    hasError: ({ context }) => context.error !== null,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RQIYFswFkUGMAWAlgHZgB0xBALgSgDYEBexUAxAJIBybAKmwIIAZNgC0AogG0ADAF1EoAA4B7WFQKKickAA9EARgBsATlIAOfQHZd5gCyHJAVkmSAzOYA0IAJ6ITu0o6dXa3tzQ2d7ACYAXyiPVAxsfGIyWkUUCGYWCHUyYgA3RQBrMnisXEISUlT05gR8xRwUanUpaVbNJRVmjSRtRAiTCNNB0JNrc0HDfRMPbwQrc1JDe2ddeytdE0MI5fsYuPQypMrqjKJWMAAnS8VL0nlaJoAzW7RSUsSKlLSzqDqiAqNbqtdq9TqqdSaHQIcwRPzWfSSMwmcKGAzOayzPTmRbLVbrSxbHb2PaxEAfcrJUiwMCUajnACq8gAygBXABGsBwlwI8m6sBYoIUyghPVA0IiA1I1jhZkkhgmO2mESx8x2Jml5n09hMJnMkgiBoc+3Jh0+VJpdOYTLZnO5vP5gt0sjBIu6UP6g2GEVG40m01VzkNSx2+t0znCJhJ+hNFOOJUOfBw1DyYBYAlEfAAaqIAPoAcT4mAkMg6brUYr6CGcKOspF08ply0MUbMqt0aI1umsY2WcJbrnMsbNlMqpSTKbTheLuYZAAUACJ8biiBdCkDg929aGRSRLFby6aKpz2VUy5zGbaGqYRaZWazDhKjhMYCcEVMsad5+dLldr51ll0FYegg9iIvuziHnqgwnqqhqSIsWxRrohoki41gPmScZfO8ibJu+U5Ft+i7Lqu4gRC6wpAZC26IOse54lBx4OJiXh6Aafi3mBqJovo1jOI+Rw4eO+Efl+s4kX+4jOJRG7ljR4p6OMdY1gMIQRBhVj6CqbEIBYXaMbYyH3oJ5pjnhk4sHOAh8AAmqIABKzISb+ZGlq61GVhKBh+Aq+j+UE6wYme2nSpI2n6BekUoVsmEHE+8a4a+olpo5DkAPIOeum7AbRCCSgapAuHYyxRtqmynrp-HTKQriROY9iGLYfmmc+SVgG+H4AMIZnwDm5mlmXZfJXn9Jse5IcEjg1g2OlzCSGpRmE0zQTs4StYlImTqQEC0lcaAUOcc54CgNKCu5VGiiBRiLEqkyWBGOr6O2Rj2KYLaIg1EwrCsG3CRZBE7XtlwHUQzDHadabiABHlXXl+q3VM93hpGz26d2-mkBEJLOP5CFGEEf1UltgO7ZQ+2HVAENneRsk5QpVYI1jSOhijT3tgYdaGNsmxjLYkq-VhI6bQDqZVIo7Lsp4n5ES5pFrhdcmeSBmwIvWPaNQ2kjdg2zjthhzi1dpBjafxEY+kT5nJdtqSS9L4k-vL0N0yNIFonW4YDOFVjm-rKz+AMgwdkGOrrULCX-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-B-ui3acQUD5cUPwMYH1YIUsFMOwvg5M4EUGgB4tJmChIp1mxvY3S+06kCv7v6orbyhLH4Q5n4gQMJ7hfI7aDDYyRR6wdrhRczYwRjApDIv5v4f5gHcJTqwIb6fbN6NYgLAG4Ff6HAQGn7aaW5gQMQHhX7wTD5wjyi1Qtg9guAHg+gz7b6BLkGgGQA-4N5FD-5LqAECF7QQDUHm60FpwwFYxbDwECxIEKJTBGzIgyg6hOADDYEgFSFr6EGa5b4kHfYrySHkzSHXxg6QFyHQERr7j6gYiP5BhzRO52BDAUK4x8QOCTwNRAKoooB5CZD177xiE4SBHBHnAyG96EKRBnhjB+B5way6gyJxSz5tSRGZAEEa4fZa6mEpBJpRF-DWGc6xFVjxFVQaow6bCWDjCyjLBAIEEsDWLcAOSKrrY6YwhwjbbIiog3qqhmYBAuBqKhDhBmol6JTNE9SZj9SDRZSdGW4xRDBgTYwaqNSzwsGFTjCgriJSKRAxgmhECKC7TwC9Ay5QF5QAC0uqiAVxTiySOoeozYPYgC5qiUFA1AdAjAzAlxhCMo7Yo8SwpCUwGEsik+ARPwvxdheUPiWcqxkE-qe2H8ukTUXiPqfaYEec3u2ulo28NoHIXIPIfIFYZxl0G2AJKBGokE4wSIWo2wiIhxkxLeKUfxVY-yl+GezBkGtYTa2oji3ElW6RfBy6kyFS0yVMDyYAbJO4DYnJq0J4kGf8sIpgFgGkmkA4iG7xLJNsEsUsMpPgmMnsxqPsJm6MuMvkwQNgWqaICEUYcmqCjczc28BpaoKEtUo8d4+e0i-k+sOIjK1mps-kAwExGR4hICjp4Cl85wrp9udYZ2tgkEBMow+skUpgNYsIAQfMYw2OIShwrp9U8pricE6I9YGk3MjCIQ-i2ppBcuAeYpoMh+dSrp+gcp6eCpWeHaKy2sLY7srgKEhguZJSimbWAqDqXqqcIESoSRGkVgPo0i-EpWHa-kdYwQCG3ER4OJBROuT612o6zA46Lyk5POSotUPoFZyEk8LBrZe4LEowAwsIuoQ5cKbWJ8sZCEl4Yw4iNgsIEY7gHaWoq5fMcIPijUYQz5I5U2cWi2PIMZMJhCf8PoSwX5rK9Rf5yOkQBqGE+e-OjUvB25O+v2aG-2s2D2zAwOVwsZkQfggKa5XBkEcIyOX8g4oQ0mJqEFrGr50FA2kAsZUiqymyf5iIKEyOoUp29Jecx6wpBFE2euBuzOxulArpYKwGIQEwwQxqXuZWYQSw3YM02oHBoZIpgB9msAQeIe5wYenWkeZJSs9a+Ueofg2sKw-YwQf8bYXShoz8tgWozx0wnyHF2ie+HeK+NSrpvE9YVgs8Yw-qSI2eBgWSxWBs4w3MehFB5woSrpGIYKtUlg8orgdgBgKIJZVg0o2MA5-ZywGEaVghEAWVU0fJSMBVo8qwZ4jYpgBUHEDYVpARRR0J5JXRF4ywihc8A42w0iw+HYSIlK6wkwt4v50u25qKTwSl8F3qOwTa6ituHYYKk+CRCVvhxUoQwKGiNZlQBB4VOo16kmKlviugcEwG55+oYQU+3MwQMQMQQAA */
  id: "gameMachine",
  initial: "initializing",
  context: {
    gameCode: "",
    game: null,
    user: null,
    isHost: false,
    currentPlayerIndex: 0,
    currentQuestion: null,
    questionStartTime: null,
    selectedLanguage: "javascript",
    selectedDifficulty: "medium",
    allAnswers: [],
    winner: null,
    isLoadingCreateQuestion: false,
    showNextTurn: false,
    gameSubscription: null,
    playersSubscription: null,
    questionsSubscription: null,
    answersSubscription: null,
    error: null,
  },
  states: {
    initializing: {
      on: {
        INITIALIZE: {
          actions: "initializeGame",
          target: "loading",
        },
      },
    },

    loading: {
      invoke: {
        src: "fetchGameData",
        input: ({ context }) => ({
          gameCode: context.gameCode,
          user: context.user as User,
        }),
        onDone: {
          actions: "setGameData",
          target: "settingUpSubscriptions",
        },
        onError: {
          actions: "setError",
          target: "error",
        },
      },
    },

    settingUpSubscriptions: {
      always: [
        {
          guard: "hasGame",
          target: "gameActive",
        },
        {
          target: "error",
          actions: "setError",
        },
      ],
    },

    gameActive: {
      initial: "determiningPhase",
      invoke: [
        {
          src: "setupGameSubscription",
          input: ({ context }) => ({ gameId: context.game?.id || "" }),
        },
        {
          src: "setupPlayersSubscription",
          input: ({ context }) => ({ gameId: context.game?.id || "" }),
        },
        {
          src: "setupQuestionsSubscription",
          input: ({ context }) => ({ gameId: context.game?.id || "" }),
        },
      ],
      states: {
        determiningPhase: {
          always: [
            {
              guard: "isGameCompleted",
              target: "completed",
            },
            {
              guard: ({ context }) => context.game?.status === "waiting",
              target: "lobby",
            },
            {
              guard: ({ context }) => context.game?.status === "active",
              target: "activeGame",
            },
          ],
        },

        lobby: {
          initial: "waiting",
          states: {
            waiting: {
              on: {
                START_GAME: {
                  guard: "canStartGame",
                  target: "starting",
                },
              },
            },
            starting: {
              invoke: {
                src: "startGame",
                input: ({ context }) => ({ gameId: context.game?.id || "" }),
                onDone: {
                  target: "#gameMachine.gameActive.activeGame",
                },
                onError: {
                  actions: "setError",
                  target: "waiting",
                },
              },
            },
          },
          on: {
            GAME_UPDATED: [
              {
                guard: ({ event }) => event.game.status === "active",
                actions: "updateGameData",
                target: "#gameMachine.gameActive.activeGame",
              },
              {
                actions: "updateGameData",
                target: ".waiting",
              },
            ],
            PLAYERS_UPDATED: {
              actions: "updatePlayers",
            },
          },
        },

        activeGame: {
          initial: "determiningTurnPhase",
          states: {
            determiningTurnPhase: {
              always: [
                {
                  guard: ({ context }) => {
                    // Only check completion when there's no active question
                    if (!context.game || context.currentQuestion) {
                      return false;
                    }

                    const shouldComplete =
                      context.game.status !== "completed" &&
                      (context.game.turns_completed || 0) >=
                        context.game.players.length;

                    return shouldComplete;
                  },
                  target: "#gameMachine.gameActive.completingGame",
                },
                {
                  guard: "hasCurrentQuestion",
                  target: "questionActive",
                },
                {
                  target: "questionSelection",
                },
              ],
            },

            questionSelection: {
              on: {
                SELECT_LANGUAGE: {
                  actions: "setSelectedLanguage",
                },
                SELECT_DIFFICULTY: {
                  actions: "setSelectedDifficulty",
                },
                CREATE_QUESTION: {
                  guard: "isCurrentPlayersTurn",
                  target: "creatingQuestion",
                },
              },
            },

            creatingQuestion: {
              entry: "setLoadingCreateQuestion",
              invoke: {
                src: "createQuestion",
                input: ({ context }) => ({
                  gameId: context.game?.id || "",
                  language: context.selectedLanguage,
                  difficulty: context.selectedDifficulty,
                }),
                onDone: {
                  target: "questionActive",
                  actions: "setCurrentQuestion",
                },
                onError: {
                  actions: ["setError", "clearLoadingCreateQuestion"],
                  target: "questionSelection",
                },
              },
            },

            questionActive: {
              initial: "answering",
              invoke: [
                {
                  src: "questionTimer",
                  input: ({ context }) => ({
                    timeLimit: context.game?.time_limit || 120,
                  }),
                },
                {
                  src: "setupAnswersSubscription",
                  input: ({ context }) => {
                    const questionId = context.currentQuestion?.id;
                    if (!questionId) {
                      throw new Error(
                        "No current question available for answers subscription"
                      );
                    }
                    return { questionId };
                  },
                },
              ],
              states: {
                answering: {
                  on: {
                    SUBMIT_ANSWER: {
                      guard: ({ context }) =>
                        !!context.currentQuestion?.id &&
                        !!context.user?.id &&
                        !!context.game?.id,
                      target: "submittingAnswer",
                    },
                  },
                },
                submittingAnswer: {
                  invoke: {
                    src: "submitAnswer",
                    input: ({ context, event }) => {
                      if (event.type !== "SUBMIT_ANSWER")
                        throw new Error("Invalid event");

                      const questionId = context.currentQuestion?.id;
                      const playerId = context.user?.id;
                      const gameId = context.game?.id;

                      if (!questionId) {
                        throw new Error("No current question available");
                      }
                      if (!playerId) {
                        throw new Error("User not authenticated");
                      }
                      if (!gameId) {
                        throw new Error("No game available");
                      }

                      return {
                        questionId,
                        playerId,
                        gameId,
                        selectedOption: event.selectedOption,
                        responseTimeMs: event.responseTimeMs,
                        timeLimitMs: (context.game?.time_limit || 120) * 1000,
                      };
                    },
                    onDone: {
                      target: "answered",
                    },
                    onError: {
                      actions: "setError",
                      target: "answering",
                    },
                  },
                },
                answered: {
                  // Wait for question to end or for other players
                },
              },
              on: {
                QUESTION_ENDED: {
                  target: "handlingTimeout",
                },
                ANSWERS_UPDATED: [
                  {
                    guard: ({ context }) =>
                      context.currentQuestion?.ended_at !== null,
                    actions: ["updateAnswers"],
                    target: "showingResults",
                  },
                  {
                    guard: "allPlayersAnswered",
                    actions: ["updateAnswers"],
                    target: "showingResults",
                  },
                  {
                    actions: ["updateAnswers"],
                  },
                ],
                SET_WINNER: {
                  actions: ["setWinner"],
                  target: "showingResults",
                },
              },
            },

            handlingTimeout: {
              invoke: {
                src: "handleQuestionTimeout",
                input: ({ context }) => ({
                  gameId: context.game?.id || "",
                  isHost: context.isHost,
                  hasCorrectAnswer: context.allAnswers.some(
                    (answer) => answer.is_correct
                  ),
                }),
                onDone: {
                  target: "showingResults",
                },
                onError: {
                  actions: "setError",
                  target: "showingResults",
                },
              },
            },

            showingResults: {
              entry: "setShowNextTurn",
              on: {
                NEXT_TURN: {
                  guard: "isNextPlayersTurn",
                  target: "advancingTurn",
                },
              },
            },

            advancingTurn: {
              invoke: {
                src: "advanceTurn",
                input: ({ context }) => {
                  const input = {
                    gameId: context.game?.id || "",
                    currentPlayerIndex: context.currentPlayerIndex,
                    totalPlayers: context.game?.players.length || 0,
                  };

                  return input;
                },
                onDone: {
                  actions: ["resetQuestionState"],
                  target: "determiningTurnPhase",
                },
                onError: {
                  actions: "setError",
                  target: "showingResults",
                },
              },
            },
          },
          on: {
            GAME_COMPLETED: {
              target: "completed",
            },
            QUESTION_CREATED: {
              actions: "setCurrentQuestion",
              target: ".questionActive",
            },
            QUESTION_UPDATED: {
              actions: ["updateCurrentQuestion"],
            },
          },
        },

        completingGame: {
          invoke: {
            src: fromPromise(async ({ input }) => {
              const { gameId } = input as { gameId: string };
              return await gameServices.completeGame({ gameId });
            }),
            input: ({ context }) => ({
              gameId: context.game!.id,
            }),
            onDone: {
              // Wait for the game status to be updated via realtime
              // The GAME_UPDATED event will trigger transition to completed
            },
            onError: {
              actions: "setError",
              target: "activeGame",
            },
          },
        },

        completed: {
          invoke: {
            src: fromPromise(async ({ input }) => {
              const { game } = input as { game: GameWithPlayers };
              return await gameServices.calculateWinner({ game });
            }),
            input: ({ context }) => ({
              game: context.game!,
            }),
            onDone: {
              actions: "setWinner",
            },
            onError: {
              actions: "setError",
            },
          },
          entry: "cleanupSubscriptions",
        },
      },
      on: {
        LEAVE_GAME: {
          target: "leaving",
        },
        GAME_UPDATED: [
          {
            guard: "isGameCompleted",
            actions: "updateGameData",
            target: ".completed",
          },
          {
            guard: ({ context, event }) => {
              // Trigger completion immediately when all turns are done
              // This should happen as soon as turns_completed reaches the required number
              if (!context.game) {
                return false;
              }

              const shouldComplete =
                context.game.status !== "completed" &&
                (event.game.turns_completed || 0) >=
                  context.game.players.length;

              return shouldComplete;
            },
            actions: "updateGameData",
            target: ".completingGame",
          },
          {
            guard: ({ context, event }) => {
              // Check if the turn changed
              const turnChanged =
                event.game.current_turn !== undefined &&
                event.game.current_turn !== context.currentPlayerIndex;

              return turnChanged;
            },
            actions: "updateGameData",
            target: ".activeGame.determiningTurnPhase",
          },
          {
            actions: "updateGameData",
          },
        ],
        PLAYERS_UPDATED: {
          actions: "updatePlayers",
        },
        ERROR: {
          actions: "setError",
        },
        CLEAR_ERROR: {
          actions: "clearError",
        },
      },
    },

    leaving: {
      invoke: {
        src: "leaveGame",
        input: ({ context }) => ({
          gameId: context.game?.id || "",
          playerId: context.user?.id || "",
        }),
        onDone: {
          target: "left",
        },
        onError: {
          actions: "setError",
          target: "gameActive",
        },
      },
    },

    left: {
      type: "final",
      entry: "cleanupSubscriptions",
    },

    error: {
      on: {
        RETRY: {
          target: "loading",
          actions: "clearError",
        },
        CLEAR_ERROR: {
          actions: "clearError",
        },
      },
    },
  },
});
