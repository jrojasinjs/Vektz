'use strict';

Tetris.Scoring = (function() {
  const C = Tetris.Constants;

  const LINE_POINTS = {
    1: C.POINTS.SINGLE,
    2: C.POINTS.DOUBLE,
    3: C.POINTS.TRIPLE,
    4: C.POINTS.TETRIS
  };

  /**
   * Create a new scoring state
   * @param {number} startLevel - Starting level (0-9)
   * @returns {object} Scoring state
   */
  function create(startLevel) {
    return {
      score: 0,
      level: startLevel || 0,
      lines: 0,
      startLevel: startLevel || 0
    };
  }

  /**
   * Add points for clearing lines
   * @param {object} state - Current scoring state
   * @param {number} linesCleared - Number of lines cleared (1-4)
   * @returns {object} Updated scoring state
   */
  function addLineClear(state, linesCleared) {
    if (linesCleared < 1 || linesCleared > 4) return state;

    const points = LINE_POINTS[linesCleared] * (state.level + 1);
    const newLines = state.lines + linesCleared;
    const newLevel = Math.max(
      state.startLevel,
      Math.floor(newLines / C.LINES_PER_LEVEL) + state.startLevel
    );

    return {
      score: state.score + points,
      level: newLevel,
      lines: newLines,
      startLevel: state.startLevel
    };
  }

  /**
   * Add points for soft dropping
   * @param {object} state - Current scoring state
   * @param {number} cells - Number of cells dropped
   * @returns {object} Updated scoring state
   */
  function addSoftDrop(state, cells) {
    return {
      ...state,
      score: state.score + cells * C.POINTS.SOFT_DROP
    };
  }

  /**
   * Add points for hard dropping
   * @param {object} state - Current scoring state
   * @param {number} cells - Number of cells dropped
   * @returns {object} Updated scoring state
   */
  function addHardDrop(state, cells) {
    return {
      ...state,
      score: state.score + cells * C.POINTS.HARD_DROP
    };
  }

  /**
   * Get the drop interval in ms for a given level
   * @param {number} level - Current level
   * @returns {number} Milliseconds per drop
   */
  function getDropInterval(level) {
    const index = Math.min(level, C.DROP_INTERVALS.length - 1);
    return C.DROP_INTERVALS[index];
  }

  return {
    create,
    addLineClear,
    addSoftDrop,
    addHardDrop,
    getDropInterval
  };
})();
