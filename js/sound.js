'use strict';

Tetris.Sound = (function() {
  let audioCtx = null;
  let masterGain = null;
  let musicGain = null;
  let enabled = true;
  let initialized = false;
  let musicPlaying = false;
  let musicScheduledUntil = 0;
  let musicTimerId = null;
  let musicNodes = []; // track active music oscillators for cleanup

  /**
   * Initialize the audio context (must be called on user gesture)
   */
  function init() {
    if (initialized) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(audioCtx.destination);

      musicGain = audioCtx.createGain();
      musicGain.gain.value = 0.15;
      musicGain.connect(audioCtx.destination);

      initialized = true;
    } catch (e) {
      enabled = false;
    }
  }

  /**
   * Play a named sound effect
   * @param {string} effectName - Name of the effect
   */
  function play(effectName) {
    if (!enabled || !initialized || !audioCtx) return;

    // Resume context if suspended (browser policy)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const effects = {
      move: playMove,
      rotate: playRotate,
      softDrop: playSoftDrop,
      hardDrop: playHardDrop,
      lock: playLock,
      lineClear: playLineClear,
      tetris: playTetris,
      levelUp: playLevelUp,
      gameOver: playGameOver
    };

    if (effects[effectName]) {
      effects[effectName]();
    }
  }

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

  function playRotate() {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(400, now + 0.06);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.06);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  function playSoftDrop() {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.03);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  function playHardDrop() {
    const now = audioCtx.currentTime;
    // White noise via buffer
    const bufferSize = Math.floor(audioCtx.sampleRate * 0.1);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(now);
    source.stop(now + 0.1);
  }

  function playLock() {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.08);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  function playLineClear() {
    const now = audioCtx.currentTime;
    // Note 1: 440 Hz
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(440, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.setValueAtTime(0.25, now + 0.08);
    gain1.gain.linearRampToValueAtTime(0, now + 0.09);
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.09);

    // Note 2: 660 Hz
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(660, now + 0.08);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.25, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0, now + 0.2);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.2);
  }

  function playTetris() {
    const now = audioCtx.currentTime;
    const notes = [523, 659, 784, 1047];
    const durations = [0.08, 0.08, 0.08, 0.16];
    let offset = 0;

    for (let i = 0; i < notes.length; i++) {
      const osc = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'square';
      osc2.type = 'sawtooth';
      osc.frequency.setValueAtTime(notes[i], now + offset);
      osc2.frequency.setValueAtTime(notes[i], now + offset);

      gain.gain.setValueAtTime(0.15, now + offset);
      gain.gain.linearRampToValueAtTime(0, now + offset + durations[i]);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);

      osc.start(now + offset);
      osc.stop(now + offset + durations[i]);
      osc2.start(now + offset);
      osc2.stop(now + offset + durations[i]);

      offset += durations[i];
    }
  }

  function playLevelUp() {
    const now = audioCtx.currentTime;
    const notes = [
      { freq: 523, start: 0, dur: 0.1 },
      { freq: 784, start: 0.13, dur: 0.1 },
      { freq: 1047, start: 0.26, dur: 0.2 }
    ];

    for (const note of notes) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.freq, now + note.start);
      gain.gain.setValueAtTime(0.25, now + note.start);
      gain.gain.linearRampToValueAtTime(0, now + note.start + note.dur);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + note.start);
      osc.stop(now + note.start + note.dur);
    }
  }

  function playGameOver() {
    const now = audioCtx.currentTime;
    const notes = [
      { freq: 330, start: 0, dur: 0.2 },
      { freq: 262, start: 0.2, dur: 0.2 },
      { freq: 220, start: 0.4, dur: 0.2 },
      { freq: 175, start: 0.6, dur: 0.4 }
    ];

    for (const note of notes) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.freq, now + note.start);
      gain.gain.setValueAtTime(0.25, now + note.start);
      gain.gain.linearRampToValueAtTime(0, now + note.start + note.dur);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + note.start);
      osc.stop(now + note.start + note.dur);
    }
  }

  // =====================================================
  //  MUSIC SYSTEM - Multiple Soviet/Russian songs
  //  N key cycles between songs during gameplay
  // =====================================================

  let currentSongIndex = 0;

  /**
   * Calculate total duration of a note sequence
   */
  function sequenceDuration(notes) {
    return notes.reduce((sum, n) => sum + n[1], 0);
  }

  /**
   * Build a song object from melody/bass arrays and BPM
   */
  function buildSong(name, bpm, melodyNotes, bassNotes, melodyWave, bassWave) {
    return {
      name,
      melody: melodyNotes,
      bass: bassNotes,
      duration: sequenceDuration(melodyNotes),
      melodyWave: melodyWave || 'square',
      bassWave: bassWave || 'triangle'
    };
  }

  // --- Note duration helpers (recalculated per song BPM) ---
  function nd(bpm) {
    const beat = 60 / bpm;
    return {
      S: beat / 4,       // sixteenth
      E: beat / 2,       // eighth
      Q: beat,           // quarter
      DQ: beat * 1.5,    // dotted quarter
      H: beat * 2,       // half
      DH: beat * 3,      // dotted half
      W: beat * 4        // whole
    };
  }

  // ─── SONG 1: Korobeiniki (Коробейники) — Game Boy Tetris Type A ───
  function buildKorobeiniki() {
    const d = nd(140);

    // Section A — authentic rhythm with dotted-quarter B4
    // E5 B4 C5 | D5 C5 B4 | A4 A4 C5 | E5 D5 C5 | B4.. C5 | D5 E5 | C5 A4 | A4---
    const melA = [
      [659, d.Q], [494, d.E], [523, d.E], [587, d.Q], [523, d.E], [494, d.E],
      [440, d.Q], [440, d.E], [523, d.E], [659, d.Q], [587, d.E], [523, d.E],
      [494, d.DQ], [523, d.E], [587, d.Q], [659, d.Q],
      [523, d.Q], [440, d.Q], [440, d.H],
    ];

    // Section B — contrasting theme
    // D5.. F5 | A5 G5 F5 | E5.. C5 | E5 D5 C5 | B4.. C5 | D5 E5 | C5 A4 | A4---
    const melB = [
      [587, d.DQ], [698, d.E], [880, d.Q], [784, d.E], [698, d.E],
      [659, d.DQ], [523, d.E], [659, d.Q], [587, d.E], [523, d.E],
      [494, d.DQ], [523, d.E], [587, d.Q], [659, d.Q],
      [523, d.Q], [440, d.Q], [440, d.H],
    ];

    // Bass — harmonic root motion (Am-Dm / Am-Em / Am-E)
    const bassA = [
      [165, d.H], [175, d.H],
      [220, d.H], [131, d.H],
      [165, d.H], [147, d.H],
      [131, d.Q], [220, d.Q], [220, d.H],
    ];
    const bassB = [
      [147, d.H], [175, d.H],
      [131, d.H], [165, d.H],
      [165, d.H], [147, d.H],
      [131, d.Q], [220, d.Q], [220, d.H],
    ];

    // Classic arrangement: A A B A A B A B
    const melody = [...melA, ...melA, ...melB, ...melA, ...melA, ...melB, ...melA, ...melB];
    const bass = [...bassA, ...bassA, ...bassB, ...bassA, ...bassA, ...bassB, ...bassA, ...bassB];

    return buildSong('KOROBEINIKI', 140, melody, bass);
  }

  // ─── SONG 2: Kalinka (Калинка) ───
  function buildKalinka() {
    const d = nd(138);

    // Chorus — "Kalinka, kalinka, kalinka moya!"
    // Fast, repetitive eighth-note pattern building energy
    const chorus = [
      [659, d.E], [659, d.E], [659, d.E], [659, d.E], [587, d.E], [659, d.E], [698, d.E], [659, d.E],
      [587, d.Q], [494, d.Q], [440, d.Q], [0, d.Q],
      [659, d.E], [659, d.E], [659, d.E], [659, d.E], [587, d.E], [659, d.E], [698, d.E], [659, d.E],
      [587, d.Q], [494, d.Q], [440, d.Q], [0, d.Q],
    ];

    // Verse — "Pod sosnoyu, pod zelenoyu..." (legato, lyrical)
    const verse = [
      [440, d.Q], [494, d.Q], [523, d.DQ], [587, d.E],
      [659, d.H], [587, d.Q], [523, d.Q],
      [494, d.Q], [440, d.Q], [392, d.Q], [440, d.Q],
      [494, d.H], [0, d.H],
      [494, d.Q], [523, d.Q], [587, d.DQ], [659, d.E],
      [698, d.H], [659, d.Q], [587, d.Q],
      [523, d.Q], [494, d.Q], [440, d.Q], [494, d.Q],
      [440, d.H], [0, d.H],
    ];

    // Accelerando — cascading descent before chorus return
    const accel = [
      [659, d.E], [659, d.E], [698, d.E], [659, d.E], [587, d.E], [523, d.E], [494, d.E], [440, d.E],
      [494, d.E], [523, d.E], [587, d.E], [659, d.E], [698, d.E], [659, d.E], [587, d.E], [523, d.E],
      [659, d.Q], [587, d.Q], [523, d.Q], [494, d.Q],
      [440, d.H], [0, d.H],
    ];

    // Bass with more rhythmic drive
    const bassCh = [
      [220, d.Q], [131, d.Q], [220, d.Q], [131, d.Q],
      [147, d.Q], [147, d.Q], [220, d.Q], [0, d.Q],
      [220, d.Q], [131, d.Q], [220, d.Q], [131, d.Q],
      [147, d.Q], [147, d.Q], [220, d.Q], [0, d.Q],
    ];
    const bassVe = [
      [220, d.H], [220, d.H],
      [165, d.H], [131, d.H],
      [147, d.H], [196, d.H],
      [165, d.H], [165, d.H],
      [147, d.H], [147, d.H],
      [175, d.H], [175, d.H],
      [131, d.H], [147, d.H],
      [220, d.H], [220, d.H],
    ];
    const bassAc = [
      [220, d.H], [220, d.H],
      [165, d.H], [175, d.H],
      [220, d.H], [131, d.H],
      [220, d.H], [220, d.H],
    ];

    const melody = [...chorus, ...verse, ...chorus, ...accel, ...chorus];
    const bass = [...bassCh, ...bassVe, ...bassCh, ...bassAc, ...bassCh];

    return buildSong('KALINKA', 138, melody, bass);
  }

  // ─── SONG 3: Katyusha (Катюша) ───
  function buildKatyusha() {
    const d = nd(120);

    // Verse 1: "Расцветали яблони и груши, поплыли туманы над рекой"
    // Characteristic ascending stepwise C-D-E-F with dotted-quarter sustain
    const verse1 = [
      [523, d.Q], [587, d.E], [659, d.E], [698, d.DQ], [659, d.E],
      [587, d.Q], [523, d.E], [587, d.E], [659, d.H],
      [440, d.Q], [494, d.E], [523, d.E], [587, d.DQ], [523, d.E],
      [494, d.H], [0, d.H],
    ];

    // Verse 2: "Выходила на берег Катюша, на высокий берег на крутой"
    // Same ascending motif, resolving downward to A
    const verse2 = [
      [523, d.Q], [587, d.E], [659, d.E], [698, d.DQ], [659, d.E],
      [587, d.Q], [523, d.Q], [494, d.Q], [440, d.Q],
      [392, d.Q], [440, d.E], [494, d.E], [523, d.DQ], [494, d.E],
      [440, d.H], [0, d.H],
    ];

    // Chorus: "Ой ты, песня, песенка девичья, ты лети за ясным солнцем вслед"
    const chorus = [
      [659, d.Q], [587, d.Q], [523, d.Q], [587, d.Q],
      [659, d.H], [587, d.H],
      [523, d.Q], [494, d.Q], [440, d.Q], [494, d.Q],
      [523, d.H], [0, d.H],
      [587, d.Q], [659, d.Q], [587, d.Q], [523, d.Q],
      [494, d.Q], [440, d.Q], [392, d.Q], [440, d.Q],
      [494, d.Q], [440, d.Q], [440, d.H],
      [0, d.H], [0, d.H],
    ];

    // Bass — root motion following harmonic progression
    const bass1 = [
      [131, d.H], [175, d.H],
      [147, d.H], [131, d.H],
      [220, d.H], [147, d.H],
      [165, d.H], [165, d.H],
    ];
    const bass2 = [
      [131, d.H], [175, d.H],
      [147, d.H], [220, d.H],
      [196, d.H], [131, d.H],
      [220, d.H], [220, d.H],
    ];
    const bassCh = [
      [131, d.H], [147, d.H],
      [165, d.H], [147, d.H],
      [131, d.H], [147, d.H],
      [131, d.H], [131, d.H],
      [147, d.H], [131, d.H],
      [147, d.H], [220, d.H],
      [165, d.Q], [220, d.Q], [220, d.H],
      [220, d.H], [220, d.H],
    ];

    const melody = [...verse1, ...verse2, ...chorus, ...verse1, ...verse2, ...chorus];
    const bass = [...bass1, ...bass2, ...bassCh, ...bass1, ...bass2, ...bassCh];

    return buildSong('KATYUSHA', 120, melody, bass, 'square', 'triangle');
  }

  // ─── SONG 4: Dark Eyes (Очи чёрные) ───
  function buildDarkEyes() {
    const d = nd(108);

    // Verse: "Очи чёрные, очи страстные, очи жгучие и прекрасные"
    // Descending minor-key melody with waltz-like phrasing
    const verse = [
      [659, d.DQ], [587, d.E], [523, d.Q], [494, d.Q],
      [440, d.H], [523, d.Q], [494, d.Q],
      [440, d.DQ], [494, d.E], [523, d.Q], [587, d.Q],
      [659, d.H], [0, d.H],
      [587, d.DQ], [523, d.E], [494, d.Q], [440, d.Q],
      [392, d.Q], [440, d.Q], [494, d.Q], [523, d.Q],
      [494, d.Q], [440, d.Q], [415, d.Q], [440, d.Q],
      [440, d.H], [0, d.H],
    ];

    // Passionate section: "Как люблю я вас, как боюсь я вас"
    // Rising intensity with higher register
    const passion = [
      [659, d.Q], [698, d.Q], [659, d.Q], [587, d.Q],
      [523, d.H], [587, d.Q], [659, d.Q],
      [587, d.DQ], [523, d.E], [494, d.Q], [440, d.Q],
      [494, d.H], [0, d.H],
      [523, d.DQ], [494, d.E], [440, d.Q], [392, d.Q],
      [440, d.Q], [494, d.Q], [523, d.Q], [587, d.Q],
      [494, d.Q], [440, d.Q], [415, d.Q], [440, d.Q],
      [440, d.H], [0, d.H],
    ];

    // Bass — waltz root motion (Am-Dm-E7-Am)
    const bassV = [
      [165, d.H], [131, d.H],
      [220, d.H], [220, d.H],
      [220, d.H], [165, d.H],
      [131, d.H], [131, d.H],
      [147, d.H], [220, d.H],
      [196, d.H], [131, d.H],
      [165, d.H], [165, d.H],
      [220, d.H], [220, d.H],
    ];
    const bassPa = [
      [131, d.H], [175, d.H],
      [131, d.H], [131, d.H],
      [147, d.H], [220, d.H],
      [165, d.H], [165, d.H],
      [131, d.H], [196, d.H],
      [220, d.H], [147, d.H],
      [165, d.H], [165, d.H],
      [220, d.H], [220, d.H],
    ];

    const melody = [...verse, ...passion, ...verse];
    const bass = [...bassV, ...bassPa, ...bassV];

    return buildSong('DARK EYES', 108, melody, bass, 'sawtooth', 'triangle');
  }

  // Build all songs
  const SONGS = [
    buildKorobeiniki(),
    buildKalinka(),
    buildKatyusha(),
    buildDarkEyes()
  ];

  // ─── Generic music scheduler ───

  /**
   * Schedule one loop of the current song
   */
  function scheduleSongLoop(startTime) {
    const song = SONGS[currentSongIndex];
    let time = startTime;

    // Melody voice
    for (const [freq, dur] of song.melody) {
      if (freq > 0) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = song.melodyWave;
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.22, time + 0.02);
        gain.gain.setValueAtTime(0.22, time + dur - 0.03);
        gain.gain.linearRampToValueAtTime(0, time + dur);

        osc.connect(gain);
        gain.connect(musicGain);
        osc.start(time);
        osc.stop(time + dur);
        musicNodes.push(osc);
      }
      time += dur;
    }

    // Bass voice
    time = startTime;
    for (const [freq, dur] of song.bass) {
      if (freq > 0) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = song.bassWave;
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.18, time + 0.02);
        gain.gain.setValueAtTime(0.18, time + dur - 0.05);
        gain.gain.linearRampToValueAtTime(0, time + dur);

        osc.connect(gain);
        gain.connect(musicGain);
        osc.start(time);
        osc.stop(time + dur);
        musicNodes.push(osc);
      }
      time += dur;
    }
  }

  /**
   * Continuously schedule music ahead of time
   */
  function scheduleMusicAhead() {
    if (!musicPlaying || !audioCtx) return;

    const song = SONGS[currentSongIndex];
    const lookAhead = 2.0;
    while (musicScheduledUntil < audioCtx.currentTime + lookAhead) {
      scheduleSongLoop(musicScheduledUntil);
      musicScheduledUntil += song.duration;
    }

    musicTimerId = setTimeout(scheduleMusicAhead, 500);
  }

  /**
   * Start playing background music
   */
  function startMusic() {
    if (!initialized || !audioCtx || musicPlaying) return;
    musicPlaying = true;
    musicScheduledUntil = audioCtx.currentTime + 0.1;
    scheduleMusicAhead();
  }

  /**
   * Stop background music
   */
  function stopMusic() {
    musicPlaying = false;
    if (musicTimerId) {
      clearTimeout(musicTimerId);
      musicTimerId = null;
    }
    for (const node of musicNodes) {
      try { node.stop(); } catch (e) { /* already stopped */ }
    }
    musicNodes = [];
  }

  /**
   * Cycle to the next song. Stops current, switches, restarts.
   * @returns {string} Name of the new song
   */
  function nextSong() {
    const wasPlaying = musicPlaying;
    stopMusic();
    currentSongIndex = (currentSongIndex + 1) % SONGS.length;
    if (wasPlaying) {
      startMusic();
    }
    return SONGS[currentSongIndex].name;
  }

  /**
   * Get the current song name
   * @returns {string}
   */
  function getCurrentSongName() {
    return SONGS[currentSongIndex].name;
  }

  /**
   * Toggle sound on/off
   * @returns {boolean} New enabled state
   */
  function toggle() {
    enabled = !enabled;
    if (!enabled) {
      stopMusic();
    }
    return enabled;
  }

  /**
   * Set master volume
   * @param {number} level - Volume 0.0 to 1.0
   */
  function setVolume(level) {
    if (masterGain) {
      masterGain.gain.value = Math.max(0, Math.min(1, level));
    }
  }

  return {
    init,
    play,
    toggle,
    setVolume,
    startMusic,
    stopMusic,
    nextSong,
    getCurrentSongName
  };
})();
