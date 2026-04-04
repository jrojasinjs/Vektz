'use strict';

Tetris.Input = (function() {
  const C = Tetris.Constants;

  let actionCallback = null;

  // Key state tracking
  const keys = {};
  const dasTimers = {};
  const arrTimers = {};

  // Keys that support DAS/ARR
  const DAS_KEYS = ['moveLeft', 'moveRight', 'softDrop'];

  // Key-to-action mapping
  const KEY_MAP = {
    'ArrowLeft': 'moveLeft',
    'a': 'moveLeft',
    'A': 'moveLeft',
    'ArrowRight': 'moveRight',
    'd': 'moveRight',
    'D': 'moveRight',
    'ArrowDown': 'softDrop',
    's': 'softDrop',
    'S': 'softDrop',
    ' ': 'hardDrop',
    'ArrowUp': 'rotateCW',
    'w': 'rotateCW',
    'W': 'rotateCW',
    'z': 'rotateCCW',
    'Z': 'rotateCCW',
    'p': 'pause',
    'P': 'pause',
    'Escape': 'pause',
    'Enter': 'start',
    'm': 'toggleSound',
    'M': 'toggleSound',
    'n': 'nextSong',
    'N': 'nextSong'
  };

  /**
   * Initialize input handling
   * @param {function} callback - Called with action name strings
   */
  function init(callback) {
    actionCallback = callback;

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
  }

  /**
   * Handle keydown events
   */
  function onKeyDown(e) {
    const action = KEY_MAP[e.key];
    if (!action) return;

    // Prevent default browser behavior for game keys
    e.preventDefault();

    // Ignore key repeats from the browser's own repeat
    if (keys[action]) return;

    keys[action] = true;

    // Fire action immediately on press
    if (actionCallback) {
      actionCallback(action);
    }

    // Start DAS timer for supported keys
    if (DAS_KEYS.includes(action)) {
      dasTimers[action] = C.DAS_DELAY;
      arrTimers[action] = 0;
    }
  }

  /**
   * Handle keyup events
   */
  function onKeyUp(e) {
    const action = KEY_MAP[e.key];
    if (!action) return;

    keys[action] = false;
    delete dasTimers[action];
    delete arrTimers[action];
  }

  /**
   * Update DAS/ARR timers - called each frame
   * @param {number} deltaTime - Time since last frame in ms
   */
  function update(deltaTime) {
    for (const action of DAS_KEYS) {
      if (!keys[action]) continue;

      if (dasTimers[action] > 0) {
        // Still in DAS delay phase
        dasTimers[action] -= deltaTime;
        if (dasTimers[action] <= 0) {
          // DAS delay expired, fire and start ARR
          if (actionCallback) {
            actionCallback(action);
          }
          arrTimers[action] = C.ARR_DELAY;
        }
      } else {
        // In ARR phase
        arrTimers[action] -= deltaTime;
        if (arrTimers[action] <= 0) {
          if (actionCallback) {
            actionCallback(action);
          }
          arrTimers[action] += C.ARR_DELAY;
        }
      }
    }
  }

  /**
   * Reset all key states
   */
  function reset() {
    for (const key in keys) {
      keys[key] = false;
    }
    for (const key in dasTimers) {
      delete dasTimers[key];
    }
    for (const key in arrTimers) {
      delete arrTimers[key];
    }
  }

  return {
    init,
    update,
    reset
  };
})();
