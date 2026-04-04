# Game Design Document - Soviet Tetris

## 1. Visual Design

### 1.1 Color Palette

All colors defined as CSS custom properties in `:root`:

```css
:root {
  /* Primary Soviet palette */
  --color-bg:           #1a1a0e;   /* Very dark olive-black, CRT-like background */
  --color-bg-panel:     #2a2a1e;   /* Slightly lighter panel background */
  --color-border:       #8b7355;   /* Khaki/gold border color */
  --color-border-light: #c4a668;   /* Lighter gold for accents */
  --color-text:         #c4a668;   /* Gold text */
  --color-text-bright:  #e8d5a3;   /* Bright cream for headings */
  --color-red:          #cc3333;   /* Soviet red - primary accent */
  --color-red-dark:     #8b1a1a;   /* Darker red for borders */
  --color-star:         #cc3333;   /* Star decoration color */

  /* Piece colors - muted, CRT-like tones */
  --piece-i:  #5b8c8c;  /* Muted teal/cyan */
  --piece-o:  #b8a83e;  /* Muted gold/yellow */
  --piece-t:  #8b5e8b;  /* Muted purple */
  --piece-s:  #5b8b4e;  /* Muted green */
  --piece-z:  #b84040;  /* Muted red */
  --piece-j:  #4a6a8b;  /* Muted blue */
  --piece-l:  #b87840;  /* Muted orange */

  /* Piece highlight colors (lighter version for bevel effect) */
  --piece-i-light:  #7ababa;
  --piece-o-light:  #d4c85a;
  --piece-t-light:  #a87aa8;
  --piece-s-light:  #7ab86a;
  --piece-z-light:  #d45858;
  --piece-j-light:  #6a8ab8;
  --piece-l-light:  #d49858;

  /* Piece shadow colors (darker version for bevel effect) */
  --piece-i-dark:  #3a6a6a;
  --piece-o-dark:  #8a7a28;
  --piece-t-dark:  #6a3e6a;
  --piece-s-dark:  #3a6a30;
  --piece-z-dark:  #8a2828;
  --piece-j-dark:  #2a4a6a;
  --piece-l-dark:  #8a5828;

  /* UI colors */
  --color-grid-line:    #2a2a1e;   /* Subtle grid lines on playfield */
  --color-ghost:        rgba(200, 200, 200, 0.2);  /* Ghost piece fill */
  --color-ghost-border: rgba(200, 200, 200, 0.5);  /* Ghost piece outline */
}
```

### 1.2 Block Rendering Style

Each block (cell) on the board is rendered with a beveled 3D effect to mimic the original IBM PC Tetris look:

```
+------------------+
|  Light edge (2px) |   <- top and left edges use piece-*-light color
|  +------------+  |
|  |            |  |
|  |  Main fill |  |   <- center uses piece-* color
|  |            |  |
|  +------------+  |
|  Dark edge (2px)  |   <- bottom and right edges use piece-*-dark color
+------------------+
```

Each cell is `CELL_SIZE` (30px base) square. The bevel border is 2px on each side. When rendering on canvas:
1. Fill full cell rect with the dark (shadow) color
2. Fill inset rect (top-left offset by 0, size reduced by 2px on right/bottom) with light (highlight) color
3. Fill inner rect (inset by 2px on all sides) with the main color

### 1.3 Typography

Use system monospace fonts with the following CSS stack:
```css
font-family: 'Courier New', Courier, 'Lucida Console', monospace;
```

Text styling rules:
- All UI labels rendered in uppercase
- Score numbers use monospace with fixed width (right-aligned, zero-padded to 7 digits for score)
- Title screen "ТЕТРИС" rendered large, in `--color-red` with `text-shadow` for a glow effect
- All text uses `letter-spacing: 2px` for that utilitarian Soviet feel

### 1.4 Layout

```
Desktop (>= 768px):
+--------------------------------------------------+
|                 ★  ТЕТРИС  ★                     |  <- Title bar
+--------------------------------------------------+
|         |                    |                     |
|  Left   |     PLAYFIELD     |   SCORE PANEL       |
|  Deco   |    (10x20 grid)   |                     |
|  Panel  |                   |   ОЧКИ: 0001250     |
|  (stars |                   |   УРОВЕНЬ: 03       |
|   and   |                   |   ЛИНИИ: 032        |
|  border)|                   |                     |
|         |                   |   СЛЕДУЮЩАЯ:        |
|         |                   |   [Next piece       |
|         |                   |    preview box]      |
|         |                   |                     |
|         |                   |   ★ ★ ★             |
+--------------------------------------------------+
|           УПРАВЛЕНИЕ / CONTROLS                   |
+--------------------------------------------------+

Mobile (< 768px):
+-------------------------+
|     ★  ТЕТРИС  ★       |
+-------------------------+
|                         |
|       PLAYFIELD         |
|      (10x20 grid)       |
|                         |
+-------------------------+
| ОЧКИ   | УРОВЕНЬ| ЛИНИИ|
| 001250 |   03   |  032 |
+-------------------------+
| СЛЕД:  [next piece]     |
+-------------------------+
```

