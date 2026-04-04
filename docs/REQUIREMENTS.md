# Requirements Document - Soviet Tetris

## 1. Functional Requirements

### 1.1 Core Gameplay

#### 1.1.1 Playfield
- 10 columns wide, 20 rows tall (visible)
- 2 additional hidden rows above the visible area for piece spawning
- Coordinate system: (0,0) is top-left of the full grid (including hidden rows)

#### 1.1.2 Tetrominoes
All 7 standard pieces must be implemented:

| Piece | Shape | Color |
|-------|-------|-------|
| I | 4 in a line | Cyan |
| O | 2x2 square | Yellow |
| T | T-shape | Purple |
| S | S-skew | Green |
| Z | Z-skew | Red |
| J | J-shape | Blue |
| L | L-shape | Orange |

Note: Colors listed are the logical piece identities. The actual rendered colors will use the Soviet palette defined in GAME_DESIGN.md. Map each piece to the closest Soviet palette equivalent.

#### 1.1.3 Piece Spawning
- Pieces spawn centered horizontally in the top hidden rows (row 0-1)
- Spawn position: column 3 for most pieces (center of 10-wide board with 4-wide bounding box)
- If the piece overlaps existing blocks at spawn, the game is over (top-out)
- Use the 7-bag randomizer: shuffle all 7 pieces, deal them in order, reshuffle when exhausted

#### 1.1.4 Gravity and Falling
- Pieces fall automatically at a rate determined by the current level
- Gravity speeds (frames at 60fps, converted to milliseconds):

| Level | Frames | Interval (ms) |
|-------|--------|----------------|
| 0 | 48 | 800 |
| 1 | 43 | 717 |
| 2 | 38 | 633 |
| 3 | 33 | 550 |
| 4 | 28 | 467 |
| 5 | 23 | 383 |
| 6 | 18 | 300 |
| 7 | 13 | 217 |
| 8 | 8 | 133 |
| 9 | 6 | 100 |
| 10-12 | 5 | 83 |
| 13-15 | 4 | 67 |
| 16-18 | 3 | 50 |
| 19-28 | 2 | 33 |
| 29+ | 1 | 17 |

#### 1.1.5 Movement
- **Left/Right**: Move piece one column. Blocked if collision.
- **Soft Drop**: Accelerate downward (1 cell per frame equivalent, approximately every 50ms). Awards 1 point per cell.
- **Hard Drop**: Instantly drop piece to lowest valid position and lock immediately. Awards 2 points per cell dropped.
- **DAS (Delayed Auto-Shift)**: Holding left/right triggers initial move immediately, then waits 170ms before auto-repeating at 50ms intervals.

#### 1.1.6 Rotation
- Use a classic rotation system (based on the original Tetris guidelines, not full SRS)
- Clockwise (Up Arrow / W) and Counter-clockwise (Z)
- The O-piece does not rotate
- Wall kick system: When a rotation would cause collision, try up to 4 alternative positions (offsets). If all fail, the rotation is rejected.
- Wall kick offsets for non-I pieces: `[(0,0), (-1,0), (+1,0), (0,-1)]`
- Wall kick offsets for I-piece: `[(0,0), (-2,0), (+2,0), (-1,0), (+1,0)]`

#### 1.1.7 Locking
- When a piece lands on a surface (cannot move down), a lock delay timer of 500ms begins
- During lock delay, the player can still move and rotate the piece
- Moving or rotating the piece resets the lock delay timer
- Maximum of 15 lock delay resets per piece (prevents infinite stalling)
- After lock delay expires: piece is written to the grid permanently
- After locking, check for completed lines

#### 1.1.8 Line Clearing
- A line is cleared when all 10 cells in a row are occupied
- Multiple lines can be cleared simultaneously (1 to 4)
- Cleared lines are removed, rows above shift down
- A brief animation plays during line clearing (see GAME_DESIGN.md)
- During the line clear animation (~300ms), the game pauses piece spawning

