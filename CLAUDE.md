# CLAUDE.md - Project Instructions for Claude Code

## Project Overview
Soviet-style Tetris game built as a single-page HTML application. Inspired by the original 1984 Electronika 60 and 1986 IBM PC Tetris aesthetic. No frameworks, no build tools, no external dependencies. 
**Mobile-first**: the primary target is smartphones via touch controls.

## Tech Stack
- **HTML5** - Single `index.html` entry point
- **CSS3** - Single stylesheet at `css/style.css`, uses `svh` viewport units for mobile
- **Vanilla JavaScript (ES6+)** - Modular files loaded via `<script>` tags (no ES modules, no bundler)
- **Web Audio API** - Game Boy-style 4-voice synthesis (pulse, wave, noise channels) with delay/echo effect

## Project Structure
```
Vektz/
├── CLAUDE.md
├── index.html              # Entry point - loads all CSS/JS, contains game HTML
├── css/
│   └── style.css           # All styles, Soviet theme, responsive layout
├── js/
│   ├── constants.js        # Game constants, piece definitions, colors, timing
│   ├── board.js            # Board state, collision detection, line clearing
│   ├── pieces.js           # Tetromino definitions, rotation states, wall kicks
│   ├── input.js            # Keyboard input handling, key repeat (DAS/ARR)
│   ├── sound.js            # Web Audio API: 4-voice music, effects, delay/echo
│   ├── scoring.js          # Score calculation, level progression, statistics
│   ├── renderer.js         # Canvas rendering - board, pieces, dynamic sizing
│   ├── touch.js            # Touch controls: DAS/ARR, overlay taps, scroll prevention
│   ├── decorations.js      # Decorative canvas panels (desktop only)
│   └── game.js             # Main game loop, state machine, initialization
└── docs/
    ├── ARCHITECTURE.md
    ├── REQUIREMENTS.md
    └── GAME_DESIGN.md
```

## Mobile-First Architecture

### Layout Strategy
- **Container**: `height: 100svh` (with `100vh` fallback) + `overflow: hidden` — prevents content from exceeding the actual mobile viewport (accounts for browser chrome)
- **Game area**: Flex row on all screen sizes — board on the left, score panel on the right as a compact vertical sidebar
- **Touch controls**: Flow-based (not `position: fixed`) — inserted inside `.game-container` so they participate in the flex layout and don't overlap content
- **Canvas sizing** (`renderer.js:resizeCanvas()`): Measures actual DOM element heights/widths via `offsetHeight`/`offsetWidth` and uses `window.visualViewport` for accurate mobile measurements instead of hardcoded pixel subtractions
- **Safe areas**: `env(safe-area-inset-bottom)` for notched devices

### Touch Controls (`touch.js`)
- 6 buttons: moveLeft, softDrop, moveRight (left group) + rotateCCW, rotateCW, hardDrop (right group)
- DAS/ARR repeat system matching keyboard behavior for moveLeft, moveRight, softDrop
- Overlay tap handlers for title screen, pause, and game over
- Scroll/zoom/pull-to-refresh prevention via `touch-action: none` and `touchmove` preventDefault
- Controls are appended to `.game-container` (not `document.body`) for proper flex participation

### Testing on Mobile
- Test with Chrome DevTools responsive mode (375×667, 390×844, 414×896)
- Verify on actual iPhone/Android — `100svh` behavior differs from DevTools
- Check: all UI visible without scroll, controls don't overlap board, canvas fills available space
- Test landscape orientation (layout adapts dynamically)

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
- Use `svh`/`dvh` viewport units with `vh` fallback for mobile compatibility
- Touch control sizes use fixed `width`/`height` (not `min-width`/`min-height`) for consistent mobile sizing

### HTML
- Semantic HTML5 elements where appropriate
- Game rendering uses a single `<canvas>` element for the playfield
- UI chrome (score, level, next piece) rendered in HTML/CSS, not on canvas
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` required

## Music System (`sound.js`)
- **4 Game Boy-style voices**: Pulse 1 (melody), Pulse 2 (harmony), Wave (bass), Noise (drums)
- **Custom waveforms**: `createPeriodicWave()` for pulse duty cycles (12.5%, 25%, 50%) and quantized triangle bass
- **Effects**: Delay/echo (220ms, 25% feedback), vibrato (5.5Hz LFO on sustained notes), velocity variation
- **4 songs**: Korobeiniki, Kalinka, Katyusha, Dark Eyes — all with full 4-voice arrangements
- **Scheduler**: Look-ahead pattern (2s buffer, 500ms interval) for glitch-free playback
- **Gain staging**: musicGain 0.13, melody 0.18, harmony 0.10, bass 0.14 — balanced for delay mix

## How to Run
Open `index.html` in any modern browser. No server required (all local, no fetches).
For development, use any local HTTP server:
```bash
python3 -m http.server 8000
# Then open http://localhost:8000
```
Live deployment: https://jrojasinjs.github.io/Vektz/

## How to Test
Manual testing only. Open in browser and play. Verify:
1. All 7 tetrominoes spawn and rotate correctly
2. Line clearing works for 1, 2, 3, and 4 lines simultaneously
3. Scoring increments correctly per REQUIREMENTS.md
4. Speed increases each level
5. Game over triggers when pieces stack to the top
6. All sounds and music play without errors (test all 4 songs with N key)
7. Pause/resume works
8. **Mobile**: all UI visible without scroll at 360px–430px width
9. **Mobile**: touch controls responsive, no overlap with board or score panel
10. **Mobile**: safe area insets work on notched devices
11. **Desktop**: responsive layout works up to 1920px with decoration panels

## Key Design Decisions
- Canvas for playfield rendering (performance, pixel control)
- HTML/CSS for surrounding UI (easier theming, text rendering)
- Global namespace pattern instead of ES modules (no server/bundler requirement)
- Script load order matters: constants.js first, game.js last
- All timing uses `requestAnimationFrame` with delta-time accumulation
- The game board is a 2D array of integers (0 = empty, 1-7 = piece colors)
- Touch controls use flow layout (not fixed positioning) to avoid mobile viewport issues
- Canvas resizing uses `visualViewport` API and actual DOM measurements for accuracy
- Music uses Web Audio API synthesis exclusively — no audio files, works offline
