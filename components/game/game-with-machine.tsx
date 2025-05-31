/**
 * Example integration of XState game machine with existing components
 * This shows how to gradually replace the current hooks with the machine
 */

"use client";

import { GameLobby } from "@/components/game/game-lobby";
import { GameRoom } from "@/components/game/game-room";
import { useGameMachine } from "@/lib/hooks/useGameMachine";
import type { User } from "@supabase/supabase-js";

interface GameWithMachineProps {
  gameCode: string;
  user: User;
}

export function GameWithMachine({ gameCode, user }: GameWithMachineProps) {
  const {
    context,
    isLoading,
    isInLobby,
    isInActiveGame,
    isGameCompleted,
    hasError,
    hasLeft,
    startGame,
    leaveGame,
    clearError,
    retry,
  } = useGameMachine(gameCode, user);

  // Handle error states
  if (hasError) {
    return (
      <div className="flex flex-col justify-center items-center space-y-4 min-h-screen">
        <h2 className="font-bold text-red-600 text-2xl">Error</h2>
        <p className="text-gray-600">{context.error}</p>
        <div className="flex space-x-4">
          <button
            onClick={retry}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white"
          >
            Retry
          </button>
          <button
            onClick={clearError}
            className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded text-white"
          >
            Clear Error
          </button>
        </div>
      </div>
    );
  }

  // Handle loading states
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-500 rounded-full w-8 h-8 animate-spin"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  // Handle left state
  if (hasLeft) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="mb-4 font-bold text-2xl">You have left the game</h2>
          <p className="text-gray-600">
            You can close this tab or navigate back to the dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Handle completed state
  if (isGameCompleted) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="mb-4 font-bold text-2xl">Game Completed!</h2>
          <p className="mb-4 text-gray-600">
            Thank you for playing DevQuizBattle.
          </p>
          <button
            onClick={leaveGame}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Ensure we have game data
  if (!context.game) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">No game data available</p>
      </div>
    );
  }

  // Render lobby phase
  if (isInLobby) {
    return (
      <GameLobby
        game={context.game}
        isHost={context.isHost}
        onStartGame={startGame}
        onLeaveGame={leaveGame}
        loadingState="idle" // TODO: Map machine state to loading state
      />
    );
  }

  // Render active game phase
  if (isInActiveGame) {
    return <GameRoom game={context.game} user={user} onLeaveGame={leaveGame} />;
  }

  // Fallback
  return (
    <div className="flex justify-center items-center min-h-screen">
      <p className="text-gray-600">Unknown game state</p>
    </div>
  );
}

/**
 * Migration Notes:
 *
 * 1. This component replaces the pattern used in GameClientPage.tsx
 * 2. The useGameState, useGameTurns, useCurrentQuestion, and useGameAnswers
 *    hooks are replaced by the single useGameMachine hook
 * 3. All state is now managed centrally by the XState machine
 * 4. Realtime subscriptions are handled automatically by the machine
 * 5. Error states and loading states are properly handled
 *
 * To complete the migration:
 * 1. Update GameLobby and GameRoom components to accept machine context
 * 2. Remove the old hooks from those components
 * 3. Replace GameClientPage with GameWithMachine
 * 4. Test all game flows to ensure they work correctly
 */
