# CLAUDE.md

This file provides instructions and context for Claude Code when working in this repository.

## Project

Seasonal — a Remotion video project for creating videos programmatically with React.

## Tech Stack

- **Next.js** — web framework (App Router)
- **Remotion** (v4.0.438) — programmatic video creation with React
- **React** — UI framework
- **TypeScript** — all source files use `.ts`/`.tsx`

## Project Structure

- `app/page.tsx` — Main web page with Remotion Player and customization form
- `app/layout.tsx` — Root layout
- `.github/workflows/deploy.yml` — GitHub Pages deployment
- `src/index.ts` — Remotion entry point (calls `registerRoot`)
- `src/Root.tsx` — Composition definitions
- `src/HelloWorld.tsx` — Video component (accepts VideoProps)
- `src/types.ts` — Shared types and default props
- `out/` — CLI rendered video output (gitignored)

## Commands

- `npm run dev` — Start Next.js dev server
- `npm run build` — Build for production
- `npm run studio` — Open Remotion Studio in browser
- `npm run render` — Render the HelloWorld composition to `out/video.mp4`

## Development

- Use clear, descriptive commit messages.
- Keep changes focused and minimal.
- Prefer editing existing files over creating new ones.
- All Remotion packages must be pinned to the same exact version (no `^` prefix).
