"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GameDifficulty, GameLanguage } from "@/lib/convex-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface QuestionSelectionProps {
  isCurrentPlayersTurn: boolean;
  currentPlayerUsername?: string | null;
  isLoading: boolean;
  language: GameLanguage;
  difficulty: GameDifficulty;
  onSubmit: (values: {
    language: GameLanguage;
    difficulty: GameDifficulty;
  }) => void;
}

const questionSelectionSchema = z.object({
  language: z.enum([
    "css",
    "html",
    "javascript",
    "typescript",
    "react",
    "vue",
    "angular",
    "nodejs",
    "python",
    "java",
    "csharp",
    "go",
    "rust",
    "ruby",
  ]),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
});
type QuestionSelectionForm = z.infer<typeof questionSelectionSchema>;

export const LANGUAGE_OPTIONS = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "angular", label: "Angular" },
  { value: "nodejs", label: "Node.js" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "ruby", label: "Ruby" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Facile" },
  { value: "medium", label: "Media" },
  { value: "hard", label: "Difficile" },
  { value: "expert", label: "Esperto" },
];

export function QuestionSelection({
  isCurrentPlayersTurn,
  currentPlayerUsername,
  isLoading,
  language,
  difficulty,
  onSubmit,
}: QuestionSelectionProps) {
  const form = useForm<QuestionSelectionForm>({
    resolver: zodResolver(questionSelectionSchema),
    defaultValues: { language, difficulty },
    mode: "onChange",
  });
  const { handleSubmit, setValue } = form;

  React.useEffect(() => {
    setValue("language", language);
    setValue("difficulty", difficulty);
  }, [language, difficulty, setValue]);

  // Only update parent on submit
  const handleFormSubmit = (values: QuestionSelectionForm) => {
    onSubmit(values);
  };

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
            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={handleSubmit(handleFormSubmit)}
                autoComplete="off"
              >
                <FormField
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linguaggio di programmazione</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona il linguaggio" />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficoltà</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona la difficoltà" />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFFICULTY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Generazione domanda...
                    </>
                  ) : (
                    "Genera domanda"
                  )}
                </Button>
              </form>
            </Form>
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
