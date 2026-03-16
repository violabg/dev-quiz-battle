import { Input as InputPrimitive } from "@base-ui/react/input";
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "file:inline-flex bg-background/72 disabled:bg-input/55 dark:bg-input/50 file:bg-transparent disabled:opacity-50 shadow-black/5 shadow-inner dark:shadow-black/25 px-3.5 py-2 border border-input/90 aria-invalid:border-destructive focus-visible:border-ring dark:aria-invalid:border-destructive/70 file:border-0 rounded-[calc(var(--radius)+0.2rem)] outline-none aria-invalid:ring-destructive/20 focus-visible:ring-[3px] focus-visible:ring-ring/40 dark:aria-invalid:ring-destructive/40 w-full min-w-0 h-11 file:h-6 file:font-medium text-foreground placeholder:text-muted-foreground/90 file:text-foreground md:text-sm file:text-sm text-base transition-[border-color,box-shadow,background-color] disabled:cursor-not-allowed disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
