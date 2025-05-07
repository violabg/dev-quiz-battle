import {
  submitAnswer as dbSubmitAnswer,
  getAnswersWithPlayerForQuestion,
} from "@/lib/supabase/supabase-answers";
import { removePlayerFromGame } from "@/lib/supabase/supabase-game-players"; // Assuming this exists
import {
  // getGameByCodeWithPlayers, // Not available, will construct query
  updateGameStatus,
} from "@/lib/supabase/supabase-games";
import {
  insertQuestion as dbCreateQuestion, // Renamed from createQuestion
  updateQuestion as dbUpdateQuestion, // Renamed to avoid conflict, and will handle boolean return
  getQuestionById,
} from "@/lib/supabase/supabase-questions";
import { assign, createMachine, fromPromise, log } from "xstate";
import type {
  GameMachineContext,
  GameMachineEvent,
  GameMachineInput,
} from "./gameMachine.types";

import type {
  Database,
  GameWithPlayers,
  Player,
  Profile,
  Question,
} from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export const gameMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5RQIYFswGIDiBBAsgKID6AqgAoAiuAKoZcQGIBKA8vsQMqkBCnAwswCS5GkNYA5ANoAGALqJQABwD2sAJYAXdSoB2ikAA9EARgDsJgBwA6AKwnbANhMBmEzIBMZi44A0IAE9EABZHM2srRwBOR2CTdyiPGSjggF9U-1QMTHIAGVwATUJmTjIqWnomNg5uPkERMUlZBSQQVQ1tPQNjBCTY61DLM2CPKJl7T38g3sdbaxlPWZdLGTDbFPTM9Cw8ImJKQlzCOgZCAA06ZglcXNyC5oN2rR19Vp7XEw8ByzjHDysPMF1pYpoh-lETBFhj8ZNCXI5VpsQFksLgJJwAOrFUoUagnKrsLi8ATCUTiaTyR5qZ5dN6IAC0MRsFgh8I8HksXicoN6Cy+n28s1sthccRcHiRKMwAEVSIROI0JMRCBIDqcLsVrrd7pTWk9Oq9QD1hXNRo4hrYeYCXHMRu54mMzB5ZmkMsjttYADYqFAQdS6KBCXTPFCeygoTQoTAQPRgaz+gBuKgA1nHvb6gyHPdhtuHIw89dSDd1TLYzDYrGZbEkXONOVEQYFEG4ohFYjJgk7RdERZKPem-QHM9pQ3mo2AAE4TlQT6xKT0RgBmM7QXp9EGH6lDOYwY4LyiLLxLCCcpqZVZ5AMc1iiEMcNtvjjCjj7GGsEDAmknaH9-sDwZHT1OEjL9MH3NpD1pI1SySAZVmCFYnRWWsTB5JxW1sSxbFCNxbHGGRXFfOMPy-Ccf2DIcAK3ICQKwKQTBaA8OiPOkEGCEY7AcLCyw5GRaz4tC8OsJIFlhOJBmwoj30-b9f0orNgIjOiPEYiDmKgoxEBNYTz0tJteTMGQb3+BwzCictsNmKSSNkij-wU2iwJcVT9RY6CT2FHTzQvfSTAhVsUkGFwzD+YJ4SiKTvQAIyigJMAACVYBViCECQhDECouBoXBmBoYhdkIcDXI094YhcHSnWFMYOSiFweVZaxlirMJxRcNxAUilQYrivJCmKFK0oyuhiCOXAADUSAKorIMNTSEBMWZrw8PTpksExgnmMK1rMVr2tdLY31gSMJ20AMdywGNdDjRMUzjI6UBO87OEnBN1AAYzAab1Nmnp2QI6wEVqkVgjGcTLzMyEQssH52OiGInyk+6Tr-c7MEnadZ3nJcV2sJHNCel73s+3UmJpH6wXYuZ73FcZ4Wp4UeTW68wvYzw4nccV9vdN9-VR3qimYAb0qETLRom-KCEKkm1LJ49XFGRrePcJ1gj4kUeXFT47A8YLoWWyw2olN0UXjXRUYK4h+HYPJjkqK3VWFyRiCIGgvtl1jgo2nWRlre9zLa9aNcM8JAWw2t-b+KTeY9MAE1DABXCM-xoeOJ10MDpeK8mEHpFxbwGTtEiQlZ2OCHlQidawfi8YPQj6KOzZjuPPUT06oBTtOwIYqlvuPXP8-YsyvA5Ev2LQtWb08FYoicSw-jMBvzusWOE6TgMO-TqQVJ7933P71tB6LkeOzH-SEIWquRhCsZ1hSWxF6b1e243pyXJmvu84Pwvh+hk+y7PhIwk2rsS8KsZC99jYemjm+FeLc17t1TpvYIb9e6sX3gXIexc-7lycNeZIw9hjliBJYB+b4ADuKBngBkYDOcgC4AiTlwG9A0Mo5QKnJJbZghAKgMG4Pwfg8pOBu2LKxBa4RnCqwNm4cUDZMI4NFAMGI9hyy3jiBAg611G6HTAJ6MAzC-zSnjnAFh-N+qcEOIQfgeVZTykVMQcgOUCBCMzu-URlgxjGTCNDTWC0Yjl2vo1JC5oELBXMKQu6Oi9Ft0McYl4rDbEcMENwuxqVhY8OEW5OaXFIQyHrE+AiC1q7lzWgFEGfxgltQXpAnmWi4xvQnGAeBMSjpxMupopMqZrD1MaV+ZpBpnoTleh9DJJVEBA0CSkHs5gFhAmKZ2eYMirBzzLAjapmil7dKaUYlpeg0ZThnHOBcmhlxkS6Q0pSfSXgDKGcTFBu8smYRyXkhE8RgkeGKYZAuM8Yi5M+JHNZpsl5+lgFjAIBjtksLRJiMxvB8DpROCM7OoMbw7SaphXi0Ry55zmK4BsrgFhDBiOE986gQX0PBbE3ZNj2FOzEEQQWKo1SIuPMi-2aLOQrExWfEUNg-b3mhmFew6jubrI9MC0FFKdnpyhViEoTBWCC2pXYxgxx+DxXoMyj2wUBh4WSJIrCtUzDlxnuEaZa1zBbTnsS8V5KAyXN2eYvKGJUoSH6owBVxAlXkk1e5cwQlPilwNvWa+5c-hzD4p4HaFh3AG2JbAeOUUfyaDbrgXQsAyGTmjLGU2HS7oJqTam9Nk5rlEx9Vk50G0ZkhQWEohadUz7snCKi+wApOTBTjfmrQKa00ZonHsjGhzsanPjYmrQhbe0luGS41B7kERe1mNaDsrg4iNmmGFPybZHn2E7GWKpGjAUx10IOKA9r05tJzbdZeR7T2TtuTvERvrHnzGeQUt58i5iPlCH5NwyRiVgCPZKlh6MDlY2OTjf9EAb2EynXch9Dy1rPrNC8wpIxy7sXKh2GRhklkmDjQACxUGQ5OiDmBwHjp6TQOR8gCyFkNEgrqLjEBoKQK4ZbfrsjmCsf44wkKDzQysCIyzPaYTwrhgF0C4y+jjroN6xHO7npup0qTKAZNgA3retjYIuTfBnmsBCO0dZoXxZ4z4j4dYOGJcpmTcn07Acxkck5q4rMfXU9Bu9hYZ1zUbdeKRnZASFJWiEJqQDKnLTrv8KSKJ+AqDQPOGSEAqN9UFqkujI1uHiymtO+5PQ-hGW8oFhAtYBN4TWisTCZkV2RUaa9M62ws1XQvZ03RKAExgAJoM0tWW4PvFFOVAN3h1oIVhOMK0O1ITRG2tEfiIo90iq9NVlGdW7ODrA6c5rrX2s3M0wgX+N5bwDfYohEb+kR5fGGNWHCMbPhSTs4pUCXCaDMAKLRkWuQRqsFwJQbb8R3ADAhlhA2nhgqrsQM4IyedViAlhOdoE1kZJkX9G17Yd26Jdcyb9AUisDbCiQgJfS1NhLOiu4MBCRt902QR1dJ6jl6KwfRwyQhVcxhho1rlxqfwA7KO8MKk2FPyJI4wCjsC28PPZYZH5IyHLPgFfhDaAGfywodjwtWWbvP4f8+p0pV+976c7fYgMYKMuEIbR+BU-JsRCIAr54jzXoEpDIJ16M+aAaIiq3FGZSy-x3knerBhNay0UKGVGOkN0ugVAfngK0FEjvs70jbVXOGC1ARDbkb5bwdhFg8tWFWWqJCAUDj-JuUcEYUAx77iKVsuFkhFfiF+jWG7DJlkFbeWqec4ekXIoXqioYUdl7cfEeYCxzCG9ybEPw+k3DhAh7EAOBKnCdW6n39y3HTQgx+f8LCfkeRmSMmHNawpnAla5ibPGi2MBL687CD9kOCsNhsF4J8xvDtsnCRfno9JucJ9vEnw7dYNYpGZDalwjdz-WblbhszfwZy8C-zvGTzKxBxPHGE43anvGdGSB2mJQoSoSgBoQnDoRQAYQnCYTgyzj7hdwmysHElxVvHkXKidFGFUUNgi3E1qVxkiX0TtQhUyVINETvABhFHQmiFGEGGNU8ABkdDzlKxGB5ygVYM2WiS4I0h4N9SsCMlyRqmWB-UMnHzXU5DO3WFCBiCrDiBnmtVJQlU4MpVmmULmnZh02GywingsHrTXQGwiGFFFGx07Dag7VHWTT-HHUnEgOdywkQ3cU0OVlWCxWrAiDzhCmBGlxfBYKXgg0A24NcRUNCPUPCINkiJ0JCDwi+D9nrC8BGGD2SI9FgAIyI3XhIzIwo2CL8g4k7HGCSHEngnyLYnYkhGdFvHsCfGGCSP3Qk2sGcwgNF26zBAmHmDv3Mi4mwn-jXVLkE1iCBhiHMFV1kKXmnHjiPUYF-CqMgGCOWjsEByEIRBhARBcJCDH0ahGB+HcD4jGHGEi22Gi1i10S-AgGCKBHG1PBny8ABEWObE7GvFqnNARD+BSDMk2LfHWzPzAEaI5HESGFCCV05hnitHcVbDK08HWCfGWh1iq0XHxmR1okaLd2Ml8WrGCheStGFA2mcH+DCkSHWHhBu32QnF7wmN13iB1jsG8B33ChCWBN6FFA2nWJ2lqhnmx3b1sgFzAG5NJkmN6FcFtHNFKwrxClmX0gEPENJxbHtCJJDyAA */
    id: "game",
    types: {} as {
      context: GameMachineContext;
      events: GameMachineEvent;
      input: GameMachineInput;
    },
    context: ({ input }) => ({
      supabase: input.supabase,
      gameIdOrCode: input.code,
      currentUser: input.user,
      game: null,
      currentQuestion: null,
      currentQuestionAnswers: [],
      currentQuestionWinner: null,
      error: null,
      isLoading: false,
      isLoadingInitial: true,
      selectedLanguage: "javascript",
      selectedDifficulty: "medium",
      questionStartTime: null,
      isHost: false,
      currentPlayerForTurn: undefined,
      isCurrentUserPlayerForTurn: false,
      isRoundComplete: false,
    }),
    initial: "loadingInitialData",
    on: {
      GAME_UPDATED_FROM_SUBSCRIPTION: {
        actions: "updateGameDataAndDerivedContext",
        target: ".#game.determineGameState",
      },
      PLAYERS_UPDATED_FROM_SUBSCRIPTION: {
        actions: "updatePlayersDataAndDerivedContext",
        target: ".#game.determineGameState",
      },
      GAME_DELETED_EXTERNALLY: {
        target: "#game.errorState",
        actions: assign({ error: "La partita è stata eliminata." }),
      },
      ANSWERS_UPDATED_FROM_SUBSCRIPTION: {
        actions: assign({
          currentQuestionAnswers: ({ event, context }) => {
            if (
              event.type === "ANSWERS_UPDATED_FROM_SUBSCRIPTION" &&
              context.currentQuestion
            ) {
              if (
                event.answers.length > 0 &&
                event.answers[0].question_id === context.currentQuestion.id
              ) {
                return event.answers;
              } else if (
                event.answers.length === 0 &&
                context.currentQuestion
              ) {
                // If an empty list of answers is received, and we assume it's for the current question
                // (e.g. all answers deleted for this question), clear local answers.
                // This relies on the subscription logic being specific or the event carrying a questionId.
                // For now, if answers are empty, assume they are for the current question and clear.
                return [];
              }
            }
            return context.currentQuestionAnswers;
          },
        }),
      },
      QUESTION_ENDED_EXTERNALLY: {
        actions: assign({
          currentQuestion: ({ event, context }) => {
            if (
              event.type === "QUESTION_ENDED_EXTERNALLY" &&
              context.currentQuestion &&
              context.currentQuestion.id === event.updatedQuestion.id
            ) {
              return event.updatedQuestion;
            }
            return context.currentQuestion;
          },
          currentQuestionWinner: ({ event, context }) => {
            if (event.type === "QUESTION_ENDED_EXTERNALLY" && event.winner)
              return event.winner;
            return context.currentQuestionWinner;
          },
        }),
        target: ".#game.inGame.showingTurnResult",
        guard: "isQuestionActiveGuard",
      },
    },
    states: {
      loadingInitialData: {
        entry: assign({ isLoadingInitial: true, error: null }),
        invoke: {
          id: "loadInitialGameData",
          src: "loadInitialGameData",
          input: ({ context }) => ({
            supabase: context.supabase,
            code: context.gameIdOrCode,
            userId: context.currentUser.id,
          }),
          onDone: {
            target: "determiningInitialState",
            actions: assign({
              game: ({ event }) => event.output.game,
              isHost: ({ event }) => event.output.isHost,
              isLoadingInitial: false,
            }),
          },
          onError: {
            target: "errorState",
            actions: assign({
              error: ({ event }) =>
                (event.error as Error)?.message ||
                "Impossibile caricare i dati della partita.",
              isLoadingInitial: false,
            }),
          },
        },
      },
      determiningInitialState: {
        entry: "updateDerivedContext",
        always: [
          { target: "lobby", guard: "isGameStatusWaitingGuard" },
          { target: "inGame", guard: "isGameStatusActiveGuard" },
          { target: "gameCompleted", guard: "isGameStatusCompletedGuard" },
          {
            target: "errorState",
            actions: assign({
              error: "Stato della partita non valido dopo il caricamento.",
            }),
          },
        ],
      },
      lobby: {
        entry: "updateDerivedContext",
        on: {
          HOST_INITIATE_START_GAME: {
            target: "startingGame",
            guard: "isUserHostAndMinPlayersJoinedGuard",
          },
          PLAYER_INITIATE_LEAVE_GAME: "leavingGame",
        },
      },
      startingGame: {
        entry: assign({ isLoading: true, error: null }),
        invoke: {
          id: "startGameService",
          src: "startGameService",
          input: ({ context }) => ({
            supabase: context.supabase,
            gameId: context.game!.id,
          }),
          onDone: {
            actions: assign({
              game: ({ event }) => event.output.updatedGame,
              isLoading: false,
            }),
            target: "inGame",
          },
          onError: {
            target: "lobby",
            actions: assign({
              error: ({ event }) =>
                (event.error as Error)?.message ||
                "Impossibile avviare la partita.",
              isLoading: false,
            }),
          },
        },
      },
      inGame: {
        entry: ["updateDerivedContext", "clearQuestionStateAction"],
        initial: "evaluatingTurn",
        states: {
          evaluatingTurn: {
            entry: [
              "clearQuestionStateAction",
              "updateDerivedContext",
              log(
                ({ context }) => `Evaluating turn for game ${context.game?.id}`
              ),
            ],
            always: [
              { target: "roundFinished", guard: "isRoundCompleteGuard" },
              {
                target: "selectingQuestion",
                guard: "isCurrentUserPlayerForTurnAndNoQuestionGuard",
              },
              {
                target: "displayingQuestion",
                guard: "isQuestionActiveAndNotEndedGuard",
              },
              {
                target: "showingTurnResult",
                guard: "isQuestionEndedButNotRoundCompleteGuard",
              },
              { target: "waitingForPlayerAction" },
            ],
          },
          waitingForPlayerAction: {
            entry: log("Waiting for another player to act or for my turn."),
            on: {
              QUESTION_CREATED_SUCCESS: {
                target: "displayingQuestion",
                actions: "updateCurrentQuestionAndGame",
              },
            },
          },
          selectingQuestion: {
            entry: [
              "clearQuestionStateAction",
              log("Player is selecting question"),
            ],
            on: {
              PLAYER_SELECT_QUESTION_PARAMS: {
                actions: assign({
                  selectedLanguage: ({ event }) => event.language,
                  selectedDifficulty: ({ event }) => event.difficulty,
                }),
              },
              QUESTION_CREATION_INITIATED: "creatingQuestion",
            },
          },
          creatingQuestion: {
            entry: assign({ isLoading: true, error: null }),
            invoke: {
              id: "createQuestionService",
              src: "createQuestionService",
              input: ({ context }) => ({
                supabase: context.supabase,
                gameId: context.game!.id,
                userId: context.currentUser.id,
                language: context.selectedLanguage,
                difficulty: context.selectedDifficulty,
                currentStatus: context.game!.status,
              }),
              onDone: {
                target: "displayingQuestion",
                actions: assign({
                  currentQuestion: ({ event }) => event.output.question,
                  game: ({ event, context }) =>
                    event.output.updatedGame || context.game,
                  isLoading: false,
                  error: null,
                  questionStartTime: () => Date.now(),
                }),
              },
              onError: {
                target: "selectingQuestion",
                actions: assign({
                  error: ({ event }) =>
                    (event.error as Error)?.message ||
                    "Impossibile creare la domanda.",
                  isLoading: false,
                }),
              },
            },
          },
          displayingQuestion: {
            entry: [
              "loadAnswersForCurrentQuestion",
              "startQuestionTimerIfApplicable",
              log(
                ({ context }) =>
                  `Displaying question: ${context.currentQuestion?.id}`
              ),
            ],
            on: {
              ANSWER_SUBMITTED: "submittingAnswer",
              QUESTION_TIMER_ENDED: "endingQuestion",
              ANSWERS_FOR_QUESTION_FETCHED: {
                actions: assign({
                  currentQuestionAnswers: ({ event }) => event.answers,
                }),
              },
              SET_WINNER_FOR_QUESTION: {
                actions: assign({
                  currentQuestionWinner: ({ event }) => event.winner,
                  currentQuestion: ({ event }) => event.updatedQuestion,
                }),
                target: "showingTurnResult",
              },
            },
            exit: ["clearQuestionTimer"],
          },
          submittingAnswer: {
            entry: assign({ isLoading: true, error: null }),
            invoke: {
              id: "submitAnswerService",
              src: "submitAnswerService",
              input: ({ context, event }) => {
                if (event.type !== "ANSWER_SUBMITTED")
                  throw new Error("Invalid event for submitAnswerService");
                if (
                  !context.currentQuestion ||
                  !context.game ||
                  !context.questionStartTime
                ) {
                  throw new Error("Missing context for submitting answer");
                }
                return {
                  supabase: context.supabase, // Will be used by actor for getQuestionById
                  questionId: context.currentQuestion.id,
                  playerId: context.currentUser.id,
                  gameId: context.game.id,
                  selectedOption: event.selectedOption,
                  timeLimitMs: context.game.time_limit * 1000,
                  questionStartTime: context.questionStartTime,
                };
              },
              onDone: {
                actions: [
                  assign({ isLoading: false }),
                  async ({ context, event: doneEvent, self }) => {
                    if (context.currentQuestion?.id) {
                      const freshAnswers =
                        await getAnswersWithPlayerForQuestion(
                          context.currentQuestion.id
                        );
                      if (freshAnswers) {
                        self.send({
                          type: "ANSWERS_FOR_QUESTION_FETCHED",
                          answers: freshAnswers,
                        });
                      }
                    }

                    if (
                      doneEvent.output.winner &&
                      doneEvent.output.updatedQuestion
                    ) {
                      self.send({
                        type: "SET_WINNER_FOR_QUESTION",
                        winner: doneEvent.output.winner,
                        updatedQuestion: doneEvent.output.updatedQuestion,
                      });
                    }
                  },
                ],
              },
              onError: {
                target: "displayingQuestion",
                actions: assign({
                  error: ({ event }) =>
                    (event.error as Error)?.message ||
                    "Impossibile inviare la risposta.",
                  isLoading: false,
                }),
              },
            },
          },
          endingQuestion: {
            entry: assign({ isLoading: true }),
            invoke: {
              id: "endQuestionService",
              src: "endQuestionService",
              input: ({ context }) => ({
                supabase: context.supabase,
                questionId: context.currentQuestion!.id,
              }), // supabase for getQuestionById
              onDone: {
                target: "showingTurnResult",
                actions: assign({
                  currentQuestion: ({ event }) => event.output.updatedQuestion,
                  currentQuestionAnswers: ({ event }) => event.output.answers,
                  isLoading: false,
                }),
              },
              onError: {
                target: "showingTurnResult",
                actions: assign({
                  error: "Errore nel terminare la domanda.",
                  isLoading: false,
                }),
              },
            },
          },
          showingTurnResult: {
            entry: log("Showing turn result"),
            on: {
              PLAYER_INITIATE_NEXT_TURN: "advancingTurn",
            },
          },
          advancingTurn: {
            entry: assign({ isLoading: true, error: null }),
            invoke: {
              id: "advanceTurnService",
              src: "advanceTurnService",
              input: ({ context }) => ({
                supabase: context.supabase, // For the direct DB call
                game: context.game!,
              }),
              onDone: {
                actions: assign({
                  game: ({ event }) => event.output.updatedGame,
                  isLoading: false,
                }),
                target: "evaluatingTurn",
              },
              onError: {
                target: "showingTurnResult",
                actions: assign({
                  error: ({ event }) =>
                    (event.error as Error)?.message ||
                    "Impossibile avanzare al turno successivo.",
                  isLoading: false,
                }),
              },
            },
          },
          roundFinished: {
            type: "final",
            entry: log("Game has ended, all rounds finished."),
          },
        },
        on: {
          PLAYER_INITIATE_LEAVE_GAME: "#game.leavingGame",
          GAME_COMPLETED_CONDITION_MET: {
            target: "#game.gameCompleted",
            actions: "updateGameDataAndDerivedContext",
          },
        },
      },
      gameCompleted: {
        entry: ["updateDerivedContext", log("Game has completed!")],
        type: "final",
        on: {
          PLAYER_INITIATE_LEAVE_GAME: "#game.leavingGame",
        },
      },
      leavingGame: {
        entry: assign({ isLoading: true, error: null }),
        invoke: {
          id: "leaveGameService",
          src: "leaveGameService",
          input: ({ context }) => ({
            gameId: context.game!.id,
            userId: context.currentUser.id,
            isHost: context.isHost,
          }),
          onDone: {
            target: "leftGameState",
            actions: assign({ isLoading: false }),
          },
          onError: {
            target: "errorState",
            actions: assign({
              error: ({ event }) =>
                (event.error as Error)?.message ||
                "Impossibile lasciare la partita.",
              isLoading: false,
            }),
          },
        },
      },
      leftGameState: {
        type: "final",
        entry: log("Player has left the game."),
      },
      errorState: {
        entry: log(({ context }) => `Error: ${context.error}`),
        on: {
          RETRY_INITIAL_LOAD: "loadingInitialData",
        },
      },
      determineGameState: {
        entry: "updateDerivedContext",
        always: [
          { target: "lobby", guard: "isGameStatusWaitingGuard" },
          {
            target: "inGame.evaluatingTurn",
            guard: "isGameStatusActiveAndNotInGameAlreadyGuard",
          },
          { target: "inGame", guard: "isGameStatusActiveGuard" },
          { target: "gameCompleted", guard: "isGameStatusCompletedGuard" },
          {
            target: "errorState",
            actions: assign({
              error: "Stato della partita non determinato dopo aggiornamento.",
            }),
          },
        ],
      },
    },
  },
  {
    actions: {
      clearQuestionStateAction: assign({
        currentQuestion: null,
        currentQuestionAnswers: [],
        currentQuestionWinner: null,
        questionStartTime: null,
        error: null,
      }),
      updateGameDataAndDerivedContext: assign(({ context, event }) => {
        let game = context.game;
        if (
          event.type === "GAME_UPDATED_FROM_SUBSCRIPTION" ||
          event.type === "GAME_COMPLETED_CONDITION_MET"
        ) {
          game = event.game;
        }
        if (!game) return {};
        const currentPlayerForTurn = game.players.find(
          (p) => p.turn_order === game!.current_turn
        );
        return {
          game: game,
          isHost: game.host_id === context.currentUser.id,
          currentPlayerForTurn: currentPlayerForTurn,
          isCurrentUserPlayerForTurn:
            currentPlayerForTurn?.player_id === context.currentUser.id,
          isRoundComplete: game.status === "completed",
        };
      }),
      updatePlayersDataAndDerivedContext: assign(({ context, event }) => {
        let game = context.game;
        if (
          event.type === "PLAYERS_UPDATED_FROM_SUBSCRIPTION" &&
          context.game
        ) {
          game = { ...context.game, players: event.players };
        }
        if (!game) return {};
        const currentPlayerForTurn = game.players.find(
          (p) => p.turn_order === game!.current_turn
        );
        return {
          game: game,
          isHost: game.host_id === context.currentUser.id,
          currentPlayerForTurn: currentPlayerForTurn,
          isCurrentUserPlayerForTurn:
            currentPlayerForTurn?.player_id === context.currentUser.id,
          isRoundComplete: game.status === "completed",
        };
      }),
      updateCurrentQuestionAndGame: assign({
        currentQuestion: ({ event, context }) => {
          if (event.type === "QUESTION_CREATED_SUCCESS") return event.question;
          return context.currentQuestion;
        },
        game: ({ event, context }) => {
          if (event.type === "QUESTION_CREATED_SUCCESS" && event.game)
            return event.game;
          return context.game;
        },
        questionStartTime: ({ event, context }) => {
          if (event.type === "QUESTION_CREATED_SUCCESS") return Date.now();
          return context.questionStartTime;
        },
      }),
      updateDerivedContext: assign(({ context }) => {
        if (!context.game) return {};
        const currentPlayerForTurn = context.game.players.find(
          (p: Player & { profile: Profile }) =>
            p.turn_order === context.game!.current_turn
        );
        return {
          isHost: context.game.host_id === context.currentUser.id,
          currentPlayerForTurn: currentPlayerForTurn,
          isCurrentUserPlayerForTurn:
            currentPlayerForTurn?.player_id === context.currentUser.id,
          isRoundComplete: context.game.status === "completed",
        };
      }),
      loadAnswersForCurrentQuestion: fromPromise(async ({ context, self }) => {
        if (context.currentQuestion && context.currentQuestion.id) {
          try {
            const answers = await getAnswersWithPlayerForQuestion(
              context.currentQuestion.id
            );
            if (answers) {
              self.send({ type: "ANSWERS_FOR_QUESTION_FETCHED", answers });
            }
          } catch (err) {
            console.error("Failed to load answers:", err);
            // Optionally send an error event to the machine
          }
        }
      }),
      startQuestionTimerIfApplicable: () => {
        /* TODO: Implement with XState delays or external timer */
      },
      clearQuestionTimer: () => {
        /* TODO: Clear any active timers */
      },
    },
    actors: {
      loadInitialGameData: fromPromise(
        async ({
          input,
        }: {
          input: {
            supabase: SupabaseClient<Database>;
            code: string;
            userId: string;
          };
        }) => {
          const { data: game, error } = await input.supabase
            .from("games")
            .select(
              "*, host:profiles!host_id(*), players:game_players!game_id(*, profile:profiles!player_id(*))"
            )
            .eq("code", input.code.toUpperCase())
            .single();

          if (error) throw new Error(error.message);
          if (!game) throw new Error("Partita non trovata.");
          return {
            game: game as GameWithPlayers,
            isHost: game.host_id === input.userId,
          };
        }
      ),
      startGameService: fromPromise(
        async ({
          input,
        }: {
          input: { supabase: SupabaseClient<Database>; gameId: string };
        }) => {
          const { error: updateError } = await updateGameStatus(
            input.gameId,
            "active"
          );
          if (updateError) throw new Error(updateError.message);

          const { data: gameData, error: fetchError } = await input.supabase
            .from("games")
            .select(
              "*, host:profiles!host_id(*), players:game_players!game_id(*, profile:profiles!player_id(*))"
            )
            .eq("id", input.gameId)
            .single();
          if (fetchError) throw new Error(fetchError.message);
          if (!gameData)
            throw new Error(
              "Impossibile avviare la partita (dati non trovati dopo l'aggiornamento)."
            );
          return { updatedGame: gameData as GameWithPlayers };
        }
      ),
      createQuestionService: fromPromise(
        async ({
          input,
        }: {
          input: {
            supabase: SupabaseClient<Database>;
            gameId: string;
            userId: string;
            language: string;
            difficulty: string;
            currentStatus: string;
          };
        }) => {
          // TODO: Replace with actual AI call for question generation
          const tempQuestionText = `Domanda di ${input.language} (${input.difficulty})`;
          const tempOptions = [
            { text: "Opzione A" },
            { text: "Opzione B" },
            { text: "Opzione C" },
            { text: "Opzione D" },
          ];
          const tempCorrectAnswer = 0;

          const questionPayload = {
            game_id: input.gameId,
            created_by_player_id: input.userId,
            language: input.language,
            difficulty: input.difficulty,
            question_text: tempQuestionText,
            options: tempOptions,
            correct_answer: tempCorrectAnswer,
            explanation: "Spiegazione placeholder",
            points: 100,
          };
          const question = await dbCreateQuestion(
            questionPayload as Partial<Question>
          ); // dbCreateQuestion is insertQuestion

          let updatedGame: GameWithPlayers | undefined = undefined;
          if (input.currentStatus === "waiting") {
            const { error: gameStatusError } = await updateGameStatus(
              input.gameId,
              "active"
            );
            if (gameStatusError)
              console.error(
                "Failed to update game status to active:",
                gameStatusError.message
              );
            else {
              const { data: gameData, error: fetchError } = await input.supabase
                .from("games")
                .select(
                  "*, host:profiles!host_id(*), players:game_players!game_id(*, profile:profiles!player_id(*))"
                )
                .eq("id", input.gameId)
                .single();
              if (fetchError)
                console.error(
                  "Failed to refetch game after status update:",
                  fetchError.message
                );
              else updatedGame = gameData as GameWithPlayers;
            }
          }
          return { question: question as Question, updatedGame };
        }
      ),
      submitAnswerService: fromPromise(
        async ({
          input,
        }: {
          input: {
            supabase: SupabaseClient<Database>;
            questionId: string;
            playerId: string;
            gameId: string;
            selectedOption: number;
            timeLimitMs: number;
            questionStartTime: number;
          };
        }) => {
          const responseTimeMs = Date.now() - input.questionStartTime;

          const { data: answerSubmissionResultData, error: submissionError } =
            await dbSubmitAnswer({
              // dbSubmitAnswer is submitAnswer
              question_id: input.questionId,
              player_id: input.playerId,
              game_id: input.gameId,
              selected_option: input.selectedOption,
              response_time_ms: responseTimeMs,
              time_limit_ms: input.timeLimitMs,
            });

          if (submissionError) throw new Error(submissionError.message);
          // Assuming answerSubmissionResultData is the array from the RPC call, as per dbSubmitAnswer's current structure
          if (
            !answerSubmissionResultData ||
            (answerSubmissionResultData as any[]).length === 0
          )
            throw new Error("Risposta non registrata correttamente.");

          const submittedAnswerDetails = (
            answerSubmissionResultData as any[]
          )[0]; // Cast based on expected RPC output

          let winnerPayload:
            | GameMachineContext["currentQuestionWinner"]
            | undefined = undefined;
          let endedQuestionPayload: Question | undefined = undefined;

          if (submittedAnswerDetails.was_winning_answer) {
            winnerPayload = {
              playerId: submittedAnswerDetails.player_id,
              user_name: submittedAnswerDetails.player_user_name,
              score: submittedAnswerDetails.score_earned,
            };
            const updateSuccess = await dbUpdateQuestion(input.questionId, {
              ended_at: new Date().toISOString(),
            });
            if (updateSuccess) {
              endedQuestionPayload = await getQuestionById(input.questionId);
            } else {
              console.error(
                "Failed to update question ended_at via dbUpdateQuestion"
              );
            }
          }
          // newAnswerData was in previous version, let's return submittedAnswerDetails for potential use
          return {
            winner: winnerPayload,
            updatedQuestion: endedQuestionPayload,
            newAnswerData: submittedAnswerDetails,
          };
        }
      ),
      advanceTurnService: fromPromise(
        async ({
          input,
        }: {
          input: { supabase: SupabaseClient<Database>; game: GameWithPlayers };
        }) => {
          const currentTurn = input.game.current_turn;
          const playerCount = input.game.players.length;
          let nextTurn = currentTurn + 1;

          let gameStatusToUpdate: GameWithPlayers["status"] | null = null;
          const { data: questionsData, error: questionsError } =
            await input.supabase
              .from("questions")
              .select("created_by_player_id")
              .eq("game_id", input.game.id);
          if (questionsError) {
            console.error(
              "Error fetching questions for turn advancement:",
              questionsError.message
            );
          }
          const uniqueQuestionCreators = new Set(
            questionsData?.map((q) => q.created_by_player_id)
          );

          if (nextTurn >= playerCount) {
            nextTurn = 0;
            if (
              uniqueQuestionCreators.size >= playerCount &&
              input.game.status !== "completed"
            ) {
              gameStatusToUpdate = "completed";
            }
          }

          const { data: updatedGameData, error: gameUpdateError } =
            await input.supabase
              .from("games")
              .update({
                current_turn: nextTurn,
                status: gameStatusToUpdate || input.game.status,
              })
              .eq("id", input.game.id)
              .select(
                "*, host:profiles!host_id(*), players:game_players!game_id(*, profile:profiles!player_id(*))"
              )
              .single();

          if (gameUpdateError) throw new Error(gameUpdateError.message);
          if (!updatedGameData)
            throw new Error("Impossibile aggiornare il turno (no data).");

          return { updatedGame: updatedGameData as GameWithPlayers };
        }
      ),
      leaveGameService: fromPromise(
        async ({
          input,
        }: {
          input: { gameId: string; userId: string; isHost: boolean };
        }) => {
          if (input.isHost) {
            const { error } = await updateGameStatus(input.gameId, "completed");
            if (error) throw new Error(error.message);
          } else {
            const { error } = await removePlayerFromGame(
              input.gameId,
              input.userId
            ); // Assumes removePlayerFromGame(gameId, userId)
            if (error) throw new Error(error.message);
          }
          return { success: true };
        }
      ),
      endQuestionService: fromPromise(
        async ({
          input,
        }: {
          input: { supabase: SupabaseClient<Database>; questionId: string };
        }) => {
          // supabase needed for getQuestionById
          const updateSuccess = await dbUpdateQuestion(input.questionId, {
            ended_at: new Date().toISOString(),
          });
          if (!updateSuccess)
            throw new Error("Failed to end question via dbUpdateQuestion.");

          const updatedQuestion = await getQuestionById(input.questionId);
          if (!updatedQuestion)
            throw new Error("Question not found after update for ending.");

          const allAnswers = await getAnswersWithPlayerForQuestion(
            input.questionId
          );

          return {
            updatedQuestion: updatedQuestion as Question,
            answers: allAnswers || [],
          };
        }
      ),
    },
    guards: {
      isGameStatusWaitingGuard: ({ context }) =>
        context.game?.status === "waiting",
      isGameStatusActiveGuard: ({ context }) =>
        context.game?.status === "active",
      isGameStatusCompletedGuard: ({ context }) =>
        context.game?.status === "completed",
      isUserHostAndMinPlayersJoinedGuard: ({ context }) => {
        if (!context.game || context.game.host_id !== context.currentUser.id)
          return false;
        // Assuming min_players is 1 as per previous logic, can be adjusted if game has min_players prop
        return (
          context.game.players.length >= 1 &&
          context.game.players.length <= context.game.max_players
        );
      },
      isCurrentUserPlayerForTurnAndNoQuestionGuard: ({ context }) => {
        if (
          !context.game ||
          context.game.status !== "active" ||
          context.currentQuestion
        )
          return false;
        return context.isCurrentUserPlayerForTurn;
      },
      isQuestionActiveAndNotEndedGuard: ({ context }) =>
        !!context.currentQuestion && !context.currentQuestion.ended_at,
      isQuestionEndedButNotRoundCompleteGuard: ({ context }) =>
        !!context.currentQuestion &&
        !!context.currentQuestion.ended_at &&
        context.game?.status !== "completed",
      isRoundCompleteGuard: ({ context }) =>
        context.game?.status === "completed",
      isGameStatusActiveAndNotInGameAlreadyGuard: ({ context, self }) => {
        const snapshot = self.getSnapshot();
        // Check if the current state value is exactly 'inGame', not a substate like 'inGame.evaluatingTurn'
        // This guard might need refinement based on exact state structure and desired behavior.
        // A simpler check might be to ensure we are not already in a substate of 'inGame'.
        return context.game?.status === "active" && !snapshot.matches("inGame"); // Or specific substate
      },
      isQuestionActiveGuard: ({ context }) =>
        !!context.currentQuestion && !context.currentQuestion.ended_at,
    },
  }
);

// Type assertion for Player in find method callback
type PlayerWithProfile = Player & { profile: Profile };
