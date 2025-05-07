import { useActor } from "@xstate/react";
import { useEffect, useState } from "react";
import type { Actor, ActorOptions, AnyActorLogic } from "xstate";
import { createActor } from "xstate";
import { gameMachine } from "../machines/gameMachine"; // Assuming gameMachine is the configured machine
import type {
  GameMachineContext,
  GameMachineEvent,
  GameMachineInput,
} from "../machines/gameMachine.types";

export const useGameMachine = (
  input: GameMachineInput,
  actorOptions?: ActorOptions<AnyActorLogic> | undefined
) => {
  const [actor, setActor] = useState<Actor<typeof gameMachine> | null>(null);

  useEffect(() => {
    const gameActor = createActor(gameMachine, {
      input: input,
      ...(actorOptions as any), // Spread actorOptions if provided
    });

    setActor(gameActor);

    // Start the actor when the component mounts or input changes
    gameActor.start();

    // Cleanup: stop the actor when the component unmounts
    return () => {
      gameActor.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.code, input.user.id, input.supabase]); // Recreate actor if core input changes

  // useActor hook to subscribe to actor changes
  // Ensure actor is not null before calling useActor
  const [state, send] = actor ? useActor(actor) : [null, () => {}];

  return {
    state: state as (typeof state & { context: GameMachineContext }) | null, // Add context typing for convenience
    send: send as (event: GameMachineEvent) => void,
    actor,
  };
};
