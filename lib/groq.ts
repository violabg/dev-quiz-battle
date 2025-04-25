"use server";
import type { GameDifficulty, GameLanguage } from "@/types/supabase";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

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

export async function generateQuestion({
  language,
  difficulty,
}: GenerateQuestionOptions): Promise<GeneratedQuestion> {
  const prompt = `
    Genera una domanda a scelta multipla sulla programmazione ${language} con difficoltà ${difficulty}.
    
    La domanda deve testare la conoscenza della sintassi, dei concetti o delle best practice di ${language}.
    
    Per la difficoltà ${difficulty}:
    - facile: Sintassi di base e concetti fondamentali
    - media: Concetti intermedi e pattern comuni
    - difficile: Concetti avanzati e casi limite
    - esperto: Algoritmi complessi, ottimizzazioni o particolarità del linguaggio
    
    Includi un esempio di codice rilevante per la domanda.
    
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
    
    Assicurati che l'esempio di codice sia formattato correttamente e utilizzi la sintassi giusta per ${language}.
    Assicurati che ci sia esattamente una risposta corretta.
    La spiegazione deve essere dettagliata ed educativa.
  `;

  try {
    const { text } = await generateText({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      prompt,
      temperature: 0.7,
      maxTokens: 2048,
    });
    console.log("text :>> ", text);
    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Impossibile analizzare il JSON dalla risposta");
    }

    const questionData = JSON.parse(jsonMatch[0]) as GeneratedQuestion;
    return questionData;
  } catch (error) {
    console.error("Errore durante la generazione della domanda:", error);
    throw new Error("Impossibile generare la domanda");
  }
}
