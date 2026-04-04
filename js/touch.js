'use strict';

Tetris.Touch = (function() {
  const C = Tetris.Constants;

  let actionCallback = null;
  let isTouchDevice = false;

  // Touch button state tracking
  const active = {};
  const dasTimers = {};
  const arrTimers = {};

  // Actions that support DAS/ARR (hold to repeat)
  const DAS_ACTIONS = ['moveLeft', 'moveRight', 'softDrop'];

  // Button definitions: [action, label, group]
  const BUTTONS = [
    ['moveLeft',  '\u25C0', 'left'],
    ['softDrop',  '\u25BC', 'left'],
    ['moveRight', '\u25B6', 'left'],
    ['rotateCCW', '\u21BA', 'right'],
    ['rotateCW',  '\u21BB', 'right'],
    ['hardDrop',  '\u2B07', 'right']
  ];

  /**
   * Initialize touch controls
   * @param {function} callback - Called with action name strings
   */
  function init(callback) {
    actionCallback = callback;
    isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    if (!isTouchDevice) return;

    createControls();
    bindOverlayTaps();
    preventDefaults();
  }

  /**
   * Create on-screen touch button controls
   */
  function createControls() {
    const container = document.createElement('div');
    container.className = 'touch-controls';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'touch-controls__group touch-controls__group--left';

    const rightGroup = document.createElement('div');
    rightGroup.className = 'touch-controls__group touch-controls__group--right';

    for (const [action, label, group] of BUTTONS) {
      const btn = document.createElement('div');
      btn.className = 'touch-controls__btn';
      if (action === 'rotateCW') {
        btn.classList.add('touch-controls__btn--primary');
      }
      btn.setAttribute('data-action', action);
      btn.textContent = label;

      btn.addEventListener('touchstart', onTouchStart, { passive: false });
      btn.addEventListener('touchend', onTouchEnd, { passive: false });
      btn.addEventListener('touchcancel', onTouchEnd, { passive: false });

      if (group === 'left') {
        leftGroup.appendChild(btn);
      } else {
        rightGroup.appendChild(btn);
      }
    }

    container.appendChild(leftGroup);
    container.appendChild(rightGroup);
    document.body.appendChild(container);

    // Signal CSS that touch controls are present
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.classList.add('has-touch-controls');
    }
  }

  /**
   * Make existing overlays tappable
   */
  function bindOverlayTaps() {
    const titleOverlay = document.getElementById('title-overlay');
    const pauseOverlay = document.getElementById('pause-overlay');
    const gameoverOverlay = document.getElementById('gameover-overlay');

    if (titleOverlay) {
      titleOverlay.addEventListener('touchstart', function(e) {
        // Allow taps on level select arrows to pass through
        const text = e.target.textContent || '';
        if (text.includes('\u25C4') || text.includes('\u25B6')) return;
        e.preventDefault();
        if (actionCallback) actionCallback('start');
      }, { passive: false });
    }

    if (pauseOverlay) {
      pauseOverlay.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (actionCallback) actionCallback('pause');
      }, { passive: false });
    }

    if (gameoverOverlay) {
      gameoverOverlay.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (actionCallback) actionCallback('start');
      }, { passive: false });
    }
  }

  /**
   * Prevent scroll, zoom, and pull-to-refresh during gameplay
   */
  function preventDefaults() {
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.style.touchAction = 'none';
    }

    document.addEventListener('touchmove', function(e) {
      if (e.target.closest('.touch-controls') || e.target.closest('.game-container')) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  /**
   * Handle touch start on a button
   */
  function onTouchStart(e) {
    e.preventDefault();
    const action = e.currentTarget.getAttribute('data-action');
    if (!action || active[action]) return;

    active[action] = true;
    e.currentTarget.classList.add('touch-controls__btn--pressed');

    // Fire action immediately
    if (actionCallback) {
      actionCallback(action);
    }

    // Start DAS timer for repeatable actions
    if (DAS_ACTIONS.includes(action)) {
      dasTimers[action] = C.DAS_DELAY;
      arrTimers[action] = 0;
    }
  }

  /**
   * Handle touch end / cancel on a button
   */
  function onTouchEnd(e) {
    e.preventDefault();
    const action = e.currentTarget.getAttribute('data-action');
    if (!action) return;

    active[action] = false;
    e.currentTarget.classList.remove('touch-controls__btn--pressed');
    delete dasTimers[action];
    delete arrTimers[action];
  }

  /**
   * Update DAS/ARR timers - called each frame
   * @param {number} deltaTime - Time since last frame in ms
   */
  function update(deltaTime) {
    if (!isTouchDevice) return;

    for (const action of DAS_ACTIONS) {
      if (!active[action]) continue;

      if (dasTimers[action] > 0) {
        dasTimers[action] -= deltaTime;
        if (dasTimers[action] <= 0) {
          if (actionCallback) {
            actionCallback(action);
          }
          arrTimers[action] = C.ARR_DELAY;
        }
      } else {
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
   * Reset all touch states
   */
  function reset() {
    for (const action in active) {
      active[action] = false;
    }
    for (const action in dasTimers) {
      delete dasTimers[action];
    }
    for (const action in arrTimers) {
      delete arrTimers[action];
    }
    // Remove pressed visual state from all buttons
    const buttons = document.querySelectorAll('.touch-controls__btn--pressed');
    for (const btn of buttons) {
      btn.classList.remove('touch-controls__btn--pressed');
    }
  }

  return {
    init,
    update,
    reset
  };
})();
