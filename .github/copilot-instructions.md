# Copilot Instructions

## Project Context

- This project uses Next.js (v15.3.1), React (v19.1.0), and TypeScript (v5.8.3).
- Tailwind CSS is version 4.x. Use only Tailwind v4 features and syntax.
- The following libraries are used:
  - @ai-sdk/groq, @ai-sdk/react, ai
  - @hookform/resolvers, react-hook-form
  - @radix-ui/react-\* (dialog, dropdown-menu, label, popover, select, slot)
  - @supabase/supabase-js
  - class-variance-authority, clsx, lucide-react, next-themes, sonner, tailwind-merge, tw-animate-css, zod

## Styling

- All colors must be specified in OKLCH format in css files (e.g., `oklch(0.7 0.1 200)`).
- Use Tailwind CSS utility classes wherever possible.
- Do not use deprecated or removed Tailwind features from earlier versions.

## General

- Prefer functional React components.
- Use Zod for schema validation.
- Use React Hook Form for form management.
- Use Radix UI components.
- Use Supabase for backend/database interactions.
- Use arrow functions for methods and new components.
- Use typs over interfaces.

### UI/UX Expectations

- Use a modern look with border and text gradients.
- Support both light and dark themes.
- All colors must use OKLCH format for css props (--var).
- Use Tailwind CSS v4 utility classes and shadcn/ui components for styling.
- Ensure responsive, accessible, and visually engaging design.
