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

  // Game Boy waveforms (created during init)
  let pulseWave12 = null;  // 12.5% duty
  let pulseWave25 = null;  // 25% duty
  let pulseWave50 = null;  // 50% duty
  let gbWaveChannel = null; // GB wave channel (quantized triangle)
  let noiseBuffer = null;   // pre-generated noise buffer for drums

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

      // Create Game Boy waveforms
      pulseWave12 = createPulseWave(0.125);
      pulseWave25 = createPulseWave(0.25);
      pulseWave50 = createPulseWave(0.50);
      gbWaveChannel = createGBWaveChannel();

      // Create shared noise buffer for percussion
      const bufferLength = audioCtx.sampleRate; // 1 second
      noiseBuffer = audioCtx.createBuffer(1, bufferLength, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferLength; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      initialized = true;
    } catch (e) {
      enabled = false;
    }
  }

  // ─── Game Boy Waveform Generators ───

  /**
   * Create a pulse wave with a specific duty cycle using Fourier coefficients
   * @param {number} dutyCycle - 0.125, 0.25, or 0.5
   * @returns {PeriodicWave}
   */
  function createPulseWave(dutyCycle) {
    const numHarmonics = 64;
    const real = new Float32Array(numHarmonics);
    const imag = new Float32Array(numHarmonics);
    for (let n = 1; n < numHarmonics; n++) {
      imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * dutyCycle);
    }
    return audioCtx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  /**
   * Create a Game Boy-style wave channel waveform (4-bit quantized triangle)
   * @returns {PeriodicWave}
   */
  function createGBWaveChannel() {
    const numHarmonics = 32;
    const real = new Float32Array(numHarmonics);
    const imag = new Float32Array(numHarmonics);
    // Quantized triangle: compute from 32 samples at 4-bit resolution
    const samples = 32;
    for (let n = 1; n < numHarmonics; n++) {
      let sum = 0;
      for (let k = 0; k < samples; k++) {
        const triVal = k < 16 ? k : (31 - k);
        const normalized = (triVal / 15) * 2 - 1;
        sum += normalized * Math.sin(2 * Math.PI * n * k / samples);
      }
      imag[n] = sum * (2 / samples);
    }
    return audioCtx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  /**
   * Resolve a waveform key to a PeriodicWave object
   * @param {string} key - 'pulse12', 'pulse25', 'pulse50', 'gbwave', or standard type
   * @returns {PeriodicWave|null}
   */
  function resolveWave(key) {
    const map = {
      'pulse12': pulseWave12,
      'pulse25': pulseWave25,
      'pulse50': pulseWave50,
      'gbwave': gbWaveChannel
    };
    return map[key] || null;
  }

  // ─── Drum Sound Schedulers ───

  /**
   * Schedule a kick drum hit (low noise burst + pitch-swept oscillator)
   */
  function scheduleKick(time) {
    // Pitched component: sine sweep from 150Hz to 50Hz
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.06);
    oscGain.gain.setValueAtTime(0.18, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.connect(oscGain);
    oscGain.connect(musicGain);
    osc.start(time);
    osc.stop(time + 0.08);
    musicNodes.push(osc);

    // Noise component: low-pass filtered
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    src.start(time);
    src.stop(time + 0.06);
    musicNodes.push(src);
  }

  /**
   * Schedule a snare drum hit (noise burst + tone)
   */
  function scheduleSnare(time) {
    // Tonal component
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    oscGain.gain.setValueAtTime(0.08, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(oscGain);
    oscGain.connect(musicGain);
    osc.start(time);
    osc.stop(time + 0.05);
    musicNodes.push(osc);

    // Noise component: band-pass filtered
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 1.0;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.10, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    src.start(time);
    src.stop(time + 0.08);
    musicNodes.push(src);
  }

  /**
   * Schedule a hi-hat hit (high-pass filtered noise, very short)
   */
  function scheduleHiHat(time) {
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    src.start(time);
    src.stop(time + 0.03);
    musicNodes.push(src);
  }

  // ─── Sound Effects ───

  /**
   * Play a named sound effect
   * @param {string} effectName - Name of the effect
   */
  function play(effectName) {
    if (!enabled || !initialized || !audioCtx) return;

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
  //  MUSIC SYSTEM — Game Boy-style 4 voice synthesis
  //  Pulse 1 (melody), Pulse 2 (harmony), Wave (bass), Noise (drums)
  // =====================================================

  let currentSongIndex = 0;

  /**
   * Calculate total duration of a note sequence
   */
  function sequenceDuration(notes) {
    return notes.reduce((sum, n) => sum + n[1], 0);
  }

  /**
   * Build a song object
   * @param {string} name
   * @param {number} bpm
   * @param {Array} melodyNotes - [freq, dur] pairs
   * @param {Array} bassNotes - [freq, dur] pairs
   * @param {string} melodyWave - waveform key
   * @param {string} bassWave - waveform key
   * @param {Array|null} harmonyNotes - optional [freq, dur] pairs
   * @param {Array|null} drumPattern - optional [type, dur] pairs (one measure, looped)
   */
  function buildSong(name, bpm, melodyNotes, bassNotes, melodyWave, bassWave, harmonyNotes, drumPattern) {
    return {
      name,
      bpm,
      melody: melodyNotes,
      bass: bassNotes,
      harmony: harmonyNotes || null,
      drums: drumPattern || null,
      duration: sequenceDuration(melodyNotes),
      melodyWave: melodyWave || 'pulse50',
      bassWave: bassWave || 'gbwave',
      harmonyWave: 'pulse25'
    };
  }

  // --- Note duration helpers ---
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

    // Section A melody — E5 B4 C5 | D5 C5 B4 | A4 A4 C5 | E5 D5 C5 | B4.. C5 | D5 E5 | C5 A4 | A4---
    const melA = [
      [659, d.Q], [494, d.E], [523, d.E], [587, d.Q], [523, d.E], [494, d.E],
      [440, d.Q], [440, d.E], [523, d.E], [659, d.Q], [587, d.E], [523, d.E],
      [494, d.DQ], [523, d.E], [587, d.Q], [659, d.Q],
      [523, d.Q], [440, d.Q], [440, d.H],
    ];

    // Section B melody
    const melB = [
      [587, d.DQ], [698, d.E], [880, d.Q], [784, d.E], [698, d.E],
      [659, d.DQ], [523, d.E], [659, d.Q], [587, d.E], [523, d.E],
      [494, d.DQ], [523, d.E], [587, d.Q], [659, d.Q],
      [523, d.Q], [440, d.Q], [440, d.H],
    ];

    // Section A harmony — thirds/sixths below melody
    const harmA = [
      [523, d.Q], [392, d.E], [440, d.E], [494, d.Q], [440, d.E], [392, d.E],
      [330, d.Q], [330, d.E], [440, d.E], [523, d.Q], [494, d.E], [440, d.E],
      [392, d.DQ], [440, d.E], [494, d.Q], [523, d.Q],
      [440, d.Q], [330, d.Q], [330, d.H],
    ];

    // Section B harmony
    const harmB = [
      [440, d.DQ], [523, d.E], [659, d.Q], [587, d.E], [523, d.E],
      [523, d.DQ], [440, d.E], [523, d.Q], [494, d.E], [440, d.E],
      [392, d.DQ], [440, d.E], [494, d.Q], [523, d.Q],
      [440, d.Q], [330, d.Q], [330, d.H],
    ];

    // Bass — harmonic root motion
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

    // Drum pattern — one measure (8 eighth notes), looped
    // KH=kick+hihat, H=hihat, SH=snare+hihat
    const drumPattern = [
      ['KH', d.E], ['H', d.E], ['SH', d.E], ['H', d.E],
      ['KH', d.E], ['H', d.E], ['SH', d.E], ['H', d.E],
    ];

    // Arrangement: A A B A A B A B
    const melody  = [...melA, ...melA, ...melB, ...melA, ...melA, ...melB, ...melA, ...melB];
    const bass    = [...bassA, ...bassA, ...bassB, ...bassA, ...bassA, ...bassB, ...bassA, ...bassB];
    const harmony = [...harmA, ...harmA, ...harmB, ...harmA, ...harmA, ...harmB, ...harmA, ...harmB];

    return buildSong('KOROBEINIKI', 140, melody, bass, 'pulse50', 'gbwave', harmony, drumPattern);
  }

  // ─── SONG 2: Kalinka (Калинка) ───
  function buildKalinka() {
    const d = nd(138);

    const chorus = [
      [659, d.E], [659, d.E], [659, d.E], [659, d.E], [587, d.E], [659, d.E], [698, d.E], [659, d.E],
      [587, d.Q], [494, d.Q], [440, d.Q], [0, d.Q],
      [659, d.E], [659, d.E], [659, d.E], [659, d.E], [587, d.E], [659, d.E], [698, d.E], [659, d.E],
      [587, d.Q], [494, d.Q], [440, d.Q], [0, d.Q],
    ];

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

    const accel = [
      [659, d.E], [659, d.E], [698, d.E], [659, d.E], [587, d.E], [523, d.E], [494, d.E], [440, d.E],
      [494, d.E], [523, d.E], [587, d.E], [659, d.E], [698, d.E], [659, d.E], [587, d.E], [523, d.E],
      [659, d.Q], [587, d.Q], [523, d.Q], [494, d.Q],
      [440, d.H], [0, d.H],
    ];

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

    return buildSong('KALINKA', 138, melody, bass, 'pulse50', 'gbwave');
  }

  // ─── SONG 3: Katyusha (Катюша) ───
  function buildKatyusha() {
    const d = nd(120);

    const verse1 = [
      [523, d.Q], [587, d.E], [659, d.E], [698, d.DQ], [659, d.E],
      [587, d.Q], [523, d.E], [587, d.E], [659, d.H],
      [440, d.Q], [494, d.E], [523, d.E], [587, d.DQ], [523, d.E],
      [494, d.H], [0, d.H],
    ];

    const verse2 = [
      [523, d.Q], [587, d.E], [659, d.E], [698, d.DQ], [659, d.E],
      [587, d.Q], [523, d.Q], [494, d.Q], [440, d.Q],
      [392, d.Q], [440, d.E], [494, d.E], [523, d.DQ], [494, d.E],
      [440, d.H], [0, d.H],
    ];

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

    return buildSong('KATYUSHA', 120, melody, bass, 'pulse50', 'gbwave');
  }

  // ─── SONG 4: Dark Eyes (Очи чёрные) ───
  function buildDarkEyes() {
    const d = nd(108);

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

    return buildSong('DARK EYES', 108, melody, bass, 'pulse25', 'gbwave');
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
   * Schedule a voice (melody, harmony, or bass) for one loop
   * @param {Array} notes - [freq, dur] pairs
   * @param {string} waveKey - waveform key or oscillator type
   * @param {number} gainLevel - peak gain level
   * @param {number} startTime - audioCtx time to begin
   * @param {boolean} isBass - use bass-style (hard) envelope
   */
  function scheduleVoice(notes, waveKey, gainLevel, startTime, isBass) {
    let time = startTime;
    const wave = resolveWave(waveKey);

    for (const [freq, dur] of notes) {
      if (freq > 0) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        if (wave) {
          osc.setPeriodicWave(wave);
        } else {
          osc.type = waveKey;
        }
        osc.frequency.setValueAtTime(freq, time);

        if (isBass) {
          // Bass: hard on/off, Game Boy wave channel style
          gain.gain.setValueAtTime(gainLevel, time);
          gain.gain.setValueAtTime(gainLevel, time + dur - 0.005);
          gain.gain.linearRampToValueAtTime(0, time + dur);
        } else {
          // Pulse: sharp attack, slight settle, clean cutoff
          gain.gain.setValueAtTime(gainLevel, time);
          gain.gain.setValueAtTime(gainLevel * 0.85, time + 0.005);
          gain.gain.setValueAtTime(gainLevel * 0.85, time + dur - 0.008);
          gain.gain.linearRampToValueAtTime(0, time + dur - 0.002);
          gain.gain.setValueAtTime(0, time + dur);
        }

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
   * Schedule drums for one loop of the song
   */
  function scheduleDrums(drumPattern, songDuration, startTime) {
    let drumTime = startTime;
    let drumIdx = 0;
    const songEnd = startTime + songDuration;

    while (drumTime < songEnd) {
      const [type, dur] = drumPattern[drumIdx % drumPattern.length];
      if (type.includes('K')) scheduleKick(drumTime);
      if (type.includes('S')) scheduleSnare(drumTime);
      if (type.includes('H')) scheduleHiHat(drumTime);
      drumTime += dur;
      drumIdx++;
    }
  }

  /**
   * Schedule one loop of the current song
   */
  function scheduleSongLoop(startTime) {
    const song = SONGS[currentSongIndex];

    // Pulse 1: Melody
    scheduleVoice(song.melody, song.melodyWave, 0.20, startTime, false);

    // Pulse 2: Harmony (if present)
    if (song.harmony) {
      scheduleVoice(song.harmony, song.harmonyWave, 0.12, startTime, false);
    }

    // Wave channel: Bass
    scheduleVoice(song.bass, song.bassWave, 0.16, startTime, true);

    // Noise channel: Drums (if present)
    if (song.drums) {
      scheduleDrums(song.drums, song.duration, startTime);
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
