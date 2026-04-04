'use strict';

Tetris.Renderer = (function() {
  const C = Tetris.Constants;

  let canvas, ctx;
  let nextCanvas, nextCtx;
  let scoreDisplay, levelDisplay, linesDisplay;
  let cellSize = C.CELL_SIZE;

  /**
   * Initialize the renderer
   * @param {HTMLCanvasElement} canvasEl - Main playfield canvas
   * @param {object} uiElements - DOM element references
   */
  function init(canvasEl, uiElements) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');

    nextCanvas = uiElements.nextPieceCanvas;
    nextCtx = nextCanvas.getContext('2d');

    scoreDisplay = uiElements.scoreDisplay;
    levelDisplay = uiElements.levelDisplay;
    linesDisplay = uiElements.linesDisplay;

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', resizeCanvas);
    }
  }

  /**
   * Resize canvas to fit viewport while maintaining aspect ratio
   */
  function resizeCanvas() {
    const isMobile = window.innerWidth < 768;
    const header = document.querySelector('.game-header');
    const scorePanel = document.querySelector('.score-panel');
    const touchControls = document.querySelector('.touch-controls');

    // Measure actual heights of surrounding elements
    let usedHeight = 40; // padding + margins buffer
    if (header) usedHeight += header.offsetHeight;
    if (isMobile && scorePanel) usedHeight += scorePanel.offsetHeight;
    if (touchControls) usedHeight += touchControls.offsetHeight;

    // Use visualViewport for accurate mobile measurement
    const viewportHeight = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;

    const maxHeight = viewportHeight - usedHeight;
    const maxWidth = isMobile
      ? window.innerWidth - 24
      : (window.innerWidth - 260) * 0.6;

    const ratioW = maxWidth / C.BOARD_WIDTH;
    const ratioH = maxHeight / C.VISIBLE_HEIGHT;
    cellSize = Math.floor(Math.min(ratioW, ratioH, C.CELL_SIZE));
    cellSize = Math.max(cellSize, 14); // minimum size

    canvas.width = C.BOARD_WIDTH * cellSize;
    canvas.height = C.VISIBLE_HEIGHT * cellSize;

    // Resize next piece canvas proportionally
    const nextCellSize = Math.floor(cellSize * 0.8);
    nextCanvas.width = 4 * nextCellSize;
    nextCanvas.height = 4 * nextCellSize;
  }

  /**
   * Draw a single beveled block
   * @param {CanvasRenderingContext2D} context - Canvas context
   * @param {number} x - Pixel X
   * @param {number} y - Pixel Y
   * @param {number} size - Cell size in pixels
   * @param {object} colors - { main, light, dark }
   */
  function drawBlock(context, x, y, size, colors) {
    const bevel = Math.max(2, Math.floor(size / 15));

    // Dark (shadow) - fill entire cell
    context.fillStyle = colors.dark;
    context.fillRect(x, y, size, size);

    // Light (highlight) - top-left area
    context.fillStyle = colors.light;
    context.fillRect(x, y, size - bevel, size - bevel);

    // Main fill - center
    context.fillStyle = colors.main;
    context.fillRect(x + bevel, y + bevel, size - bevel * 2, size - bevel * 2);
  }

  /**
   * Draw the board grid (locked blocks only)
   * @param {Array} grid - The board grid
   */
  function drawBoard(grid) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#1a1a0e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw subtle grid lines
    ctx.strokeStyle = 'rgba(60, 60, 40, 0.3)';
    ctx.lineWidth = 0.5;
    for (let col = 1; col < C.BOARD_WIDTH; col++) {
      ctx.beginPath();
      ctx.moveTo(col * cellSize, 0);
      ctx.lineTo(col * cellSize, canvas.height);
      ctx.stroke();
    }
    for (let row = 1; row < C.VISIBLE_HEIGHT; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * cellSize);
      ctx.lineTo(canvas.width, row * cellSize);
      ctx.stroke();
    }

    // Draw locked blocks (skip hidden buffer rows 0-1)
    for (let row = 2; row < C.BOARD_HEIGHT; row++) {
      for (let col = 0; col < C.BOARD_WIDTH; col++) {
        const cellValue = grid[row][col];
        if (cellValue !== 0) {
          const colors = C.PIECE_COLORS[cellValue];
          const drawX = col * cellSize;
          const drawY = (row - 2) * cellSize;
          drawBlock(ctx, drawX, drawY, cellSize, colors);
        }
      }
    }
  }

  /**
   * Draw the active falling piece
   * @param {object} piece - The current piece
   */
  function drawPiece(piece) {
    const colors = C.PIECE_COLORS[piece.type];
    const shape = piece.shape;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (shape[row][col] !== 0) {
          const drawRow = piece.y + row - 2; // offset for hidden rows
          const drawCol = piece.x + col;

          if (drawRow >= 0 && drawRow < C.VISIBLE_HEIGHT) {
            drawBlock(ctx, drawCol * cellSize, drawRow * cellSize, cellSize, colors);
          }
        }
      }
    }
  }

  /**
   * Draw the ghost piece (translucent preview of where piece will land)
   * @param {object} piece - The current piece
   * @param {Array} grid - The board grid
   */
  function drawGhostPiece(piece, grid) {
    const ghostY = Tetris.Board.getGhostY(grid, piece);
    const shape = piece.shape;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (shape[row][col] !== 0) {
          const drawRow = ghostY + row - 2;
          const drawCol = piece.x + col;

          if (drawRow >= 0 && drawRow < C.VISIBLE_HEIGHT) {
            const x = drawCol * cellSize;
            const y = drawRow * cellSize;

            ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

            ctx.fillStyle = 'rgba(200, 200, 200, 0.1)';
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          }
        }
      }
    }
  }

  /**
   * Draw the next piece preview
   * @param {object} piece - The next piece
   */
  function drawNextPiece(piece) {
    const size = Math.floor(nextCanvas.width / 4);
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

    // Background
    nextCtx.fillStyle = '#1a1a0e';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!piece) return;

    const colors = C.PIECE_COLORS[piece.type];
    const shape = Tetris.Pieces.SHAPES[piece.type][0]; // Always show spawn rotation

    // Center the piece in the preview
    let minCol = 4, maxCol = 0, minRow = 4, maxRow = 0;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (shape[row][col] !== 0) {
          minCol = Math.min(minCol, col);
          maxCol = Math.max(maxCol, col);
          minRow = Math.min(minRow, row);
          maxRow = Math.max(maxRow, row);
        }
      }
    }
    const pieceW = maxCol - minCol + 1;
    const pieceH = maxRow - minRow + 1;
    const offsetX = Math.floor((4 - pieceW) / 2) - minCol;
    const offsetY = Math.floor((4 - pieceH) / 2) - minRow;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (shape[row][col] !== 0) {
          drawBlock(nextCtx, (col + offsetX) * size, (row + offsetY) * size, size, colors);
        }
      }
    }
  }

  /**
   * Update the score display
   * @param {object} scoreState - The scoring state
   */
  function updateScore(scoreState) {
    scoreDisplay.textContent = String(scoreState.score).padStart(7, '0');
    levelDisplay.textContent = String(scoreState.level).padStart(2, '0');
    linesDisplay.textContent = String(scoreState.lines).padStart(3, '0');
  }

  /**
   * Draw line clear animation
   * @param {Array} grid - The board grid
   * @param {Array} rowIndices - Indices of cleared rows
   * @param {number} progress - Animation progress 0.0 to 1.0
   * @returns {boolean} True if animation should continue
   */
  function drawLineClearAnimation(grid, rowIndices, progress) {
    // Draw the board first
    drawBoard(grid);

    if (progress < 0.5) {
      // Phase 1: Flash white
      const flashOn = Math.floor(progress * 10) % 2 === 0;
      for (const rowIdx of rowIndices) {
        const drawRow = rowIdx - 2;
        if (drawRow >= 0) {
          if (flashOn) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          } else {
            ctx.fillStyle = 'rgba(200, 180, 120, 0.4)';
          }
          ctx.fillRect(0, drawRow * cellSize, canvas.width, cellSize);
        }
      }
    } else {
      // Phase 2: Collapse - shrink cleared rows
      const collapseProgress = (progress - 0.5) * 2; // 0 to 1
      for (const rowIdx of rowIndices) {
        const drawRow = rowIdx - 2;
        if (drawRow >= 0) {
          const shrinkHeight = cellSize * (1 - collapseProgress);
          ctx.fillStyle = '#1a1a0e';
          ctx.fillRect(0, drawRow * cellSize, canvas.width, cellSize);
          if (shrinkHeight > 0) {
            ctx.fillStyle = 'rgba(200, 180, 120, 0.3)';
            ctx.fillRect(0, drawRow * cellSize + (cellSize - shrinkHeight) / 2, canvas.width, shrinkHeight);
          }
        }
      }
    }

    return progress < 1.0;
  }

  /**
   * Draw game over fill animation (gray blocks from bottom to top)
   * @param {number} rowsFilled - Number of rows filled so far
   */
  function drawGameOverFill(rowsFilled) {
    const grayColor = { main: '#555555', light: '#777777', dark: '#333333' };
    for (let i = 0; i < rowsFilled && i < C.VISIBLE_HEIGHT; i++) {
      const row = C.VISIBLE_HEIGHT - 1 - i;
      for (let col = 0; col < C.BOARD_WIDTH; col++) {
        drawBlock(ctx, col * cellSize, row * cellSize, cellSize, grayColor);
      }
    }
  }

  /**
   * Draw lock flash effect on recently locked cells
   * @param {object} piece - The locked piece
   */
  function drawLockFlash(piece) {
    const shape = piece.shape;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (shape[row][col] !== 0) {
          const drawRow = piece.y + row - 2;
          const drawCol = piece.x + col;
          if (drawRow >= 0 && drawRow < C.VISIBLE_HEIGHT) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(drawCol * cellSize, drawRow * cellSize, cellSize, cellSize);
          }
        }
      }
    }
  }

  return {
    init,
    drawBoard,
    drawPiece,
    drawGhostPiece,
    drawNextPiece,
    updateScore,
    drawLineClearAnimation,
    drawGameOverFill,
    drawLockFlash,
    resizeCanvas
  };
})();
