# Dev Quiz Battle Documentation

Welcome to **Dev Quiz Battle**! This project is an AI-powered multiplayer coding quiz game built with Next.js, React, TypeScript, Tailwind CSS v4, and Convex. This documentation provides an overview, setup instructions, and links to detailed guides for each part of the codebase.

---

## Table of Contents

- [Dev Quiz Battle Documentation](#Dev Quiz Battle-documentation)
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

Dev Quiz Battle is a real-time, multiplayer coding quiz game. It leverages Convex for authentication, real-time updates, and database operations. The UI is built with modern, accessible components using shadcn/ui and Base UI, styled with Tailwind CSS v4 and OKLCH color spaces for theme support.

## Project Structure

```
app/                # Next.js app directory (routing, pages, layouts)
components/         # Reusable UI and feature components
convex/             # Convex backend (queries, mutations, actions, schema)
lib/                # Utilities, hooks, and types
public/             # Static assets
hooks/              # Custom React hooks
styles/             # Global and utility CSS (see app/globals.css)
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
   - Copy `.env.example` to `.env.local` and fill in your Convex and Groq API credentials.
4. **Run Convex development server:**
   ```sh
   npx convex dev
   ```
5. **Run the Next.js development server:**
   ```sh
   npm run dev
   ```
6. **Open [http://localhost:3000](http://localhost:3000) in your browser.**

## Environment Variables

```env
# Convex
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Groq API for AI question generation
GROQ_API_KEY=gsk_***
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
- **Convex** — Backend, auth, real-time, database
- **shadcn/ui & Base UI** — Accessible, modern UI components
- **Zod** — Schema validation
- **react-hook-form** — Form management

## Documentation Index

- [Architecture Overview](./docs/architecture.md)
- [Convex Integration](./docs/convex.md)
- [UI Components](./docs/components.md)
- [Styling & Theming](./docs/styling.md)
- [Game Logic](./docs/game-logic.md)
- [API Reference](./docs/api.md)
- [Contributing Guide](./docs/contributing.md)

## Contributing

See [Contributing Guide](./docs/contributing.md) for how to get started.

## License

MIT
