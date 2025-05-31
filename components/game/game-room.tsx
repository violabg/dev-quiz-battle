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

  // Render game completed state
  if (isGameCompleted) {
    return (
      <div className="space-y-8">
        <Scoreboard
          game={game}
          isRoundComplete={isRoundComplete}
          onLeaveGame={handleLeaveGame}
        />
        <div className="flex flex-col items-center space-y-4">
          <h1 className="font-bold text-2xl">Partita terminata!</h1>
          <Button onClick={onLeaveGame}>Torna alla Dashboard</Button>
        </div>
      </div>
    );
  }

  // Render question selection phase
  if (isSelectingQuestion) {
    return (
      <div className="space-y-8">
        {currentPlayerForCard && (
          <CurrentTurnCard
            currentPlayer={currentPlayerForCard}
            isCurrentPlayersTurn={isCurrentPlayersTurn}
          />
        )}

        {isCurrentPlayersTurn && (
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

        <Scoreboard
          game={game}
          isRoundComplete={isRoundComplete}
          onLeaveGame={handleLeaveGame}
        />

        <div className="flex justify-center">
          <Button variant="outline" onClick={onLeaveGame}>
            Abbandona partita
          </Button>
        </div>
      </div>
    );
  }

  // Render creating question state
  if (isCreatingQuestion) {
    return (
      <div className="space-y-8">
        {currentPlayerForCard && (
          <CurrentTurnCard
            currentPlayer={currentPlayerForCard}
            isCurrentPlayersTurn={isCurrentPlayersTurn}
          />
        )}

        <div className="text-center">
          <p className="text-lg">Generazione domanda in corso...</p>
        </div>

        <Scoreboard
          game={game}
          isRoundComplete={isRoundComplete}
          onLeaveGame={handleLeaveGame}
        />

        <div className="flex justify-center">
          <Button variant="outline" onClick={onLeaveGame}>
            Abbandona partita
          </Button>
        </div>
      </div>
    );
  }

  // Render active question state
  if (isQuestionActive && currentQuestion) {
    return (
      <div className="space-y-8">
        {currentPlayerForCard && (
          <CurrentTurnCard
            currentPlayer={currentPlayerForCard}
            isCurrentPlayersTurn={isCurrentPlayersTurn}
          />
        )}

        <QuestionDisplay
          question={currentQuestion}
          onSubmitAnswer={handleSubmitAnswer}
          winner={winner}
          allAnswers={allAnswers}
          timeIsUp={false}
          timeLimit={game.time_limit}
          user={user}
        />

        <Scoreboard
          game={game}
          isRoundComplete={isRoundComplete}
          onLeaveGame={handleLeaveGame}
        />

        <div className="flex justify-center">
          <Button variant="outline" onClick={onLeaveGame}>
            Abbandona partita
          </Button>
        </div>
      </div>
    );
  }

  // Render results state
  if (isShowingResults && currentQuestion) {
    return (
      <div className="space-y-8">
        {currentPlayerForCard && (
          <CurrentTurnCard
            currentPlayer={currentPlayerForCard}
            isCurrentPlayersTurn={isCurrentPlayersTurn}
          />
        )}

        <TurnResultCard
          winner={winner}
          showNextTurn={showNextTurn}
          isNextPlayersTurn={isNextPlayersTurn}
          isRoundComplete={isRoundComplete}
          handleNextTurn={handleNextTurn}
        />

        <Scoreboard
          game={game}
          isRoundComplete={isRoundComplete}
          onLeaveGame={handleLeaveGame}
        />

        <div className="flex justify-center">
          <Button variant="outline" onClick={onLeaveGame}>
            Abbandona partita
          </Button>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="space-y-8">
      {currentPlayerForCard && (
        <CurrentTurnCard
          currentPlayer={currentPlayerForCard}
          isCurrentPlayersTurn={isCurrentPlayersTurn}
        />
      )}

      <Scoreboard
        game={game}
        isRoundComplete={isRoundComplete}
        onLeaveGame={handleLeaveGame}
      />

      <div className="flex justify-center">
        <Button variant="outline" onClick={onLeaveGame}>
          Abbandona partita
        </Button>
      </div>
    </div>
  );
}
