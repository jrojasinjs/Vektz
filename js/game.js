'use strict';

Tetris.Game = (function() {
  const C = Tetris.Constants;
  const Board = Tetris.Board;
  const Pieces = Tetris.Pieces;
  const Scoring = Tetris.Scoring;
  const Renderer = Tetris.Renderer;
  const Input = Tetris.Input;
  const Sound = Tetris.Sound;

  // Game state
  let state = C.GAME_STATES.TITLE;
  let grid = null;
  let currentPiece = null;
  let nextPiece = null;
  let scoreState = null;
  let dropAccumulator = 0;
  let lockAccumulator = 0;
  let isPieceLocking = false;
  let lockResets = 0;
  let bag = [];
  let startLevel = 0;
  let soundInitialized = false;

  // Line clear animation state
  let lineClearAnim = null; // { rowIndices, elapsed, grid }

  // Game over animation state
  let gameOverAnim = null; // { rowsFilled, elapsed }

  // Lock flash state
  let lockFlash = null; // { piece, framesLeft }

  // Previous frame timestamp
  let lastTime = 0;

  /**
   * Initialize the game - called on page load
   */
  function init() {
    const canvas = document.getElementById('game-canvas');
    const uiElements = {
      scoreDisplay: document.getElementById('score-display'),
      levelDisplay: document.getElementById('level-display'),
      linesDisplay: document.getElementById('lines-display'),
      nextPieceCanvas: document.getElementById('next-canvas')
    };

    Renderer.init(canvas, uiElements);
    Input.init(handleAction);
    if (Tetris.Touch) {
      Tetris.Touch.init(handleAction);
    }

    // Show title screen
    showOverlay('title');

    // Start the game loop
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  /**
   * Main game loop
   */
  function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    switch (state) {
      case C.GAME_STATES.PLAYING:
        updatePlaying(deltaTime);
        break;
      case C.GAME_STATES.GAME_OVER:
        updateGameOver(deltaTime);
        break;
      // TITLE and PAUSED just wait for input
    }

    requestAnimationFrame(gameLoop);
  }

  /**
   * Update during gameplay
   */
  function updatePlaying(deltaTime) {
    // Update input (DAS/ARR)
    Input.update(deltaTime);
    if (Tetris.Touch) {
      Tetris.Touch.update(deltaTime);
    }

    // Line clear animation in progress
    if (lineClearAnim) {
      lineClearAnim.elapsed += deltaTime;
      const progress = Math.min(lineClearAnim.elapsed / C.LINE_CLEAR_DURATION, 1.0);
      Renderer.drawLineClearAnimation(lineClearAnim.grid, lineClearAnim.rowIndices, progress);

      if (progress >= 1.0) {
        // Animation done - apply the cleared grid and spawn next piece
        const result = Board.clearLines(lineClearAnim.grid);
        grid = result.grid;

        const prevLevel = scoreState.level;
        scoreState = Scoring.addLineClear(scoreState, result.linesCleared);
        Renderer.updateScore(scoreState);

        if (scoreState.level > prevLevel) {
          Sound.play('levelUp');
        }

        lineClearAnim = null;
        spawnPiece();
      }
      return;
    }

    // Game over animation
    if (gameOverAnim) {
      return; // handled in updateGameOver
    }

    if (!currentPiece) return;

    // Gravity
    dropAccumulator += deltaTime;
    const dropInterval = Scoring.getDropInterval(scoreState.level);

    if (dropAccumulator >= dropInterval) {
      dropAccumulator -= dropInterval;
      if (Board.isValidPosition(grid, currentPiece, 0, 1)) {
        currentPiece.y++;
        isPieceLocking = false;
        lockAccumulator = 0;
      }
    }

    // Lock delay
    if (!Board.isValidPosition(grid, currentPiece, 0, 1)) {
      if (!isPieceLocking) {
        isPieceLocking = true;
        lockAccumulator = 0;
      }
      lockAccumulator += deltaTime;
      if (lockAccumulator >= C.LOCK_DELAY) {
        lockCurrentPiece();
        return;
      }
    } else {
      isPieceLocking = false;
      lockAccumulator = 0;
    }

    // Render
    Renderer.drawBoard(grid);
    Renderer.drawPiece(currentPiece);

    // Lock flash
    if (lockFlash) {
      Renderer.drawLockFlash(lockFlash.piece);
      lockFlash.framesLeft--;
      if (lockFlash.framesLeft <= 0) {
        lockFlash = null;
      }
    }
  }

  /**
   * Update during game over animation
   */
  function updateGameOver(deltaTime) {
    if (!gameOverAnim) return;

    gameOverAnim.elapsed += deltaTime;
    const rowsFilled = Math.floor(gameOverAnim.elapsed / 50);

    if (rowsFilled > C.VISIBLE_HEIGHT) {
      // Animation complete - show game over overlay
      gameOverAnim = null;
      document.getElementById('final-score').textContent = String(scoreState.score);
      showOverlay('gameover');
      return;
    }

    Renderer.drawBoard(grid);
    Renderer.drawGameOverFill(rowsFilled);
  }

  /**
   * Handle player actions from input module
   */
  function handleAction(action) {
    // Initialize sound on first user interaction
    if (!soundInitialized) {
      Sound.init();
      soundInitialized = true;
    }

    switch (action) {
      case 'start':
        if (state === C.GAME_STATES.TITLE || state === C.GAME_STATES.GAME_OVER) {
          startGame(startLevel);
        }
        break;

      case 'pause':
        if (state === C.GAME_STATES.PLAYING) {
          pause();
        } else if (state === C.GAME_STATES.PAUSED) {
          resume();
        }
        break;

      case 'toggleSound':
        const soundOn = Sound.toggle();
        if (!soundOn && state === C.GAME_STATES.PLAYING) {
          Sound.stopMusic();
        } else if (soundOn && state === C.GAME_STATES.PLAYING) {
          Sound.startMusic();
        }
        updateSongDisplay();
        break;

      case 'nextSong':
        if (state === C.GAME_STATES.PLAYING || state === C.GAME_STATES.TITLE) {
          const songName = Sound.nextSong();
          updateSongDisplay();
        }
        break;

      case 'moveLeft':
        if (state === C.GAME_STATES.TITLE) {
          // Level selector
          startLevel = Math.max(0, startLevel - 1);
          document.getElementById('start-level').textContent = startLevel;
          Sound.play('move');
        } else if (state === C.GAME_STATES.PLAYING && currentPiece && !lineClearAnim) {
          movePiece(-1, 0);
        }
        break;

      case 'moveRight':
        if (state === C.GAME_STATES.TITLE) {
          startLevel = Math.min(9, startLevel + 1);
          document.getElementById('start-level').textContent = startLevel;
          Sound.play('move');
        } else if (state === C.GAME_STATES.PLAYING && currentPiece && !lineClearAnim) {
          movePiece(1, 0);
        }
        break;

      case 'softDrop':
        if (state === C.GAME_STATES.PLAYING && currentPiece && !lineClearAnim) {
          softDrop();
        }
        break;

      case 'hardDrop':
        if (state === C.GAME_STATES.PLAYING && currentPiece && !lineClearAnim) {
          hardDrop();
        }
        break;

      case 'rotateCW':
        if (state === C.GAME_STATES.PLAYING && currentPiece && !lineClearAnim) {
          rotatePiece(1);
        }
        break;

      case 'rotateCCW':
        if (state === C.GAME_STATES.PLAYING && currentPiece && !lineClearAnim) {
          rotatePiece(-1);
        }
        break;
    }
  }

  /**
   * Start a new game
   */
  function startGame(level) {
    state = C.GAME_STATES.PLAYING;
    grid = Board.create();
    scoreState = Scoring.create(level);
    bag = [];
    dropAccumulator = 0;
    lockAccumulator = 0;
    isPieceLocking = false;
    lockResets = 0;
    lineClearAnim = null;
    gameOverAnim = null;
    lockFlash = null;

    hideAllOverlays();
    Renderer.updateScore(scoreState);

    // Spawn first pieces
    nextPiece = Pieces.createPiece(drawFromBag());
    spawnPiece();

    // Start background music
    Sound.startMusic();
  }

  /**
   * Pause the game
   */
  function pause() {
    state = C.GAME_STATES.PAUSED;
    Input.reset();
    if (Tetris.Touch) {
      Tetris.Touch.reset();
    }
    Sound.stopMusic();
    showOverlay('pause');
  }

  /**
   * Resume from pause
   */
  function resume() {
    state = C.GAME_STATES.PLAYING;
    lastTime = performance.now();
    hideAllOverlays();
    Sound.startMusic();
  }

  /**
   * Trigger game over
   */
  function triggerGameOver() {
    state = C.GAME_STATES.GAME_OVER;
    Input.reset();
    if (Tetris.Touch) {
      Tetris.Touch.reset();
    }
    Sound.stopMusic();
    Sound.play('gameOver');
    gameOverAnim = { rowsFilled: 0, elapsed: 0 };
  }

  // --- Piece Movement ---

  function movePiece(dx, dy) {
    if (Board.isValidPosition(grid, currentPiece, dx, dy)) {
      currentPiece.x += dx;
      currentPiece.y += dy;
      Sound.play('move');
      resetLockDelay();
      return true;
    }
    return false;
  }

  function softDrop() {
    if (Board.isValidPosition(grid, currentPiece, 0, 1)) {
      currentPiece.y++;
      scoreState = Scoring.addSoftDrop(scoreState, 1);
      Renderer.updateScore(scoreState);
      Sound.play('softDrop');
      dropAccumulator = 0;
    }
  }

  function hardDrop() {
    let cellsDropped = 0;
    while (Board.isValidPosition(grid, currentPiece, 0, 1)) {
      currentPiece.y++;
      cellsDropped++;
    }
    if (cellsDropped > 0) {
      scoreState = Scoring.addHardDrop(scoreState, cellsDropped);
      Renderer.updateScore(scoreState);
    }
    Sound.play('hardDrop');
    lockCurrentPiece();
  }

  function rotatePiece(direction) {
    // O-piece doesn't rotate
    if (currentPiece.type === 2) return;

    const newShape = Pieces.getRotatedShape(currentPiece, direction);
    const newRotation = Pieces.getNewRotation(currentPiece, direction);
    const kicks = Pieces.getKickOffsets(currentPiece);

    for (const [dx, dy] of kicks) {
      if (Board.isValidPositionWithShape(grid, newShape, currentPiece.x + dx, currentPiece.y + dy)) {
        currentPiece.shape = newShape;
        currentPiece.rotation = newRotation;
        currentPiece.x += dx;
        currentPiece.y += dy;
        Sound.play('rotate');
        resetLockDelay();
        return;
      }
    }
    // All kicks failed - rotation rejected
  }

  function resetLockDelay() {
    if (isPieceLocking && lockResets < C.MAX_LOCK_RESETS) {
      lockAccumulator = 0;
      lockResets++;
    }
  }

  // --- Piece Locking & Spawning ---

  function lockCurrentPiece() {
    Board.lockPiece(grid, currentPiece);
    Sound.play('lock');

    // Lock flash effect
    lockFlash = { piece: { ...currentPiece, shape: [...currentPiece.shape] }, framesLeft: 3 };

    // Check for line clears
    let hasClears = false;
    for (let row = 0; row < C.BOARD_HEIGHT; row++) {
      if (grid[row].every(cell => cell !== 0)) {
        hasClears = true;
        break;
      }
    }

    if (hasClears) {
      // Find cleared rows for animation
      const clearedRowIndices = [];
      for (let row = 0; row < C.BOARD_HEIGHT; row++) {
        if (grid[row].every(cell => cell !== 0)) {
          clearedRowIndices.push(row);
        }
      }

      if (clearedRowIndices.length === 4) {
        Sound.play('tetris');
      } else {
        Sound.play('lineClear');
      }

      // Start line clear animation (grid is not modified yet)
      lineClearAnim = {
        rowIndices: clearedRowIndices,
        elapsed: 0,
        grid: grid.map(row => [...row]) // snapshot
      };
      currentPiece = null;
    } else {
      // No line clears - check for top out and spawn next
      if (Board.isTopOut(grid)) {
        triggerGameOver();
        return;
      }
      spawnPiece();
    }
  }

  function spawnPiece() {
    currentPiece = nextPiece;
    nextPiece = Pieces.createPiece(drawFromBag());
    dropAccumulator = 0;
    lockAccumulator = 0;
    isPieceLocking = false;
    lockResets = 0;

    Renderer.drawNextPiece(nextPiece);

    // Check if spawn position is valid
    if (!Board.isValidPosition(grid, currentPiece, 0, 0)) {
      // Try moving up one row
      if (Board.isValidPosition(grid, currentPiece, 0, -1)) {
        currentPiece.y--;
      } else {
        triggerGameOver();
      }
    }
  }

  // --- 7-Bag Randomizer ---

  function drawFromBag() {
    if (bag.length === 0) {
      // Refill with all 7 piece types, shuffled
      bag = [1, 2, 3, 4, 5, 6, 7];
      shuffleBag();
    }
    return bag.pop();
  }

  function shuffleBag() {
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }

  // --- Song Display ---

  function updateSongDisplay() {
    const el = document.getElementById('song-display');
    if (el) {
      el.textContent = Sound.getCurrentSongName();
    }
  }

  function initSongSelector() {
    const prevBtn = document.getElementById('song-prev');
    const nextBtn = document.getElementById('song-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        if (!soundInitialized) { Sound.init(); soundInitialized = true; }
        Sound.prevSong();
        updateSongDisplay();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        if (!soundInitialized) { Sound.init(); soundInitialized = true; }
        Sound.nextSong();
        updateSongDisplay();
      });
    }

    // Update display when song changes automatically (cyclic playback)
    Sound.onSongChange(function() {
      updateSongDisplay();
    });
  }

  // --- Overlay Management ---

  function showOverlay(name) {
    hideAllOverlays();
    document.getElementById(name + '-overlay').classList.remove('hidden');
  }

  function hideAllOverlays() {
    document.getElementById('title-overlay').classList.add('hidden');
    document.getElementById('pause-overlay').classList.add('hidden');
    document.getElementById('gameover-overlay').classList.add('hidden');
  }

  // --- Decorations ---

  function initDecorations() {
    const leftPanel = document.getElementById('deco-left');
    const rightPanel = document.getElementById('deco-right');
    if (leftPanel && Tetris.Decorations) {
      Tetris.Decorations.initDecoPanel(leftPanel);
    }
    if (rightPanel && Tetris.Decorations) {
      Tetris.Decorations.initDecoPanel(rightPanel);
    }
  }

  // --- Initialize on page load ---
  document.addEventListener('DOMContentLoaded', function() {
    init();
    initDecorations();
    initSongSelector();
    updateSongDisplay();
  });

  return {
    init,
    start: startGame,
    pause,
    resume
  };
})();
