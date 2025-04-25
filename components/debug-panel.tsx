"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronUp } from "lucide-react"

interface DebugPanelProps {
  data: any
  title?: string
}

export function DebugPanel({ data, title = "Debug Info" }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card className="mt-8 border-dashed">
      <CardHeader
        className="py-3 flex flex-row items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
          {title}
          {isOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
        </CardTitle>
      </CardHeader>
      {isOpen && (
        <CardContent className="pt-0">
          <pre className="text-xs overflow-auto max-h-96 p-4 bg-muted rounded-md">{JSON.stringify(data, null, 2)}</pre>
        </CardContent>
      )}
    </Card>
  )
}
