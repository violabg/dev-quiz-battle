"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { GradientCard } from "@/components/ui/gradient-card"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSupabase } from "@/lib/supabase-provider"
import { Check, X, Clock } from "lucide-react"
import type { Question } from "@/types/supabase"

interface QuestionDisplayProps {
  question: Question
  onSubmitAnswer: (selectedOption: number) => void
}

export function QuestionDisplay({ question, onSubmitAnswer }: QuestionDisplayProps) {
  const { user, supabase } = useSupabase()
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [allAnswers, setAllAnswers] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<string>("question")

  // Parse options from JSON
  const options = question.options as { text: string }[]

  useEffect(() => {
    // Start timer
    const startTime = Date.now()
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    // Check if user has already answered
    const checkUserAnswer = async () => {
      if (!user) return

      const { data } = await supabase
        .from("answers")
        .select("*")
        .eq("question_id", question.id)
        .eq("player_id", user.id)
        .maybeSingle()

      if (data) {
        setSelectedOption(data.selected_option)
        setHasAnswered(true)
      }
    }

    // Set up subscription for all answers
    const answerSubscription = supabase
      .channel("all-answers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "answers",
          filter: `question_id=eq.${question.id}`,
        },
        async () => {
          // Fetch all answers with player info
          const { data } = await supabase
            .from("answers")
            .select(`
              *,
              player:player_id(id, username, avatar_url)
            `)
            .eq("question_id", question.id)

          if (data) {
            setAllAnswers(data)
          }
        },
      )
      .subscribe()

    checkUserAnswer()

    return () => {
      clearInterval(timer)
      answerSubscription.unsubscribe()
    }
  }, [question.id, supabase, user])

  const handleSelectOption = (index: number) => {
    if (hasAnswered) return

    setSelectedOption(index)
    setHasAnswered(true)
    onSubmitAnswer(index)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <GradientCard>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="question">Question</TabsTrigger>
          <TabsTrigger value="results" disabled={allAnswers.length === 0}>
            Results {allAnswers.length > 0 && `(${allAnswers.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="question" className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {question.language}
              </span>
              <span className="inline-block ml-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                {question.difficulty}
              </span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{formatTime(timeElapsed)}</span>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4">{question.question_text}</h2>

          {question.code_sample && (
            <div className="mb-6 overflow-x-auto">
              <pre className="p-4 rounded-lg bg-muted font-mono text-sm">
                <code>{question.code_sample}</code>
              </pre>
            </div>
          )}

          <div className="space-y-3">
            {options.map((option, index) => (
              <Button
                key={index}
                variant={
                  selectedOption === index
                    ? hasAnswered && index === question.correct_answer
                      ? "default"
                      : "destructive"
                    : "outline"
                }
                className={`w-full justify-start text-left h-auto py-3 px-4 ${
                  hasAnswered && index === question.correct_answer ? "ring-2 ring-green-500" : ""
                }`}
                onClick={() => handleSelectOption(index)}
                disabled={hasAnswered}
              >
                <div className="flex items-center">
                  {hasAnswered && index === question.correct_answer && (
                    <Check className="h-5 w-5 mr-2 text-green-500" />
                  )}
                  {hasAnswered && selectedOption === index && index !== question.correct_answer && (
                    <X className="h-5 w-5 mr-2 text-red-500" />
                  )}
                  <span>{option.text}</span>
                </div>
              </Button>
            ))}
          </div>

          {hasAnswered && question.explanation && (
            <Card className="mt-6 p-4 bg-muted/50">
              <h3 className="font-bold mb-2">Explanation:</h3>
              <p>{question.explanation}</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="p-6">
          <h2 className="text-xl font-bold mb-4">Results</h2>

          <div className="space-y-4">
            {allAnswers.map((answer) => (
              <div
                key={answer.id}
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  answer.is_correct ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
                }`}
              >
                <div className="flex items-center">
                  {answer.is_correct ? (
                    <Check className="h-5 w-5 mr-2 text-green-500" />
                  ) : (
                    <X className="h-5 w-5 mr-2 text-red-500" />
                  )}
                  <span className="font-medium">{answer.player.username}</span>
                </div>
                <div className="text-sm">
                  <span className="font-bold mr-2">
                    {answer.is_correct ? `+${answer.score_earned.toFixed(1)}` : "0"}
                  </span>
                  <span className="text-muted-foreground">{(answer.response_time_ms / 1000).toFixed(1)}s</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </GradientCard>
  )
}
