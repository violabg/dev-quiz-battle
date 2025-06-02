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
      userAnswer: ({ event, context }) => {
        if (
          event.type !== "GAME_UPDATED" ||
          event.game.current_turn === undefined ||
          event.game.current_turn === context.currentPlayerIndex
        ) {
          return context.userAnswer;
        }
        // Turn changed, reset user answer
        return null;
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
      userAnswer: null,
      winner: null,
      showNextTurn: false,
      isLoadingCreateQuestion: false,
      isLoadingSubmitAnswer: false,
    }),

    // Answer actions
    updateAnswers: assign({
      allAnswers: ({ event }) => {
        if (event.type !== "ANSWERS_UPDATED") return [];
        return event.answers;
      },
      userAnswer: ({ event, context }) => {
        if (event.type !== "ANSWERS_UPDATED" || !context.user) return null;
        return (
          event.answers.find((a) => a.player_id === context.user!.id) || null
        );
      },
    }),

    setAnswerSubmitted: assign({
      userAnswer: ({ event }) => {
        if (event.type !== "ANSWER_SUBMITTED") return null;
        return event.answer;
      },
      isLoadingSubmitAnswer: false,
    }),

    setWinner: assign({
      winner: ({ event }) => {
        if (event.type.includes("done.actor") && "output" in event) {
          const output = event as {
            output: { playerId: string; user_name: string; score: number };
          };
          return output.output;
        }
        return null;
      },
    }),

    // Turn actions
    advanceCurrentPlayerIndex: assign({
      currentPlayerIndex: ({ context }) => {
        if (!context.game) return 0;
        return (context.currentPlayerIndex + 1) % context.game.players.length;
      },
    }),

    // Loading state actions
    setLoadingCreateQuestion: assign({
      isLoadingCreateQuestion: true,
    }),

    clearLoadingCreateQuestion: assign({
      isLoadingCreateQuestion: false,
    }),

    setLoadingSubmitAnswer: assign({
      isLoadingSubmitAnswer: true,
    }),

    clearLoadingSubmitAnswer: assign({
      isLoadingSubmitAnswer: false,
    }),

    setShowNextTurn: assign({
      showNextTurn: true,
    }),

    clearShowNextTurn: assign({
      showNextTurn: false,
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
          hasCorrectAnswer: boolean;
        };
      }) => {
        return gameServices.advanceTurn(input);
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
      const timer = setInterval(() => {
        sendBack({ type: "TIMER_TICK" });
      }, 1000);

      const timeout = setTimeout(() => {
        sendBack({ type: "QUESTION_ENDED" });
      }, timeLimit * 1000);

      return () => {
        clearInterval(timer);
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

    isTimeUp: ({ context }) => {
      if (!context.questionStartTime || !context.game) return false;
      const timeLimit = context.game.time_limit * 1000;
      return Date.now() - context.questionStartTime >= timeLimit;
    },

    // Answer guards
    hasUserAnswered: ({ context }) => context.userAnswer !== null,

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
  /** @xstate-layout N4IgpgJg5mDOIC5RQIYFswFkUGMAWAlgHZgB0xBALgSgDYEBexUAxAJIBybAKmwIIAZNgC0AogG0ADAF1EoAA4B7WFQKKickAA9EARgBsADlIB2Q7oBMAVgA0IAJ6JzpK5Le6r1w2YCck-QC+AXaoGNj4xGS0iigQzCwQ6mTEAG6KANZkoVi4hCSk0bHMCKmKOCjU6lLS1ZpKKpUaSNqIAMz6kqZWZpa2DnpmpJI9ACySXr7+QSHoORH5hXFErGAATquKq6TytBUAZptopNnheVExS1AlRGnljdW1zfWq6po6CCY++qStVh761jsjgQukGw3MYwmhj8gWCIBOuUipFgYEo1GWAFV5ABlACuACNYDhVgR5I1YCxHgplC8mqB3r9OiZuuZAf0QfpWiMXCYTBYfD5DJIRkYTK1pvDZqckSi0cwsXjCcTSeTKbpZE8aY03m0Ol0emzga0LLpSLpQRZxszvNCpnCEfMsrM+DhqCkwCwBKI+AA1UQAfQA4nxMBIZHUtWo6S0EK1dNDSIZfj5WsygYgLCNWq1TPofAYTEZWvmfFYJQ6zsdna6CO6WMHQ-6MQAFAAifG4olbVJAz21zXeuhhQxTafZzIsPxhkKsNvz5aliPy2Rdbo9zYEfAAmqIAErYpttjtdnt9qM6kHQ7l53RjAF9YH6KxWRO9DxQ+f2xeOqsYVe1j0913AB5XdT0jV4Bz0FNuVcA0H0QZ8fFICwuWLcZZ18XQFzCJcnT-Gs6wAYS9Phd39IDQPAhpzygkF80nQxnxFbwEIQEVJyfAEnw-O0Zlwn8V0IsgIFRNY0AoZZmzwFAUUpcNNRoyD6UQPluQsCwuMNPQsxMM0n0kd9MOhHC5krIS11IUTKHEySoGk2SPXEdUIyU6N3jUlDNKse90xBXRfkTcwDF0SQfBNDSyy-ATzOrSzrNsohmAcuTxAsDVqTci8kNIUU2NQyRjBGcxDEMEYPE8MVxWisykQsgCCkUfF8XsesQwDFt207bsFMy2kLxTHNmLyvzQsFEdLUFKxwssVDTOlZc4oa6Jmtajdtz3A9OuPHqMt7CD3LaSRXFIL4wtTNjLBMTpCqMPwP3mvDfzAf93Ua1bSAAdxQVRlhYbFuDI7gg3a6j+ro2bkPNEx4zHYFzW8FxDDujC50ewSlrelaWuRSgUFWdFWESfJSkyZ6Fvwl7hPenHYDxgnilKO4oweXr9qyuirBGZCRvZVCudIYr4zKiqLCq9HYoIyzsfsXH8cJlg1g2LYdn2Q5yae+qsaa2n6cJ65bgqFmZDB-sVJBbNjFHS6wu5NxvB44yfAlurMbIXA10DWY2sbIjgMwDdRG603aPNzS-BcONtIQMWh1MONSvK58xezF3FqlhqPYAr2MBYABFDFRABthgI4f0iN3b1g7Zs9lJjXlkMMnzo4067cvCwwTSfSrU5qinnte93hJzj0C6L3hS8PLqTxrg6LwMVpjDGi6-LjdoUIMTNF6+YqRgsNPKcH0gs-dEerLE1YJKS5ZuFxVYiBSpzZ4583QvNFC99h-KRU6IXE9F8WfdNZu2PsPWY58bKXzsrfe+j81R7VrodEEhlTSZhNKxPymZbyCxKiLZOgD+K1XTlTSyJ8wBnwAI64jgI0bEYBaBgBrOof6ogvREWBpuDggYMR8EDGGBBc8IaFlNCxOG0F+QoU5LeVGvgD4D2pmQyh1C6ZRjoQwphRAWFsOBq2NgAAxPRbAiIYgENwLcIc66DmZMhW0vl2TxmNLlJiTcHpAIxhnN6ijwFUJoao+hjDGgsArlXAMY9i6lwsUg0KfIUJoTEfRVMgsAq3jMKVBxsJCH9y1kPT24DiRgCNssPOyjAnE2SDcDIlMskgK8RgUg+TClQGKb49QBsyhGyqCbZ+4NX7DEnKhXS+VQrGB8imTuAIUw+BFHI7JoDcl1IaYTZpKjmFK02NsXYlADiXw1u4khmcwELNWAUpZJSoxtOZp0mo3SzYxmGf0uJl1BR6XzHGEYqSSrtBmTUw5ZAfErKIIPfOhdwll1EBwVsM8BEvxjFvF84JeiYNTN8FOXN9ATnCl8b5HicnZ28Wc9QQK+AcGxAAdU2lPHakSLwaUKiOFefNCrIS5JYR2aM3GS32Z435pB-mNCBdiIO-pSWcA4HualdE4VDHgpg6wnQjCZn8G4Wc01qqZOATiuZeK6l8qjEfFARBYCfTWPEbEGIABCmAeD+mJWS8VNzQ53NcJ0WxLc97GGGM3KK6q9n6p5bqwl1NYAEgknKZYfBDXGtWAkJI5AKlkwrK7TVtS-kEsBUGkNVBCYRqNWsC5HSiCs2hT02FwpJwjCsFHfKxo9L6DzGMYUa8PDYq5bi0++KWnpsssG-Eobs2RrWIrdY6zVZbPVom4hfr5mps7UfHtfbmA5qjfm+4XTi23MHJ4ScjykXDCSZMmRJkOVJtbVq9tdTYB4EUJ9Zgu44C4loJQCkYqAAawNuAYl3BwCVvTPCC0LF6zBg0hgdDcPmfBvcfWcqndq92EAUgGpwMwGBmiylxrSAm780GFE8tiAhogSGb53yICu421z12Oo8gmJudjgT8iTC4UDYUAGQclDFE9MHz1wfw4RqAKGh3Kw2WrHZE7D44encfeDiHkPEdI1cn9dzjrloA7RjMSZkJ-zwT3NVbGiFRAKSkeIaHSZVKegwlAhnlhycLWu1yJb3ieFXtzPSXMsxGGhPoXe+9j0LAM-ENZKtNnbKOKJgofmrNMwLUWuzG62jxhscmBl8N9CWEFlzPwxYYa-CzHIgLLBK7cF3OYh1ljVJfB+H8QD7JnDOpcU7Piun+55ZIt6cilEwIlaQb8dee8vgYPscdIKfheTWkmLCOERBFCiXgM0UTMXKOIAALT6D8stuRFBqB0EYMwebpX2IWFGoNyQ6ERv1YyY1szFwduKXs4hTzPJjuIvZFM06z4TAjA+9YCt3QdOhdlITBUBIiQkjJFGGbfVYv7dGgx97tKxZnZbYPXbSDuaml5sCEsQxCoAdcVBjj1MEpQOvvZGSKJkfZWLE4+J5ouRmjjAFY673XMjER9TGW5O6KlRfMNfr8M3DfFcA7TwTtWfSx1rLb6v0oAc9fgjM00dzQmlyvTlLYUIpzR82JsXH06by2uxDhbII-hMkusMwWnnuafa5s+QwouDnTpl-XOMQx-gK7zEvZxRl2V48neJ2DEDEoydgaTsAjuPKfBd1Vuje8cwdHc0nbTdvuUSYDUQNRATHWIPnh9l8rQ3AysZXnxM5VvK44u76v3XH6nHMacs25We6IN0j6p+iFgPWLxSaVT553QuzJTbytNSObuQ4CpaM0d4W4WlOkOdCZfe8-JT4PhRA6STLDD3odoS8J-VuKkjQqYwvhizb0ntt5CO0ArnZmsNUAl1rHXyCYRkcnt0eNN8d773vBt6zHvbzPutf2-91T31RX0gHvw0mcE838BbnaBzEzGZFBCFCHEtBZ013kVIR5UvWvVvXvUfXB3ZluwQAhGbxbiYhEWRQCmNCHDGF+yw3x3QIkzw2kyI3vnvwCk5FOjKiSwzHzBuiY3A0T1QNmRwEUDQB2DEggDAOhD0jbxhBbhhk6EFGFgTxThoPY18ws313wMh2zCfBAzd00mn38GzACiFEtFt1QIYT2EoDALbz0LYi5BhlMCmU3w8y81y2HVWFYOO0nGmhUxbj3RFD5CtARyCACCAA */
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
    userAnswer: null,
    winner: null,
    isLoadingCreateQuestion: false,
    isLoadingSubmitAnswer: false,
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
                    if (!context.game || context.currentQuestion) return false;

                    const shouldComplete =
                      context.game.status !== "completed" &&
                      (context.game.turns_completed || 0) >=
                        context.game.players.length;

                    // Check if game should be completed

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
                        !context.userAnswer &&
                        !!context.currentQuestion?.id &&
                        !!context.user?.id &&
                        !!context.game?.id,
                      target: "submittingAnswer",
                    },
                  },
                },
                submittingAnswer: {
                  entry: "setLoadingSubmitAnswer",
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
                      actions: [
                        "setAnswerSubmitted",
                        "clearLoadingSubmitAnswer",
                      ],
                    },
                    onError: {
                      actions: ["setError", "clearLoadingSubmitAnswer"],
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
                  target: "showingResults",
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
                    hasCorrectAnswer: context.allAnswers.some(
                      (answer) => answer.is_correct
                    ),
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
            guard: ({ context }) => {
              // Only trigger completion if:
              // 1. Game is not already completed
              // 2. We're not currently in a question (to avoid interrupting normal flow)
              // 3. Turns are actually completed
              if (!context.game) return false;

              const shouldComplete =
                context.game.status !== "completed" &&
                !context.currentQuestion &&
                (context.game.turns_completed || 0) >=
                  context.game.players.length;

              return shouldComplete;
            },
            actions: "updateGameData",
            target: ".completingGame",
          },
          {
            guard: ({ context, event }) => {
              // Check if the turn changed
              return (
                event.game.current_turn !== undefined &&
                event.game.current_turn !== context.currentPlayerIndex
              );
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
