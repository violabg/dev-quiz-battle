"use client";

import { CurrentTurnCard } from "@/components/game/current-turn-card";
import { QuestionDisplay } from "@/components/game/question-display";
import { QuestionSelection } from "@/components/game/question-selection";
import { TurnResultCard } from "@/components/game/turn-result-card";
import { Button } from "@/components/ui/button";
import { useGameMachineActorRef } from "@/lib/context/GameMachineProvider";
import {
  useAllAnswers,
  useCurrentPlayer,
  useCurrentPlayerUsername,
  useCurrentQuestion,
  useGameData,
  useIsCreatingQuestion,
  useIsCurrentPlayersTurn,
  useIsGameCompleted,
  useIsLoadingCreateQuestion,
  useIsNextPlayersTurn,
  useIsQuestionActive,
  useIsRoundComplete,
  useIsSelectingQuestion,
  useIsShowingResults,
  useQuestionStartTime,
  useSelectedDifficulty,
  useSelectedLanguage,
  useShowNextTurn,
  useUser,
  useWinner,
} from "@/lib/hooks/useGameSelectors";
import type { GameDifficulty, GameLanguage } from "@/types/supabase";
import Scoreboard from "./game-scoreboard";

interface GameRoomProps {
  onLeaveGame: () => void;
}

export function GameRoom({ onLeaveGame }: GameRoomProps) {
  const actorRef = useGameMachineActorRef();

  // Selectors
  const game = useGameData(actorRef);
  const user = useUser(actorRef);
  const currentQuestion = useCurrentQuestion(actorRef);
  const allAnswers = useAllAnswers(actorRef);
  const currentPlayer = useCurrentPlayer(actorRef);
  const isCurrentPlayersTurn = useIsCurrentPlayersTurn(actorRef);
  const isNextPlayersTurn = useIsNextPlayersTurn(actorRef);
  const isSelectingQuestion = useIsSelectingQuestion(actorRef);
  const isCreatingQuestion = useIsCreatingQuestion(actorRef);
  const isQuestionActive = useIsQuestionActive(actorRef);
  const isShowingResults = useIsShowingResults(actorRef);
  const isGameCompleted = useIsGameCompleted(actorRef);
  const winner = useWinner(actorRef);
  const isLoadingCreateQuestion = useIsLoadingCreateQuestion(actorRef);
  const selectedLanguage = useSelectedLanguage(actorRef);
  const selectedDifficulty = useSelectedDifficulty(actorRef);
  const showNextTurn = useShowNextTurn(actorRef);
  const questionStartTime = useQuestionStartTime(actorRef);
  const isRoundComplete = useIsRoundComplete(actorRef);
  const currentPlayerUsername = useCurrentPlayerUsername(actorRef);

  // Event handlers
  const handleSelectLanguage = (language: GameLanguage) => {
    actorRef.send({ type: "SELECT_LANGUAGE", language });
  };

  const handleSelectDifficulty = (difficulty: GameDifficulty) => {
    actorRef.send({ type: "SELECT_DIFFICULTY", difficulty });
  };

  const handleCreateQuestion = () => {
    actorRef.send({ type: "CREATE_QUESTION" });
  };

  const handleSubmitAnswer = (selectedOption: number) => {
    const responseTimeMs = questionStartTime
      ? Date.now() - questionStartTime
      : 0;
    actorRef.send({
      type: "SUBMIT_ANSWER",
      selectedOption,
      responseTimeMs,
    });
  };

  const handleNextTurn = () => {
    actorRef.send({ type: "NEXT_TURN" });
  };

  const handleLeaveGame = () => {
    onLeaveGame();
  };

  // Helper to transform currentPlayer for CurrentTurnCard
  const currentPlayerForCard = currentPlayer
    ? {
        ...currentPlayer.profile,
        player_id: currentPlayer.player_id,
      }
    : null;

  if (!game || !user) return null;

  return (
    <div className="space-y-8">
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-bold text-3xl">
            <span className="text-gradient">DevQuizBattle</span>
          </h1>
          <p className="text-muted-foreground">Codice partita: {game.code}</p>
        </div>
        <Button variant="destructive" onClick={onLeaveGame}>
          Esci
        </Button>
      </div>

      <div className="gap-8 grid lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Question selection phase */}
          {isSelectingQuestion && (
            <QuestionSelection
              isCurrentPlayersTurn={isCurrentPlayersTurn}
              currentPlayerUsername={currentPlayerUsername}
              isLoading={isLoadingCreateQuestion}
              language={selectedLanguage}
              difficulty={selectedDifficulty}
              onSubmit={({ language, difficulty }) => {
                handleSelectLanguage(language);
                handleSelectDifficulty(difficulty);
                handleCreateQuestion();
              }}
            />
          )}

          {/* Creating question state */}
          {isCreatingQuestion && (
            <div className="text-center">
              <p className="text-lg">Generazione domanda in corso...</p>
            </div>
          )}

          {/* Active question state */}
          {isQuestionActive && currentQuestion && (
            <QuestionDisplay
              question={currentQuestion}
              onSubmitAnswer={handleSubmitAnswer}
              winner={winner}
              allAnswers={allAnswers}
              timeIsUp={false}
              timeLimit={game.time_limit}
              user={user}
            />
          )}

          {/* Results state */}
          {isShowingResults && currentQuestion && (
            <>
              <QuestionDisplay
                question={currentQuestion}
                onSubmitAnswer={handleSubmitAnswer}
                winner={winner}
                allAnswers={allAnswers}
                timeIsUp={true}
                timeLimit={game.time_limit}
                user={user}
              />
              <TurnResultCard
                winner={winner}
                showNextTurn={showNextTurn}
                isNextPlayersTurn={isNextPlayersTurn}
                isRoundComplete={isRoundComplete}
                handleNextTurn={handleNextTurn}
              />
            </>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Scoreboard
            game={game}
            isRoundComplete={isRoundComplete}
            onLeaveGame={handleLeaveGame}
          />

          {/* Turn result card in sidebar when showing results or when question ended */}
          {!isShowingResults &&
            (winner ||
              (currentQuestion && currentQuestion.ended_at && !winner)) && (
              <TurnResultCard
                winner={winner}
                showNextTurn={showNextTurn}
                isNextPlayersTurn={isNextPlayersTurn}
                isRoundComplete={isRoundComplete}
                handleNextTurn={handleNextTurn}
              />
            )}

          {currentPlayerForCard && (
            <CurrentTurnCard
              currentPlayer={currentPlayerForCard}
              isCurrentPlayersTurn={isCurrentPlayersTurn}
            />
          )}
        </div>
      </div>
    </div>
  );
}
