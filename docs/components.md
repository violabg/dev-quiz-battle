# UI Components

[← Back to README](../README.md)

This document describes the main UI components and their organization in Dev Quiz Battle.

---

## Component Organization

- All reusable components are in the `components/` directory.
- UI primitives are based on shadcn/ui and Base UI.
- Custom game and auth components are grouped by feature.

## Key Component Groups

### Auth Components

- `login-form.tsx`, `sign-up-form.tsx`, `forgot-password-form.tsx`, `update-password-form.tsx`
- Use Zod for validation and React Hook Form for state management.

### Game Components

- `game/`
  - `game-lobby.tsx` — Lobby UI
  - `game-room.tsx` — Main game logic and display
  - `question-display.tsx` — Shows current question and options
  - `players-standing.tsx` — Scoreboard and winners
  - `turn-result-card.tsx` — End-of-turn summary
  - `current-turn-card.tsx` — Shows whose turn it is

### Layout & Navigation

- `layout/navbar.tsx` — Main navigation bar
- `theme-toggle.tsx` — Light/dark mode toggle

### UI Primitives

- `ui/` — Button, Card, Dialog, Dropdown, Form, Input, Label, etc.
- All primitives are accessible and theme-aware.

## Styling

- All components use Tailwind CSS v4 utility classes.
- Colors are set via OKLCH CSS variables for theme support.
- Gradients and glassmorphism are used for a modern look.

## Example Usage

```tsx
import { Card } from "@/components/ui/card";

<Card className="gradient-border glass-card">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>;
```

---

See also:

- [Styling & Theming](./styling.md)
- [Game Logic](./game-logic.md)

[← Back to README](../README.md)
