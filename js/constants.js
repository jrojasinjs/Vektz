'use strict';

const Tetris = {};

Tetris.Constants = (function() {
  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 22; // 20 visible + 2 hidden buffer rows
  const VISIBLE_HEIGHT = 20;
  const CELL_SIZE = 30;

  const PIECE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

  // Piece colors - muted CRT-like tones (matching CSS variables)
  const PIECE_COLORS = {
    1: { main: '#5b8c8c', light: '#7ababa', dark: '#3a6a6a' }, // I - teal
    2: { main: '#b8a83e', light: '#d4c85a', dark: '#8a7a28' }, // O - gold
    3: { main: '#8b5e8b', light: '#a87aa8', dark: '#6a3e6a' }, // T - purple
    4: { main: '#5b8b4e', light: '#7ab86a', dark: '#3a6a30' }, // S - green
    5: { main: '#b84040', light: '#d45858', dark: '#8a2828' }, // Z - red
    6: { main: '#4a6a8b', light: '#6a8ab8', dark: '#2a4a6a' }, // J - blue
    7: { main: '#b87840', light: '#d49858', dark: '#8a5828' }, // L - orange
  };

  // Gravity: milliseconds per drop at each level
  const DROP_INTERVALS = [
    800, 717, 633, 550, 467, 383, 300, 217, 133, 100, // 0-9
    83, 83, 83,    // 10-12
    67, 67, 67,    // 13-15
    50, 50, 50,    // 16-18
    33, 33, 33, 33, 33, 33, 33, 33, 33, 33, // 19-28
    17             // 29+
  ];

  const POINTS = {
    SINGLE: 100,
    DOUBLE: 300,
    TRIPLE: 500,
    TETRIS: 800,
    SOFT_DROP: 1,
    HARD_DROP: 2
  };

  const DAS_DELAY = 170;
  const ARR_DELAY = 50;
  const LOCK_DELAY = 500;
  const MAX_LOCK_RESETS = 15;
  const LINES_PER_LEVEL = 10;

  const GAME_STATES = {
    TITLE: 'title',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameover'
  };

  const LINE_CLEAR_DURATION = 300;

  return {
    BOARD_WIDTH,
    BOARD_HEIGHT,
    VISIBLE_HEIGHT,
    CELL_SIZE,
    PIECE_NAMES,
    PIECE_COLORS,
    DROP_INTERVALS,
    POINTS,
    DAS_DELAY,
    ARR_DELAY,
    LOCK_DELAY,
    MAX_LOCK_RESETS,
    LINES_PER_LEVEL,
    GAME_STATES,
    LINE_CLEAR_DURATION
  };
})();
