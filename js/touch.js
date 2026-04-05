'use strict';

Tetris.Touch = (function() {
  const C = Tetris.Constants;

  let actionCallback = null;

  // Touch button state tracking
  const active = {};
  const dasTimers = {};
  const arrTimers = {};

  // Actions that support DAS/ARR (hold to repeat)
  const DAS_ACTIONS = ['moveLeft', 'moveRight'];

  // Button definitions: [action, label, group, slot]
  // slot positions within a 2x2 grid per side: tl, tr, bl, br
  // Using solid-fill glyphs for maximum clarity at small sizes
  const BUTTONS = [
    ['hardDrop',  '\u2BEF',  'left',  'tl'], // ⯯
    ['pause',     '\u23F8',  'left',  'tr'], // ⏸
    ['moveLeft',  '\u25C0',  'left',  'bl'], // ◀
    ['rotateCCW', '\u21BA',  'left',  'br'], // ↺
    ['pause',     '\u23F8',  'right', 'tl'], // ⏸
    ['hardDrop',  '\u2BEF',  'right', 'tr'], // ⯯
    ['rotateCW',  '\u21BB',  'right', 'bl'], // ↻
    ['moveRight', '\u25B6',  'right', 'br']  // ▶
  ];

  /**
   * Initialize touch controls
   * @param {function} callback - Called with action name strings
   */
  function init(callback) {
    actionCallback = callback;
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

    // Central LCD display panel (decorative, matches reference image)
    const lcd = document.createElement('div');
    lcd.className = 'touch-controls__lcd';
    lcd.innerHTML = '<div class="touch-controls__lcd-screen"></div>';

    for (const [action, label, group, slot] of BUTTONS) {
      const btn = document.createElement('div');
      btn.className = 'touch-controls__btn touch-controls__btn--' + slot;
      btn.setAttribute('data-action', action);
      btn.textContent = label;

      btn.addEventListener('touchstart', onTouchStart, { passive: false });
      btn.addEventListener('touchend', onTouchEnd, { passive: false });
      btn.addEventListener('touchcancel', onTouchEnd, { passive: false });
      // Mouse support for desktop preview / click-to-play
      btn.addEventListener('mousedown', onTouchStart);
      btn.addEventListener('mouseup', onTouchEnd);
      btn.addEventListener('mouseleave', onTouchEnd);
      btn.addEventListener('contextmenu', function(e) { e.preventDefault(); });

      if (group === 'left') {
        leftGroup.appendChild(btn);
      } else {
        rightGroup.appendChild(btn);
      }
    }

    container.appendChild(leftGroup);
    container.appendChild(lcd);
    container.appendChild(rightGroup);

    // Insert inside game-container so controls participate in flex layout
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.appendChild(container);
      gameContainer.classList.add('has-touch-controls');
    } else {
      document.body.appendChild(container);
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
