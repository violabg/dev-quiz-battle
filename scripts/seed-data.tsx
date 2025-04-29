"use client";

import { Button } from "@/components/ui/button";
import { addPlayerToGame } from "@/lib/supabase-game-players";
import { createGame } from "@/lib/supabase-games";
import { createProfile, getProfileByUsername } from "@/lib/supabase-profiles";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SeedData() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
  };

  const seedData = async () => {
    setLoading(true);
    setLogs([]);
    try {
      // Create test users with more realistic email addresses
      const testUsers = [
        {
          username: "testuser1",
          email: "dev.quiz.battle.test1@gmail.com",
          password: "Password123!",
        },
        {
          username: "testuser2",
          email: "dev.quiz.battle.test2@gmail.com",
          password: "Password123!",
        },
        {
          username: "testuser3",
          email: "dev.quiz.battle.test3@gmail.com",
          password: "Password123!",
        },
      ];

      const createdUsers = [];

      // Create users and profiles
      for (const user of testUsers) {
        // Check if user already exists
        const existingUser = await getProfileByUsername(user.username);
        if (existingUser) {
          addLog(`User ${user.username} already exists, skipping...`);
          createdUsers.push(existingUser);
          continue;
        }
        // Create auth user
        addLog(`Creating user ${user.username}...`);
        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: user.email,
            password: user.password,
            options: {
              data: {
                username: user.username,
              },
            },
          }
        );
        if (authError) {
          addLog(
            `Error creating auth user ${user.username}: ${authError.message}`
          );
          continue;
        }
        if (!authData.user) {
          addLog(`Failed to create auth user ${user.username}`);
          continue;
        }
        // Create profile
        addLog(`Creating profile for ${user.username}...`);
        try {
          await createProfile(authData.user.id, user.username);
        } catch (profileError: unknown) {
          addLog(
            `Error creating profile for ${user.username}: ${
              profileError instanceof Error
                ? profileError.message
                : String(profileError)
            }`
          );
          continue;
        }
        createdUsers.push({ id: authData.user.id, username: user.username });
        addLog(`Successfully created user ${user.username}`);
      }
      // Create a sample game
      if (createdUsers.length > 0) {
        const hostId = createdUsers[0].id;
        addLog(`Creating sample game with host ${createdUsers[0].username}...`);
        let gameData;
        try {
          const { data } = await createGame(hostId, 4);
          gameData = data;
        } catch (gameError: unknown) {
          addLog(
            `Error creating game: ${
              gameError instanceof Error ? gameError.message : String(gameError)
            }`
          );
        }
        if (gameData) {
          addLog(`Created game with code: ${gameData.code}`);
          // Add players to the game
          for (let i = 0; i < createdUsers.length; i++) {
            addLog(`Adding player ${createdUsers[i].username} to game...`);
            try {
              await addPlayerToGame(gameData.id, createdUsers[i].id, i + 1);
              addLog(`Added player ${createdUsers[i].username} to game`);
            } catch (playerError: unknown) {
              addLog(
                `Error adding player ${createdUsers[i].username} to game: ${
                  playerError instanceof Error
                    ? playerError.message
                    : String(playerError)
                }`
              );
            }
          }
        }
      }

      toast.success("Seeding completato", {
        description: "Controlla i log per i dettagli",
      });
    } catch (error: unknown) {
      addLog(
        `Unexpected error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      toast.error("Errore", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button onClick={seedData} disabled={loading}>
        {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
        Popola dati di test
      </Button>

      {logs.length > 0 && (
        <div className="bg-muted mt-4 p-4 border rounded-lg max-h-96 overflow-auto">
          <h3 className="mb-2 font-semibold">Log:</h3>
          <div className="font-mono text-sm">
            {logs.map((log, index) => (
              <div
                key={index}
                className="py-1 last:border-0 border-b border-border"
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
