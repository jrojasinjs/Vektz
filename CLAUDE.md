# CLAUDE.md - Project Instructions for Claude Code

## Project Overview
Soviet-style Tetris game built as a single-page HTML application. Inspired by the original 1984 Electronika 60 and 1986 IBM PC Tetris aesthetic. No frameworks, no build tools, no external dependencies.

## Tech Stack
- **HTML5** - Single `index.html` entry point
- **CSS3** - Single stylesheet at `css/style.css`
- **Vanilla JavaScript (ES6+)** - Modular files loaded via `<script>` tags (no ES modules, no bundler)
- **Web Audio API** - All sounds generated programmatically, no audio files

## Project Structure
```
Tetris/
├── CLAUDE.md
├── index.html              # Entry point - loads all CSS/JS, contains game HTML
├── css/
│   └── style.css           # All styles, Soviet theme, responsive layout
├── js/
│   ├── constants.js        # Game constants, piece definitions, colors, timing
│   ├── board.js            # Board state, collision detection, line clearing
│   ├── pieces.js           # Tetromino definitions, rotation states, wall kicks
│   ├── input.js            # Keyboard input handling, key repeat (DAS/ARR)
│   ├── sound.js            # Web Audio API sound effect generation
│   ├── scoring.js          # Score calculation, level progression, statistics
│   ├── renderer.js         # Canvas rendering - board, pieces, UI elements
│   └── game.js             # Main game loop, state machine, initialization
└── docs/
    ├── ARCHITECTURE.md
    ├── REQUIREMENTS.md
    └── GAME_DESIGN.md
```

## Coding Conventions

### JavaScript
- Use `const` by default, `let` when reassignment is needed, never `var`
- All game modules expose themselves as properties on a global `Tetris` namespace object
- Example: `Tetris.Board = { ... }`, `Tetris.Sound = { ... }`
- Use the revealing module pattern (IIFE returning a public API object)
- Functions and variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- No classes; use plain objects and factory functions
- JSDoc comments on all public functions
- Strict mode (`'use strict';`) at the top of every JS file

### CSS
- Use CSS custom properties (variables) for all theme colors, defined in `:root`
- BEM-like naming: `game-board`, `game-board__cell`, `score-panel__label`
- No CSS preprocessors
- Mobile-first responsive approach with media queries for larger screens

### HTML
- Semantic HTML5 elements where appropriate
- Game rendering uses a single `<canvas>` element for the playfield
- UI chrome (score, level, next piece) rendered in HTML/CSS, not on canvas
- All text visible to the player should have a Cyrillic/Russian variant available

## How to Run
Open `index.html` in any modern browser. No server required (all local, no fetches).
For development, use any local HTTP server:
```bash
python3 -m http.server 8000
# Then open http://localhost:8000
```

## How to Test
Manual testing only. Open in browser and play. Verify:
1. All 7 tetrominoes spawn and rotate correctly
2. Line clearing works for 1, 2, 3, and 4 lines simultaneously
3. Scoring increments correctly per REQUIREMENTS.md
4. Speed increases each level
5. Game over triggers when pieces stack to the top
6. All sounds play without errors
7. Pause/resume works
8. Responsive layout works at viewport widths from 360px to 1920px

## Key Design Decisions
- Canvas for playfield rendering (performance, pixel control)
- HTML/CSS for surrounding UI (easier theming, text rendering)
- Global namespace pattern instead of ES modules (no server/bundler requirement)
- Script load order matters: constants.js first, game.js last
- All timing uses `requestAnimationFrame` with delta-time accumulation
- The game board is a 2D array of integers (0 = empty, 1-7 = piece colors)
