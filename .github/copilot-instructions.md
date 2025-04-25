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

- All colors must be specified in OKLCH format (e.g., `oklch(0.7 0.1 200)`).
- Use Tailwind CSS utility classes wherever possible.
- Do not use deprecated or removed Tailwind features from earlier versions.

## General

- Prefer functional React components.
- Use Zod for schema validation.
- Use React Hook Form for form management.
- Use Radix UI components.
- Use Supabase for backend/database interactions.

## Core Gameplay:

DevQuizBattle is a multiplayer, turn-based coding quiz game powered by AI. The following outlines the core gameplay and requirements:

### Game Flow

1. **Lobby/Game Creation**

   - Users can create new game rooms with customizable settings.
   - Each game room is assigned a unique code for others to join.
   - The creator is the host with admin privileges.
   - Players must join before the game starts.

2. **Game Joining**

   - Players join by entering a game code.
   - Players select a username and avatar before joining.
   - All active players are visible in a waiting area.
   - The host can start the game when ready.

3. **Turn-Based Gameplay**

   - Players take turns in a predetermined order.
   - On their turn, the current player selects:
     - Programming language (e.g., JavaScript, Python, Java, C#, etc.)
     - Difficulty level (Easy, Medium, Hard, Expert)
   - The AI generates a coding question based on these selections.
   - All players can attempt to answer simultaneously.

4. **Question Generation (AI)**

   - Use Groq LLM to generate questions tailored to the selected language and difficulty.
   - Each question includes:
     - A formatted code sample with syntax highlighting.
     - Four possible answers (one correct).
     - An explanation of the correct answer (shown after completion).

5. **Scoring System**

   - The first player to answer correctly receives 1 base point.
   - Time-based bonus points:
     - Under 15 seconds: +3 points
     - 15–30 seconds: +2 points
     - 30–60 seconds: +1 point
     - 60–120 seconds: +0.5 points
     - Over 120 seconds: no bonus
   - Correct answers are highlighted in green; incorrect in red.
   - No penalty for wrong answers.

6. **Real-time Updates**
   - All game state changes are broadcast instantly to all players using Supabase Realtime.
   - Players see who is answering, current scores, and elapsed time.
   - The leaderboard updates live as scores change.

### UI/UX Expectations

- Use a modern look with border and text gradients.
- Support both light and dark themes.
- All colors must use OKLCH format.
- Use Tailwind CSS v4 utility classes and shadcn/ui components for styling.
- Ensure responsive, accessible, and visually engaging design.
