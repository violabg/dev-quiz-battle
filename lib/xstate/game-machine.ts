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
  /** @xstate-layout N4IgpgJg5mDOIC5RQIYFswFkUGMAWAlgHZgB0xBALgSgDYEBexUAxAJIBybAKmwIIAZNgC0AogG0ADAF1EoAA4B7WFQKKickAA9EARgBsATlIAOfQHYATLpPmAzCcOTz+gDQgAnohO7SAVklAgwAWEztgyTtdAF9o91QMbHxiMlpFFAhmFgh1MmIAN0UAazIErFxCElI0jOYEAsUcFGp1KWk2zSUVFo0kbURLE0tTIaHg82c7Pztzdy8EXXNzUkNp3T8TQMMjc11LWPj0cuSqmsyiVjAAJyvFK9J5WmaAMzu0UjKkytT086h6oiFJo9NodPpdVTqTQ6BBWXzBfSSQzhAx2fTBKJzPRLFZrDZbHZ7A4gT4VFKkWBgSjUC4AVXkAGUAK4AI1gOCuBHkPVgLDBCmUkN6oBhE1I4Rm+kslkm030JixCD8OJs5j8CMsM0CwUMxNJJzIlOpzHpzLZHK5PL5ulk4MFPWhA30flMfnW5nGspmir86tI1iRyMRSMc5j1Ry+5LKfBw1HyYBYAlEfAAaqIAPoAcT4mAkMk69rUwv6CAc4VIuiRUXGlmVwWCit0hhsFdCbskwWl9ci4cSZKq0djBHjLGzufTtIACgARPjcUTT-kgCEOvowvwy3F2KvmQzjAKzTyITt2YyGaVI3c+HxhuIkiP90pHGNxhNjjNT2fzxc2gvdIuOkqiJbjue5qs4ioys4piGCYGpIvKVj7He+rfB8z5DiO74TjOc4LuIli2gK-5Qmu3iGMsVjOlElhgQejaSPKKxwQ48o2L6RIoQ+BroRgL7Dm+OYfrh37iHYRHLoWpEit4Hb+AiJg+PoBj2DYiphCY8nymEhirC4uh2L2xxoYOr4sJOAh8AAmqIABKDI4V++H5naJHFjC1gBOKFg2J2HpNpYDZHgg+jKf6lihR2SG6DFyGHH2PGmQJLB2bZADytlLiuAFkQgF7DJETjVpWBnooqGJMTMG6ngEPgxFxCUmRhZkAMJJnwtnpqlGVZVJ7kDJ2wxTHuMznu6fhuMFoW+NKzq7DqyrKYZDXGVGzUCaQEBUtcaAUBck54CglJ8i5xFCoBu7LCYfjIpY5hhDFTZ2I2Fj6KQSzhDsu4GRuRmRgO63xpt21XLtRDMAdR0JuIv6ueduXIi6awyoMUQxcijbqi6ykKZEZjqg4f2PrxYD8UDW2UDte1QJDx0ERJ2XSSWwS6MEpDOJIEXTGjT1BfMrOhf6vrbtM+P1kTiWAz8LIsh4o5CY5eGLqdkluYB1iOKQLMRJIcrKTFh78wEb2RKeiys+eE1+BLTV8Zh0uy-L46fkrMMM31gExXYdjinsOpoqq93PcFAu+JW8q+vds3TDba126+1SKDLcsWdZdkOS7okq4z-V5brwzbGYUxbNsvqNlz-qOM4tgRBNzqxwD8cbWkyekAA7igqgXCwDLcB13BZkJvVq7l6wYu9la2B2cEW5NRteeMoW2BszaniYDdPk3QMt7LFKUCgVw0qwORVA0JQk-9m+k-biet7A++H3UDTAkWoLZx7o9hMsCnomMVgOJjOCFY3R7ANr6AI1sVqXxJmTB2Hg94HyPiwa4tx7iPBeG8C+xMkrbyTrve+iCn6AkaM0V+Mhh7wxkgsZ0kgVjBDdMiCY11QiGz0PQ5YnNwhmHAhFNEG8YE31wK+TMRwnYZhamlTAFlRBZ3diPKhdhrA+xuuEXhyJzyWEVKebcWttJmAMAYc8-CcFkCEQJERGAWAAEVaSiF7mwNKHB0wtVssmWRf5KElkRC6VY25GF0QgsFWi9YYJRGRDYc268oHYKlqQMx8YLEJhsXY3gjjFbuLhquKhESXQ6lguqes6I1LBRqmzBSqx0TgM1MteKq1G7XwTvEsAiTgaU1BtTbgTIrhEFptDd+8iSyKIMv4ZEnZ9DaI0VoxSZSjCcwsP7dUt5anQJMXE+2LSKZU3BhcTp3TenWjkZ4mEcE2bTCcAZRR55nQKiCddXwyltgODhFYKJyyYlb1Meso4rStnMF2T0w6dNCIeKySWE5-hTySAubRLmNz5iBSlOKN06IKJSjMMY2JTSWkAEcmRwB6AyMAtAwBDnUD3UQSYWoD0shwTMtI+CZjzIc0FMJqwF2CWqdEMp7pzwGC4ZYykkSczdNKCYkC3mSw+Ws4R3zcX4qLIS4lpKiDkspQPacbAABimq2AtVpAIbgVkKEssQMVCe10PQE01KFSCCI3o+AiJWfJqKMVSqxbKvF98FVEpJT0FgLi3EZmSfYxxxqcpUNrOecUQwfKDC9nCgY+JXTuj3LMwYwRXUNI2u6jApAORgFIRcKxnq-UnzyMQ8+qE45ZqBjmsg+bC1QGLfK9QAIgSkNaOQ-pRyBiXnNb-KYLhQyQSlKc+6lZvZzR5Zm2B0rzHfIbUfZtXqyUoLuA8J4lBXigywZKmtnyZW5sXcwZdPQ20kJBF25l4aSyRqGjG3YcaDIJryuM3wUwDHKk1DC8V95GrVtnXW0gcqV1EFgdY2xIanGiA4NOZy16mYeUrJRGwA7FrDpKTFN6zYWaiw7DMJYM7BFfNzSBno4G+AcAZAAdXTuk+DIKb0eT7bsMwoRB3ygopBXcxhIjowCKsTYv6q31MAyRsgZGiwUao7R+y9GfwIdzjKCi-b2Poa47c1YWsWJoilMp3U0S91icPRJktUn7YsEozRujmd8LAsyUx7E90tZjVrIoxEFqR0+HZmjbYNgtgx0M7bfdc6EkepbWBizDIZHpmo5wDgdkw2Id7Sp1jaGh0afmIotEpBELC1POiCORHGnieA2Z9QgGiCwDbtcLIDJaQACFMA8HTFZ2TSXc57ERSo0KoUZQYg7FoqFmkMQegiJsWCp5ivZtK5JirN9YCsl2saC4fAqs1auNkXI5AK1XxWZi2b5XIsJ0WyyZbR81vVeuOel+nb2jdpNQsD0tCESSB0oMRSKlIKPNMEses3sdQWAotN2th2IuztO+d5gl2NvIJuOu9BW7MEiavsZ+dpGjsQ6W1QC763rvPw7UQN+inPaKOxkiFSpVgysLyueNmsETy6QmI8kHB70dkEOkQCA9AdkEAwIoJklAtun127u4LaOwu5s59zv5fOwAC8oDdwnxPGPJbyhsF0NEMQIl8pzLRBlhihRZm9rsoCll-rqaj4jJnSDS551AbgcuFdw9QRujBO6UcCJKzbu3sv+eC6V5e+7JPcq1mur7QKn1deaJKYVf0TrJjXUCsqVnoXmnfNgHgRQbdmC2TgEyWglBeQJYABoD24LSWyHAOuASlD46YoF9yBKy2qYwKjHCLVROioLAHrfs7iRAfIKAiA4D+V0lVZaduFErdxcXffJemMH8P0fOzx+B7IcH1XudlT178aNJvNPpReTr5EQYwYmyp6AxkIfI+x-dJdwjzd273ie9WVfpft-V-dPX3dmvuVxmaQyhGBDCQp1TBxZbjLLAlTjKBSipSj6Cp44CKBoCPBUjMCJLC7lrT57bvIhZIEoHEpHyJI-5E5Xpb6ARoiBCVy2BNirC+gRS8p5zogrC1iTwsweZhCIHIGoFEGiJrpoJP7I6z694Jz4E8HoFHAkEq4OZq4TS0K+KN7gSH5OrigM6wSOCKKbDm6v6xJiGEGQCYFT7FA4FGY3x6HbQQBSFkEyG5yUG0Ifa7C6RVI2olK6RvRoiOCoyDD8pcEEEWEP4CHu4v7CGiZmHcH6GWEE5B5-4KLBi4jyhTCOrDZ+BaJOAFzuh3ShCwTNj8LEooD5BZCT5nwmFoR5EFEXBWGb42GAQbjlQzymBRSDB3SrA6i5EFrlGXDw6BFI4e4hGpDtFELtrREPaOZKgx7zD0IxS5ZQqrwbiRChT8L8EsCuLcC2RGojFq5wi6JVjsFogYi6DqS+ABBBADoRBRCLFdH+rtSdTdSZQbG5zaxsx+x7hZH1gYgMQugxoTTNgej3S+gGZ3hECKBbTwB9Ao7kG5QAC0jBkJPiukk2yKN0nGBmEqaEFA1AdAjAzAEJVCnYDE9OLg3x6MLMIBuRvw2J1RuUoQmkzoUofi-WHoL6e4oSvCgqCKNg-CRoR8porI7InI3IRYoJZ0j2eJQSb24oUUBip41gdOrOOJt6G40agwJcDy9C4BskvG6oRgCISwgQusqemy7S2yNMgKYA8pMILMvGkKNEASNOTh-gWpqaupgQwmfRXuzceC8wwpoxk8muzxActgQcjYaIbemoE0Sw1gtEBkqeO88CHcXcUA5pbCUQ2mGIzYFE9g3s4xbCQCGw4Qb2JJypGaPeoRCcsZCCj8FwSZCwIBIElyGu6I6pCw4w8IKk108onYFEryFu+2bq4m1Z24tCDgypgYqp0wkEqIFYtYp+ZgQQKJPZuBEu6euahpYMd+AKUM1ZsEwwWpLEu4B+kE6alcWpEQFgGsl+YOoGiqvqN6Oc6sfmpgmo54QwKiE0TZDBZSWpsyDgE0xZqJIhM2Nux6RaR21Z0o2w4ozR-xFUb2I6lY7Miyfk8ybhF5Nuc2x2Ak1ZyGZ4LEmojgzYtYKRQSLgZSM8XYO+QwqF-e6FlWV2nIVZlJ2SewywDO2W+FewZcQSqwO59YBiABFEe4VFC+ZW4OC22OK2UAMO1wWFG476botcZYe4gw32p44oSwosTgeS2hbpb+l55GgieOVwkAWFjCEKVcFETqo232iKgZ4wg5N0uwQly5HOw+MuvO-ulAYF24ywyomwg5Om45seyIKwrMMpEw+Z4QTlLSme2eue+eheQpqsPatOSIKw2kRuQmkZWixcFYRgTYjEkQEZUV3y1+y+65A5oQSpmwo5TYapWio6EKew+iikIqvh4hFwiSFVmoalzgvxum3FE5iwWs05uwvV0wf5C5phoh4RFhFVvo70RgtYwByKmWx4SIbMQwkZzYr0GIbR+RFJ3paup4zJzFCIN0G48okQjYTgmkUUFlcoEC2l-6pwYAzwnljFt6tE70yolq3scEmRdRBgCFoQbYINLMFxqCW5GwSK6w7o6wG4yokE0EzRo1Ew2FFgsQsQQAA */
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
