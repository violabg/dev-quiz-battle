# DevQuizBattle Documentation

Welcome to **DevQuizBattle**! This project is an AI-powered multiplayer coding quiz game built with Next.js, React, TypeScript, Tailwind CSS v4, and Supabase. This documentation provides an overview, setup instructions, and links to detailed guides for each part of the codebase.

---

## Table of Contents

- [DevQuizBattle Documentation](#devquizbattle-documentation)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
  - [Environment Variables](#environment-variables)
  - [Scripts](#scripts)
  - [Key Technologies](#key-technologies)
  - [Documentation Index](#documentation-index)
  - [Contributing](#contributing)
  - [License](#license)

---

## Overview

DevQuizBattle is a real-time, multiplayer coding quiz game. It leverages Supabase for authentication, real-time updates, and database operations. The UI is built with modern, accessible components using shadcn/ui and Radix UI, styled with Tailwind CSS v4 and OKLCH color spaces for theme support.

## Project Structure

```
app/                # Next.js app directory (routing, pages, layouts)
components/         # Reusable UI and feature components
lib/                # Supabase logic, hooks, and utilities
public/             # Static assets
hooks/              # Custom React hooks
styles/             # Global and utility CSS (see app/globals.css)
types/              # TypeScript types
README.md           # Project overview and quickstart
/docs/              # Additional documentation (see below)
```

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd dev-quiz-battle
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Set up environment variables:**
   - Copy `.env.example` to `.env.local` and fill in your Supabase credentials.
4. **Run the development server:**
   ```sh
   npm run dev
   ```
5. **Open [http://localhost:3000](http://localhost:3000) in your browser.**

## Environment Variables

```env
POSTGRES_URL="postgres://postgres:***@host:6543/postgres?..."
POSTGRES_PRISMA_URL="postgres://postgres:***@host:6543/postgres?..."
SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
POSTGRES_URL_NON_POOLING="postgres://postgres:***@host:5432/postgres?..."
SUPABASE_JWT_SECRET="***"
POSTGRES_USER="postgres"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJI...***"
POSTGRES_PASSWORD="***"
POSTGRES_DATABASE="postgres"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJI...***"
POSTGRES_HOST="db.your-project.supabase.co"
GROQ_API_KEY="gsk_***"
```

## Scripts

- `npm run dev` — Start the Next.js development server
- `npm run build` — Build the app for production
- `npm run start` — Start the production server
- `npm run lint` — Run ESLint

## Key Technologies

- **Next.js v15** — App router, SSR, API routes
- **React v19** — Functional components, hooks
- **TypeScript v5** — Type safety
- **Tailwind CSS v4** — Utility-first styling, OKLCH color support
- **Supabase** — Auth, real-time, database
- **shadcn/ui & Radix UI** — Accessible, modern UI components
- **Zod** — Schema validation
- **react-hook-form** — Form management

## Documentation Index

- [Architecture Overview](./docs/architecture.md)
- [Supabase Integration](./docs/supabase.md)
- [UI Components](./docs/components.md)
- [Styling & Theming](./docs/styling.md)
- [Game Logic](./docs/game-logic.md)
- [API Reference](./docs/api.md)
- [Contributing Guide](./docs/contributing.md)

## Contributing

See [Contributing Guide](./docs/contributing.md) for how to get started.

## License

MIT