### 1.5 Decorative Elements

#### Constructivist Border
The playfield border uses a double-line pattern inspired by Soviet constructivist design:
- Outer border: 3px solid `--color-red`
- 2px gap
- Inner border: 1px solid `--color-border`
- Corner decorations: small red stars (drawn with CSS or canvas)

#### Star Decorations
Five-pointed stars drawn using CSS `clip-path` or canvas `Path2D`:
```
Star path (normalized to 0-1 range, centered at 0.5, 0.5):
  Move to (0.5, 0.0)    // top point
  Line to (0.618, 0.382)
  Line to (1.0, 0.382)
  Line to (0.691, 0.618)
  Line to (0.809, 1.0)
  Line to (0.5, 0.764)
  Line to (0.191, 1.0)
  Line to (0.309, 0.618)
  Line to (0.0, 0.382)
  Line to (0.382, 0.382)
  Close path
```

#### Title Screen Background
- Dark background with subtle diagonal line pattern (CSS repeating-linear-gradient at 45 degrees, 1px lines every 20px, very low opacity)
- "ТЕТРИС" in large bold text (3-4rem), colored `--color-red` with `text-shadow: 0 0 20px rgba(204, 51, 51, 0.5)` for glow
- Red stars flanking the title
- "НАЖМИТЕ ENTER" blinking at 1Hz using CSS animation (opacity 0 to 1)
- Level selector: "УРОВЕНЬ: < 0 >" with arrow indicators

### 1.6 Playfield Background
- Background color: `--color-bg` (very dark, mimicking old CRT)
- Optional: extremely subtle scan-line effect using CSS `repeating-linear-gradient` (2px transparent, 2px rgba(0,0,0,0.1)) overlaid on the canvas

## 2. Sound Design

All sounds use the Web Audio API with oscillator nodes. No external audio files.

### 2.1 Audio Context Setup
```javascript
// Create on first user interaction
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.3;  // Default volume
masterGain.connect(audioCtx.destination);
```

### 2.2 Sound Effects Specifications

#### Move (left/right)
- Waveform: Square
- Frequency: 180 Hz
- Duration: 50ms
- Gain envelope: 0.2 peak, linear ramp to 0 over duration
- Purpose: Short click-like feedback for movement

#### Rotate
- Waveform: Square
- Frequency: 300 Hz, quick slide up to 400 Hz over 60ms
- Duration: 60ms
- Gain envelope: 0.2 peak, linear ramp to 0
- Purpose: Higher-pitched click for rotation

#### Soft Drop (per cell)
- Waveform: Triangle
- Frequency: 120 Hz
- Duration: 30ms
- Gain envelope: 0.1 peak, immediate ramp to 0
- Purpose: Very subtle tick per cell descended

#### Hard Drop
- Waveform: White noise (use AudioBuffer with random values)
- Duration: 100ms
- Filter: Low-pass at 800 Hz
- Gain envelope: 0.3 peak, exponential ramp to 0
- Purpose: Satisfying thud when piece slams down

#### Lock
- Waveform: Triangle
- Frequency: 200 Hz falling to 100 Hz over 80ms
- Duration: 80ms
- Gain envelope: 0.15 peak, linear ramp to 0
- Purpose: Subtle "settling" sound when piece locks

#### Line Clear (1-3 lines)
- Waveform: Square
- Sequence: Two quick notes - 440 Hz for 80ms, then 660 Hz for 120ms
- Total duration: 200ms
- Gain: 0.25
- Purpose: Cheerful ascending ding

#### Tetris (4 lines)
- Waveform: Square + Sawtooth (layered)
- Sequence: Four ascending notes - C5 (523 Hz, 80ms), E5 (659 Hz, 80ms), G5 (784 Hz, 80ms), C6 (1047 Hz, 160ms)
- Total duration: ~400ms
- Gain: 0.3
- Purpose: Triumphant fanfare for clearing 4 lines

#### Level Up
- Waveform: Square
- Sequence: C5 (523 Hz, 100ms), silence 30ms, G5 (784 Hz, 100ms), silence 30ms, C6 (1047 Hz, 200ms)
- Total duration: ~460ms
- Gain: 0.25
- Purpose: Celebratory ascending arpeggio

