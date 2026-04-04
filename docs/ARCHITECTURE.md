# Architecture Document - Soviet Tetris

## System Overview

The game is a client-side single-page application with no server dependencies. All code loads synchronously via `<script>` tags in `index.html`. The application uses a single global namespace `Tetris` to avoid polluting the global scope while keeping modules accessible to each other.

## File Structure and Load Order

Scripts must be loaded in this exact order in `index.html`:
1. `js/constants.js` - No dependencies
2. `js/sound.js` - Depends on: constants
3. `js/pieces.js` - Depends on: constants
4. `js/board.js` - Depends on: constants, pieces
5. `js/scoring.js` - Depends on: constants
6. `js/renderer.js` - Depends on: constants, board, pieces, scoring
7. `js/input.js` - Depends on: constants
8. `js/game.js` - Depends on: all modules above

## Global Namespace

```javascript
// Initialized in constants.js
const Tetris = {};

// Each module attaches itself:
// constants.js -> Tetris.Constants (also sets up Tetris object)
// sound.js     -> Tetris.Sound
// pieces.js    -> Tetris.Pieces
// board.js     -> Tetris.Board
// scoring.js   -> Tetris.Scoring
// renderer.js  -> Tetris.Renderer
// input.js     -> Tetris.Input
// game.js      -> Tetris.Game
```

## Module Specifications

### constants.js - `Tetris.Constants`
Defines all magic numbers and configuration values. No logic.

**Exports:**
- `BOARD_WIDTH` = 10 (columns)
- `BOARD_HEIGHT` = 20 (visible rows) + 2 (hidden buffer rows above) = 22 total
- `CELL_SIZE` = 30 (pixels, base size before scaling)
- `PIECE_COLORS` - Map of piece type index (1-7) to CSS color strings
- `PIECE_NAMES` - `['I', 'O', 'T', 'S', 'Z', 'J', 'L']`
- `GRAVITY_FRAMES` - Array of 30 entries mapping level to frames-per-drop (level 0 = 48, level 1 = 43, ..., level 29 = 1)
- `POINTS` - `{ SINGLE: 100, DOUBLE: 300, TRIPLE: 500, TETRIS: 800, SOFT_DROP: 1, HARD_DROP: 2 }`
- `DAS_DELAY` = 170 (ms, delayed auto-shift initial delay)
- `ARR_DELAY` = 50 (ms, auto-repeat rate)
- `LOCK_DELAY` = 500 (ms)
- `LINES_PER_LEVEL` = 10
- `GAME_STATES` - `{ TITLE: 'title', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'gameover' }`

### pieces.js - `Tetris.Pieces`
Defines all 7 tetrominoes, their rotation states, and wall kick data.

**Exports:**
- `SHAPES` - Object with 7 entries. Each tetromino is defined as an array of 4 rotation states (0, R, 2, L). Each rotation state is a 4x4 grid (array of arrays) with 0s and 1s.
- `WALL_KICKS` - Classic rotation system (not SRS). Wall kick offsets for each rotation transition. For I-piece, use separate kick table. Each kick entry is an array of [dx, dy] offsets to try in order.
- `createPiece(typeIndex)` - Factory function returning `{ type, rotation, x, y, shape }` where x/y is board position (top-left of bounding box). Initial spawn position: centered horizontally, y = 0 (row 0 of the hidden buffer).
- `getRotatedShape(piece, direction)` - Returns the shape array for a piece rotated CW (+1) or CCW (-1).
- `getKickOffsets(piece, direction)` - Returns array of [dx, dy] offsets to try for wall kicks.

### board.js - `Tetris.Board`
Manages the grid state and collision logic.

