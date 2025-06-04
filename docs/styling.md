# Styling & Theming

[← Back to README](../README.md)

This document explains the styling and theming approach in Dev Quiz Battle.

---

## Tailwind CSS v4

- All styling uses Tailwind CSS v4 utility classes.
- No deprecated or removed features from earlier Tailwind versions are used.
- Responsive, accessible, and modern design is prioritized.

## OKLCH Color Space

- All custom colors are defined in OKLCH format in CSS (see `app/globals.css`).
- Theme colors are set as CSS variables for light and dark mode support.
- Example:
  ```css
  :root {
    --color-background: oklch(0.98 0.01 220);
    --color-border: oklch(0.7 0.1 200);
  }
  .dark {
    --color-background: oklch(0.25 0.02 220);
    --color-border: oklch(0.45 0.04 270);
  }
  ```

## Gradients & Glassmorphism

- Gradients are used for borders, text, and backgrounds (see `.gradient-border`, `.text-gradient` in `globals.css`).
- Glassmorphism is applied to cards and overlays for a modern look.

## Theme Switching

- Uses `next-themes` and a custom `ThemeProvider` for light/dark mode.
- The `theme-toggle.tsx` component provides a UI for switching themes.

## Custom Utilities

- Additional utilities and variants are defined in `app/globals.css`.
- Example: `.glass-card`, `.gradient-border`, `.gradient-hover`.

---

See also:

- [UI Components](./components.md)
- [Architecture Overview](./architecture.md)

[← Back to README](../README.md)
