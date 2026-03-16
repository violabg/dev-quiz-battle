import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[calc(var(--radius)+0.2rem)] border bg-clip-padding text-sm font-semibold tracking-[0.14em] uppercase transition-[transform,box-shadow,border-color,background-color,color] duration-200 focus-visible:ring-[3px] aria-invalid:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none group/button select-none",
  {
    variants: {
      variant: {
        default:
          "border-primary/35 bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/35",
        outline:
          "border-border/80 bg-background/70 text-foreground backdrop-blur-sm hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "border-accent/20 bg-secondary/80 text-secondary-foreground shadow-sm shadow-accent/10 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-secondary aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/70 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "border-destructive/35 bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 hover:-translate-y-0.5 hover:border-destructive/55 hover:shadow-xl hover:shadow-destructive/30 focus-visible:border-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "border-transparent bg-[linear-gradient(135deg,var(--gradient-from),var(--gradient-to))] text-primary-foreground shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/30",
        glass:
          "border-border/70 bg-card/70 text-foreground backdrop-blur-xl shadow-lg shadow-black/10 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/90",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-5 text-[0.78rem] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