**Exports:**
- `create()` - Returns a new empty grid: 2D array, `BOARD_HEIGHT` rows x `BOARD_WIDTH` columns, filled with 0s.
- `isValidPosition(grid, piece, offsetX, offsetY)` - Checks if placing `piece` at `(piece.x + offsetX, piece.y + offsetY)` is valid (within bounds, no collisions). Returns boolean.
- `lockPiece(grid, piece)` - Writes the piece's cells into the grid with the piece's color index. Returns the modified grid.
- `clearLines(grid)` - Scans grid for completed rows. Removes them, shifts rows down, inserts empty rows at top. Returns `{ grid, linesCleared, clearedRowIndices }`.
- `isTopOut(grid)` - Returns true if any cell in rows 0-1 (hidden buffer) is occupied after a piece locks.

### sound.js - `Tetris.Sound`
Handles all audio using the Web Audio API. Creates an `AudioContext` on first user interaction (browser requirement).

**Exports:**
- `init()` - Creates AudioContext (called on first user gesture). Must be called before any play functions.
- `play(effectName)` - Plays a named sound effect. Valid names: `'move'`, `'rotate'`, `'softDrop'`, `'hardDrop'`, `'lineClear'`, `'tetris'`, `'levelUp'`, `'gameOver'`, `'lock'`
- `setVolume(level)` - Sets master volume (0.0 to 1.0).
- `toggle()` - Toggles sound on/off. Returns new state.

**Internal implementation:** Each effect is a function that creates oscillator/gain nodes, sets frequencies and envelopes, connects to destination, and schedules start/stop. No audio buffers or external files. See `docs/GAME_DESIGN.md` for frequency and waveform specs for each effect.

### scoring.js - `Tetris.Scoring`
Pure scoring logic with no side effects.

**Exports:**
- `create()` - Returns a new scoring state: `{ score: 0, level: 0, lines: 0, startLevel: 0 }`.
- `addLineClear(state, linesCleared)` - Returns new state with updated score, lines, and level. Score formula: `POINTS[linesCleared] * (level + 1)`.
- `addSoftDrop(state, cells)` - Returns new state with `cells * POINTS.SOFT_DROP` added.
- `addHardDrop(state, cells)` - Returns new state with `cells * POINTS.HARD_DROP` added.
- `getLevel(state)` - Returns current level based on `Math.floor(state.lines / LINES_PER_LEVEL) + state.startLevel`.
- `getDropInterval(level)` - Returns milliseconds per gravity drop for the given level.

### renderer.js - `Tetris.Renderer`
Handles all visual output. The playfield uses a `<canvas>` element. Score/level/next piece displays use DOM elements updated via `textContent`.

**Exports:**
- `init(canvasElement, uiElements)` - Stores references. `uiElements` is an object with references to DOM elements: `{ scoreDisplay, levelDisplay, linesDisplay, nextPieceCanvas }`.
- `drawBoard(grid)` - Clears and redraws the entire playfield canvas. Each occupied cell is drawn as a filled rectangle with a 1px darker border to create a beveled block look.
- `drawPiece(piece)` - Draws the current active piece on the playfield canvas (overlaid on the board).
- `drawGhostPiece(piece, grid)` - Draws a translucent outline showing where the piece will land.
- `drawNextPiece(piece)` - Draws the next piece on the separate next-piece canvas.
- `updateScore(scoreState)` - Updates the score, level, and lines DOM elements.
- `drawLineClearAnimation(rowIndices, frame)` - Animates cleared lines (flash white, then collapse). Returns true while animating, false when done.
- `drawTitleScreen()` - Renders the title/start screen on the canvas.
- `drawGameOver()` - Renders game-over overlay.
- `drawPauseOverlay()` - Renders pause overlay.

### input.js - `Tetris.Input`
Captures keyboard events and manages DAS (Delayed Auto-Shift) for left/right movement.

**Exports:**
- `init(actionCallback)` - Registers `keydown`/`keyup` listeners on `document`. The `actionCallback` is called with action names: `'moveLeft'`, `'moveRight'`, `'softDrop'`, `'hardDrop'`, `'rotateCW'`, `'rotateCCW'`, `'hold'` (optional), `'pause'`, `'start'`.
- `update(deltaTime)` - Called each frame. Manages DAS/ARR timers for held keys. Fires `actionCallback` when auto-repeat triggers.
- `reset()` - Clears all key states (used on game over / pause).

