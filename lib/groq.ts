import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import type { GameLanguage, GameDifficulty } from "@/types/supabase"

interface GenerateQuestionOptions {
  language: GameLanguage
  difficulty: GameDifficulty
}

interface GeneratedQuestion {
  questionText: string
  codeSample: string | null
  options: { text: string }[]
  correctAnswer: number
  explanation: string
}

export async function generateQuestion({ language, difficulty }: GenerateQuestionOptions): Promise<GeneratedQuestion> {
  const prompt = `
    Generate a multiple-choice coding question about ${language} programming with ${difficulty} difficulty.
    
    The question should test the user's knowledge of ${language} syntax, concepts, or best practices.
    
    For ${difficulty} difficulty:
    - easy: Basic syntax and fundamental concepts
    - medium: Intermediate concepts and common patterns
    - hard: Advanced concepts and edge cases
    - expert: Complex algorithms, optimizations, or language-specific nuances
    
    Include a code sample that is relevant to the question.
    
    Format your response as a valid JSON object with the following structure:
    {
      "questionText": "The question text",
      "codeSample": "// The code sample with proper formatting and syntax",
      "options": [
        {"text": "First option"},
        {"text": "Second option"},
        {"text": "Third option"},
        {"text": "Fourth option"}
      ],
      "correctAnswer": 0, // Index of the correct answer (0-3)
      "explanation": "Detailed explanation of why the correct answer is correct"
    }
    
    Ensure the code sample is properly formatted and uses correct syntax for ${language}.
    Make sure there is exactly one correct answer.
    The explanation should be detailed and educational.
  `

  try {
    const { text } = await generateText({
      model: groq("llama3-70b-8192"),
      prompt,
      temperature: 0.7,
      maxTokens: 2048,
    })

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from response")
    }

    const questionData = JSON.parse(jsonMatch[0]) as GeneratedQuestion
    return questionData
  } catch (error) {
    console.error("Error generating question:", error)
    throw new Error("Failed to generate question")
  }
}
