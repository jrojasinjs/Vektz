'use strict';

Tetris.Board = (function() {
  const C = Tetris.Constants;

  /**
   * Create a new empty grid
   * @returns {Array} 2D array (BOARD_HEIGHT x BOARD_WIDTH) filled with 0s
   */
  function create() {
    const grid = [];
    for (let row = 0; row < C.BOARD_HEIGHT; row++) {
      grid.push(new Array(C.BOARD_WIDTH).fill(0));
    }
    return grid;
  }

  /**
   * Check if a piece at a given offset is in a valid position
   * @param {Array} grid - The board grid
   * @param {object} piece - The piece to check
   * @param {number} offsetX - X offset from piece's current position
   * @param {number} offsetY - Y offset from piece's current position
   * @returns {boolean} True if position is valid
   */
  function isValidPosition(grid, piece, offsetX, offsetY) {
    const shape = piece.shape;
    const newX = piece.x + offsetX;
    const newY = piece.y + offsetY;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (shape[row][col] !== 0) {
          const boardX = newX + col;
          const boardY = newY + row;

          // Check bounds
          if (boardX < 0 || boardX >= C.BOARD_WIDTH || boardY >= C.BOARD_HEIGHT) {
            return false;
          }
          // Allow above the board (y < 0)
          if (boardY < 0) {
            continue;
          }
          // Check collision with locked blocks
          if (grid[boardY][boardX] !== 0) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Check if a piece with a specific shape at a position is valid
   * @param {Array} grid - The board grid
   * @param {Array} shape - The shape grid to test
   * @param {number} x - Board X position
   * @param {number} y - Board Y position
   * @returns {boolean} True if position is valid
   */
  function isValidPositionWithShape(grid, shape, x, y) {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (shape[row][col] !== 0) {
          const boardX = x + col;
          const boardY = y + row;

          if (boardX < 0 || boardX >= C.BOARD_WIDTH || boardY >= C.BOARD_HEIGHT) {
            return false;
          }
          if (boardY < 0) {
            continue;
          }
          if (grid[boardY][boardX] !== 0) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Lock a piece into the grid
   * @param {Array} grid - The board grid
   * @param {object} piece - The piece to lock
   * @returns {Array} The modified grid
   */
  function lockPiece(grid, piece) {
    const shape = piece.shape;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (shape[row][col] !== 0) {
          const boardX = piece.x + col;
          const boardY = piece.y + row;
          if (boardY >= 0 && boardY < C.BOARD_HEIGHT && boardX >= 0 && boardX < C.BOARD_WIDTH) {
            grid[boardY][boardX] = shape[row][col];
          }
        }
      }
    }
    return grid;
  }

  /**
   * Clear completed lines from the grid
   * @param {Array} grid - The board grid
   * @returns {object} { grid, linesCleared, clearedRowIndices }
   */
  function clearLines(grid) {
    const clearedRowIndices = [];

    // Find completed rows
    for (let row = 0; row < C.BOARD_HEIGHT; row++) {
      if (grid[row].every(cell => cell !== 0)) {
        clearedRowIndices.push(row);
      }
    }

    if (clearedRowIndices.length === 0) {
      return { grid, linesCleared: 0, clearedRowIndices: [] };
    }

    // Remove cleared rows and add empty rows at the top
    const newGrid = grid.filter((_, index) => !clearedRowIndices.includes(index));
    while (newGrid.length < C.BOARD_HEIGHT) {
      newGrid.unshift(new Array(C.BOARD_WIDTH).fill(0));
    }

    return {
      grid: newGrid,
      linesCleared: clearedRowIndices.length,
      clearedRowIndices
    };
  }

  /**
   * Check if the game is over (blocks in hidden buffer rows)
   * @param {Array} grid - The board grid
   * @returns {boolean} True if any cell in rows 0-1 is occupied
   */
  function isTopOut(grid) {
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < C.BOARD_WIDTH; col++) {
        if (grid[row][col] !== 0) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get the ghost piece Y position (how far down the piece would drop)
   * @param {Array} grid - The board grid
   * @param {object} piece - The current piece
   * @returns {number} The Y position where the piece would land
   */
  function getGhostY(grid, piece) {
    let ghostY = 0;
    while (isValidPosition(grid, piece, 0, ghostY + 1)) {
      ghostY++;
    }
    return piece.y + ghostY;
  }

  return {
    create,
    isValidPosition,
    isValidPositionWithShape,
    lockPiece,
    clearLines,
    isTopOut,
    getGhostY
  };
})();
