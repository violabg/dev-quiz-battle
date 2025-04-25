import type React from "react"
import { cn } from "@/lib/utils"

interface GradientCardProps {
  children: React.ReactNode
  className?: string
}

export function GradientCard({ children, className }: GradientCardProps) {
  return (
    <div className={cn("gradient-border", className)}>
      <div className="p-6">{children}</div>
    </div>
  )
}