**Key mappings:**
| Key | Action |
|---|---|
| Left Arrow / A | moveLeft |
| Right Arrow / D | moveRight |
| Down Arrow / S | softDrop |
| Space | hardDrop |
| Up Arrow / W | rotateCW |
| Z | rotateCCW |
| P / Escape | pause |
| Enter | start (on title/game-over screen) |

### game.js - `Tetris.Game`
Main controller. Owns the game loop and state machine.

**Exports:**
- `init()` - Called once on page load. Sets up canvas, DOM references, initializes all modules, shows title screen.
- `start(startLevel)` - Begins a new game at the given level.
- `pause()` / `resume()` - Toggle pause state.

**Internal state:**
```javascript
{
  state: GAME_STATES.TITLE,  // current state machine state
  grid: null,                // 2D board array
  currentPiece: null,        // active falling piece
  nextPiece: null,           // piece in preview
  scoreState: null,          // scoring module state
  dropAccumulator: 0,        // ms accumulated toward next gravity drop
  lockAccumulator: 0,        // ms accumulated toward lock
  isPieceLocking: false,     // true when piece is resting on surface
  lineClearAnimation: null,  // animation state or null
  bag: [],                   // 7-bag randomizer remaining pieces
}
```

**Game Loop (via `requestAnimationFrame`):**
1. Calculate `deltaTime` from previous frame
2. Based on `state`:
   - **TITLE**: Wait for start action
   - **PLAYING**:
     a. Call `Input.update(deltaTime)`
     b. Accumulate gravity: `dropAccumulator += deltaTime`
     c. If `dropAccumulator >= getDropInterval(level)`: move piece down, reset accumulator
     d. If piece cannot move down: start lock delay timer
     e. If lock delay expires: lock piece, clear lines, spawn next
     f. If line clear animation active: run animation, skip normal rendering
     g. Call Renderer to draw board, piece, ghost, next, score
   - **PAUSED**: Draw pause overlay, wait for unpause
   - **GAME_OVER**: Draw game-over screen, wait for restart

**Piece spawning / 7-bag randomizer:**
- Maintain a "bag" of all 7 piece types, shuffled
- Draw from the bag; when empty, refill with a new shuffled set of 7
- This guarantees every piece type appears once per 7 pieces (standard modern Tetris)

## Data Flow Diagram

```
  User Input
      |
      v
  [Input] --action--> [Game] --commands--> [Board] (collision, lock, clear)
                         |                    |
                         |                    v
                         |              [Pieces] (rotation, kicks)
                         |
                         +--commands--> [Scoring] (points, level)
                         |
                         +--commands--> [Sound] (play effects)
                         |
                         +--commands--> [Renderer] (draw everything)
```

## Rendering Architecture

The playfield canvas dimensions are `BOARD_WIDTH * CELL_SIZE` x `(BOARD_HEIGHT - 2) * CELL_SIZE` (only visible rows). The canvas is scaled via CSS to fit the layout while maintaining aspect ratio.

Each frame during gameplay:
1. Clear the entire canvas
2. Draw the locked grid cells (colored blocks)
3. Draw the ghost piece (translucent)
4. Draw the active piece (solid)
5. Draw grid lines (subtle, optional)

The next-piece preview uses a separate smaller canvas, sized 4x4 cells.

## State Machine

```
  TITLE --[Enter]--> PLAYING
  PLAYING --[P/Esc]--> PAUSED
  PAUSED --[P/Esc]--> PLAYING
  PLAYING --[top out]--> GAME_OVER
  GAME_OVER --[Enter]--> TITLE
```

## Timing and Frame Rate

- `requestAnimationFrame` drives the loop (~60fps on most displays)
- All game logic uses delta-time in milliseconds, never assumes a fixed frame rate
- Gravity interval decreases per level (see `GRAVITY_FRAMES` in constants)
- DAS/ARR timers are independent of gravity
- Lock delay resets when the piece is moved or rotated successfully (up to a maximum of 15 resets to prevent infinite stalling)
