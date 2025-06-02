"use server";
import { getRecentQuestionTexts } from "@/lib/get-recent-questions";
import type { GameDifficulty, GameLanguage } from "@/lib/supabase/types";
import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";

interface GenerateQuestionOptions {
  language: GameLanguage;
  difficulty: GameDifficulty;
}

interface GeneratedQuestion {
  questionText: string;
  codeSample: string | null;
  options: { text: string }[];
  correctAnswer: number;
  explanation: string;
}

// Define Zod schema for the expected object
const questionSchema = z.object({
  questionText: z.string(),
  codeSample: z.string().nullable(),
  options: z
    .array(
      z.object({
        text: z.preprocess(
          (val) => (typeof val === "string" ? val : JSON.stringify(val)),
          z.string()
        ),
      })
    )
    .length(4),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string(),
});

export async function generateQuestion({
  language,
  difficulty,
}: GenerateQuestionOptions): Promise<GeneratedQuestion> {
  // Fetch previous questions from Supabase (last 5 hours, same language/difficulty)
  let previousQuestions: string[] = [];
  try {
    previousQuestions = await getRecentQuestionTexts({ language, difficulty });
  } catch {
    previousQuestions = [];
  }
  const previousQuestionsPrompt = previousQuestions.length
    ? `Evita di generare domande simili o uguali alle seguenti (già usate nelle ultime 5 ore):\n${previousQuestions
        .map((q, i) => `${i + 1}. ${q}`)
        .join("\n")}`
    : "";

  const prompt = `
    Genera una domanda a scelta multipla sulla programmazione ${language} con difficoltà ${difficulty}.
    
    La domanda deve testare la conoscenza della sintassi, dei concetti o delle best practice di ${language}.
    
    Per la difficoltà ${difficulty}:
    - facile: Sintassi di base e concetti fondamentali
    - media: Concetti intermedi e pattern comuni
    - difficile: Concetti avanzati e casi limite
    - esperto: Algoritmi complessi, ottimizzazioni o particolarità del linguaggio
    
    Includi un esempio di codice rilevante per la domanda.
    
    ${previousQuestionsPrompt}
    
    Format your response as a valid JSON object with the following structure:
    {
      "questionText": "Testo della domanda",
      "codeSample": "// Esempio di codice con formattazione e sintassi corretta",
      "options": [
        {"text": "Prima opzione"},
        {"text": "Seconda opzione"},
        {"text": "Terza opzione"},
        {"text": "Quarta opzione"}
      ],
      "correctAnswer": 0, // Indice della risposta corretta (0-3)
      "explanation": "Spiegazione dettagliata del perché la risposta è corretta"
    }
    
    Regole IMPORTANTI:
    - Ogni valore 'text' nelle opzioni deve essere una stringa, anche se la risposta è un array, oggetto o valore speciale. Usa sempre stringhe.
    - Non usare array o oggetti come valore di 'text'.
    - Se la risposta corretta è un array, oggetto o valore speciale, rappresentalo come stringa (ad esempio: "['a', 'b']" o "{a: 1, b: 2}").
    
    Assicurati che l'esempio di codice sia formattato correttamente e utilizzi la sintassi giusta per ${language}.
    Assicurati che ci sia esattamente una risposta corretta.
    La spiegazione deve essere dettagliata ed educativa.
  `;

  try {
    const { object: questionData } = await generateObject({
      model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
      schema: questionSchema,
      prompt,
      temperature: 0.7,
      maxTokens: 2048,
    });

    return questionData as GeneratedQuestion;
  } catch (error) {
    console.error("Errore durante la generazione della domanda:", error);
    throw new Error(`Impossibile generare la domanda: ${error}`);
  }
}