#### Game Over
- Waveform: Sawtooth
- Sequence: Descending tones - E4 (330 Hz, 200ms), C4 (262 Hz, 200ms), A3 (220 Hz, 200ms), F3 (175 Hz, 400ms)
- Total duration: ~1000ms
- Gain: 0.25, with slow fade-out on the last note
- Purpose: Somber descending melody

### 2.3 Sound Implementation Pattern

Each sound effect should follow this pattern:
```javascript
function playMove() {
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(180, now);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.05);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.05);
}
```

For white noise (hard drop):
```javascript
function createNoiseBuffer() {
  const bufferSize = audioCtx.sampleRate * 0.1; // 100ms
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}
```

## 3. Animation Specifications

### 3.1 Line Clear Animation
- Duration: 300ms total
- Phase 1 (0-150ms): Cleared rows flash white (alternate between white fill and original colors at ~60ms intervals, creating a 2-3 flash strobe effect)
- Phase 2 (150-300ms): Cleared rows collapse - cells in cleared rows shrink vertically to 0 height, rows above slide down to fill the gap
- During animation: No new piece spawns, input is still processed for the current piece (but there is no current piece during clear)

### 3.2 Piece Lock Flash
- When a piece locks: brief white flash (50ms) on the locked cells, then return to normal color
- Implemented by drawing white-tinted blocks for 3 frames after locking

### 3.3 Game Over Animation
- After top-out: fill the board from bottom to top with gray blocks, one row every 50ms (total ~1 second for 20 rows)
- After the fill completes, display the game-over text overlay

### 3.4 Title Screen Animations
- "НАЖМИТЕ ENTER" text blinks: `opacity` alternates between 0 and 1 with a 1-second period (CSS `@keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }`)
- Stars can subtly pulse (scale 1.0 to 1.1 and back, 2-second period)

## 4. Screen State Details

### 4.1 Title Screen
```
Background: --color-bg with diagonal line pattern

     ★ ★ ★ ★ ★

       ТЕТРИС          <- large, red, glowing text-shadow
        TETRIS          <- smaller, gold, below

   ━━━━━━━━━━━━━━━     <- decorative line

   УРОВЕНЬ:  < 5 >     <- level selector, arrows highlight on hover
   LEVEL

   ━━━━━━━━━━━━━━━

   НАЖМИТЕ ENTER        <- blinking
   PRESS ENTER

     ★ ★ ★ ★ ★
```

### 4.2 Pause Overlay
- Semi-transparent black overlay: `rgba(0, 0, 0, 0.7)` covering the playfield
- "ПАУЗА" centered in large gold text
- "PRESS P TO CONTINUE" below in smaller text

### 4.3 Game Over Overlay
- After the fill-from-bottom animation completes
- Semi-transparent dark red overlay: `rgba(139, 26, 26, 0.8)` covering the playfield
- "КОНЕЦ ИГРЫ" (GAME OVER) in large text
- "ОЧКИ: {score}" showing final score
- "ENTER - НОВАЯ ИГРА" (ENTER - NEW GAME) blinking

## 5. UI Element Details

### 5.1 Score Panel (right side)

```
┌─────────────────┐
│    ★ ОЧКИ ★     │   <- "SCORE"
│    0001250      │   <- 7-digit zero-padded
│                 │
│   УРОВЕНЬ       │   <- "LEVEL"
│      03         │
│                 │
│    ЛИНИИ        │   <- "LINES"
│     032         │
│                 │
│  ━━━━━━━━━━━━   │
│                 │
│  СЛЕДУЮЩАЯ:     │   <- "NEXT:"
│  ┌──────────┐   │
│  │          │   │
│  │  [next]  │   │   <- 4x4 preview grid
│  │          │   │
│  └──────────┘   │
│                 │
│  ━━━━━━━━━━━━   │
│                 │
│   М - ЗВУК     │   <- "M - SOUND"
│   P - ПАУЗА    │   <- "P - PAUSE"
└─────────────────┘
```

The score panel uses HTML/CSS, not canvas. It updates via `textContent` changes. The next-piece preview is a separate small `<canvas>` element.

### 5.2 Responsive Behavior

At viewport widths below 768px:
- The layout switches to a single column (playfield stacked above score panel)
- CELL_SIZE reduces to fit the viewport width: `Math.floor((viewportWidth - 40) / BOARD_WIDTH)`
- Score panel becomes a compact horizontal bar
- Next piece preview shrinks proportionally
- Decorative side panels are hidden

At viewport widths above 1200px:
- Decorative side panels appear (filled with stars and constructivist patterns)
- Generous padding around the playfield
