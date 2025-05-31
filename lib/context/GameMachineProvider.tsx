"use client";

import { gameMachine } from "@/lib/xstate/game-machine";
import { createActorContext } from "@xstate/react";

export const GameMachineContext = createActorContext(gameMachine);

export const GameMachineProvider = GameMachineContext.Provider;

export const useGameMachineActorRef = GameMachineContext.useActorRef;
export const useGameMachineSelector = GameMachineContext.useSelector;
