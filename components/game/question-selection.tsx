"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GameDifficulty, GameLanguage } from "@/types/supabase";
import { Loader2 } from "lucide-react";

interface QuestionSelectionProps {
  isCurrentPlayersTurn: boolean;
  currentPlayerUsername?: string;
  isLoading: boolean;
  language: GameLanguage;
  difficulty: GameDifficulty;
  onLanguageChange: (value: GameLanguage) => void;
  onDifficultyChange: (value: GameDifficulty) => void;
  onCreateQuestion: () => void;
}

export function QuestionSelection({
  isCurrentPlayersTurn,
  currentPlayerUsername,
  isLoading,
  language,
  difficulty,
  onLanguageChange,
  onDifficultyChange,
  onCreateQuestion,
}: QuestionSelectionProps) {
  return (
    <Card className="gradient-border glass-card">
      <div className="flex flex-col justify-center items-center p-6 min-h-[400px]">
        {isCurrentPlayersTurn ? (
          <div className="space-y-6 w-full max-w-md">
            <h2 className="font-bold text-2xl text-center">È il tuo turno!</h2>
            <p className="text-muted-foreground text-center">
              Scegli un linguaggio di programmazione e un livello di difficoltà
              per creare una domanda per tutti.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-medium text-sm">
                  Linguaggio di programmazione
                </label>
                <Select
                  value={language}
                  onValueChange={(value) =>
                    onLanguageChange(value as GameLanguage)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona il linguaggio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="csharp">C#</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="go">Go</SelectItem>
                    <SelectItem value="rust">Rust</SelectItem>
                    <SelectItem value="ruby">Ruby</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="font-medium text-sm">Difficoltà</label>
                <Select
                  value={difficulty}
                  onValueChange={(value) =>
                    onDifficultyChange(value as GameDifficulty)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona la difficoltà" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Facile</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="hard">Difficile</SelectItem>
                    <SelectItem value="expert">Esperto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={onCreateQuestion}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Generazione domanda...
                  </>
                ) : (
                  "Genera domanda"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="mb-2 font-bold text-2xl">
              Turno di {currentPlayerUsername}
            </h2>
            <p className="text-muted-foreground">
              In attesa che crei una domanda...
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
