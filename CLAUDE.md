# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

cm-pgn-viewer is a read-only PGN viewer for the web. It renders a chess game (with
variations, NAGs and comments) as a clickable notation next to an SVG chessboard, plus a
first/previous/next/last/flip control row. It replaces the old jQuery-based
`cmPgnViewer` / PgnViewerJS setup used inline in the chessmail forum.

An editor is intentionally out of scope for now and will be built as a separate project;
the notation component and the cm-chess-backed model are kept editor-friendly so that work
can build on this one later.

## Development Setup

- `npm install` to install dependencies
- Serve the project root via any static HTTP server (e.g. `npx http-server .`) and open `index.html`
- No build step, no bundler — uses native ES modules with import maps
- No test suite (`npm test` is a no-op)
- SCSS in `assets/style/screen.scss` compiles to `screen.css` (`sass assets/style/screen.scss assets/style/screen.css`)

## Architecture

**Two source files:**

- `src/PgnViewer.js` — the main class. Owns a `Chess` (cm-chess) instance, a `Chessboard`
  (cm-chessboard) and a `NotationRenderer`. Builds the DOM (headers / board+notation /
  controls), wires clicks and arrow keys, and drives navigation.
- `src/NotationRenderer.js` — renders the move tree to clickable HTML, recursing into
  `move.variations`. This is the piece the cm-* ecosystem was missing: chess-console's
  `History` renders only a flat, variation-less ply list.

**Navigation model:** the viewer tracks `currentMove`, a cm-pgn move object (or `undefined`
for the start position), not a plain ply index — because variations share ply numbers.
`next`/`previous` follow `move.next` / `move.previous` along the current line; clicking a
move in the notation jumps straight to it. Board position comes from `move.fen`
(cm-pgn precomputes a FEN per move); the start FEN is `chess.setUpFen()`.

**Move ↔ DOM mapping:** `NotationRenderer` keeps a `moves[]` registry (index stored in
`data-move-index`) for click → move lookup, and a `moveToElement` Map for highlighting the
active move.

**Key dependencies** (all from the same author's `cm-*` ecosystem):
- `cm-chess` / `cm-pgn` / `chess.mjs` — PGN parsing with variations, NAGs, comments; per-move FENs
- `cm-chessboard` — SVG board, `Markers` extension for the last-move highlight
- `cm-web-modules` — `TextUtils.escapeHtml` for header output

## Conventions

- Vanilla ES6 modules, no TypeScript, no framework, no jQuery
- Control buttons use Font Awesome Free (solid) icons (`CONTROL_ICONS`), overridable via the
  `icons` prop; button titles/aria-labels via the `i18n` prop. The embedding page must load
  Font Awesome Free (the demo loads it from `node_modules/@fortawesome/fontawesome-free`)
- CSS class selectors (not IDs) for DOM lookup within the container context, so multiple
  viewers can live on one page (the forum case)
- Theming via CSS custom properties on `.cm-pgn-viewer`, with light/dark variants driven by
  `prefers-color-scheme` and `[data-bs-theme="dark"]`