#### 1.1.9 Game Over
- Triggered when a newly spawned piece overlaps existing blocks (top-out)
- Display game-over screen with final score
- Player can press Enter to return to the title screen

### 1.2 Scoring

| Action | Points |
|--------|--------|
| Single (1 line) | 100 x (level + 1) |
| Double (2 lines) | 300 x (level + 1) |
| Triple (3 lines) | 500 x (level + 1) |
| Tetris (4 lines) | 800 x (level + 1) |
| Soft drop | 1 per cell |
| Hard drop | 2 per cell |

### 1.3 Level Progression
- Every 10 lines cleared advances one level
- Starting level can be selected on the title screen (0-9)
- Starting at a higher level begins with faster gravity but does not retroactively award lines
- Level affects gravity speed (per table above) and score multiplier

### 1.4 Next Piece Preview
- Show the next piece that will spawn in a dedicated preview area
- Display in a 4x4 cell mini-grid, centered

### 1.5 Ghost Piece
- Show a translucent outline of where the current piece will land if hard-dropped
- Uses the same shape and position as the current piece, projected straight down

### 1.6 Statistics Display
- Current score
- Current level
- Total lines cleared

### 1.7 Controls

| Key | Action |
|-----|--------|
| Left Arrow or A | Move left |
| Right Arrow or D | Move right |
| Down Arrow or S | Soft drop |
| Space | Hard drop |
| Up Arrow or W | Rotate clockwise |
| Z | Rotate counter-clockwise |
| P or Escape | Pause / Resume |
| Enter | Start game / Restart after game over |
| M | Toggle sound on/off |

### 1.8 Screen States

#### 1.8.1 Title Screen
- Game title in Soviet-style typography: "ТЕТРИС" (Cyrillic for Tetris)
- Subtitle: "TETRIS" in smaller Latin text below
- "НАЖМИТЕ ENTER" / "PRESS ENTER" prompt
- Starting level selector (Left/Right arrows to choose 0-9)
- Decorative Soviet visual elements (stars, borders)

#### 1.8.2 Gameplay Screen
- Centered playfield with decorative border
- Score panel to the right (or below on narrow screens)
- Next piece preview in the score panel
- Level and lines display in the score panel

#### 1.8.3 Pause Screen
- Semi-transparent overlay on the playfield
- "ПАУЗА" (PAUSE) text centered
- "P - ПРОДОЛЖИТЬ" (P - CONTINUE) instruction

#### 1.8.4 Game Over Screen
- "КОНЕЦ ИГРЫ" (GAME OVER) text
- Final score display
- "ENTER - НАЧАТЬ ЗАНОВО" (ENTER - PLAY AGAIN) prompt

## 2. Non-Functional Requirements

### 2.1 Performance
- Maintain 60fps on modern hardware
- No visible frame drops during line clear animations
- Responsive input: less than 16ms between keypress and visual response

### 2.2 Compatibility
- Must work in current versions of Chrome, Firefox, Safari, and Edge
- No browser-specific APIs beyond standard Web Audio API and Canvas
- Graceful degradation: if Web Audio is unavailable, game plays silently

### 2.3 Responsiveness
- Playable at viewport widths from 360px (mobile portrait) to 1920px+
- Playfield scales proportionally
- On narrow screens (<768px), move the score panel below the playfield
- Touch controls are NOT required (keyboard only)

### 2.4 Accessibility
- High contrast between piece colors and background
- Score text large enough to read easily
- Keyboard-only interaction (no mouse required)

### 2.5 File Size
- Total application size under 50KB (uncompressed)
- No external fonts (use system monospace with CSS fallbacks)
- No images (all visuals drawn via CSS and Canvas)
- No external libraries

### 2.6 Sound
- All sounds generated via Web Audio API oscillators
- No audio files loaded
- AudioContext initialized on first user interaction (browser autoplay policy)
- Master volume control via M key (toggle mute)
- Sounds must not overlap harshly; use short durations (50-300ms)
