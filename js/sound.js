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
  let musicNodes = [];

  // Game Boy waveforms (created during init)
  let pulseWave12 = null;
  let pulseWave25 = null;
  let pulseWave50 = null;
  let gbWaveChannel = null;
  let noiseBuffer = null;

  // Delay effect nodes
  let delayNode = null;
  let feedbackGain = null;
  let delayWetGain = null;

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
      musicGain.gain.value = 0.13;
      musicGain.connect(audioCtx.destination); // dry path

      // Delay/echo effect — parallel wet path
      delayNode = audioCtx.createDelay(1.0);
      delayNode.delayTime.value = 0.22;
      feedbackGain = audioCtx.createGain();
      feedbackGain.gain.value = 0.25;
      delayWetGain = audioCtx.createGain();
      delayWetGain.gain.value = 0.20;

      musicGain.connect(delayNode);          // send to delay
      delayNode.connect(feedbackGain);       // delay → feedback
      feedbackGain.connect(delayNode);       // feedback → delay (loop)
      delayNode.connect(delayWetGain);       // delay → wet mix
      delayWetGain.connect(audioCtx.destination); // wet → output

      // Create Game Boy waveforms
      pulseWave12 = createPulseWave(0.125);
      pulseWave25 = createPulseWave(0.25);
      pulseWave50 = createPulseWave(0.50);
      gbWaveChannel = createGBWaveChannel();

      // Create shared noise buffer for percussion
      const bufferLength = audioCtx.sampleRate;
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

  function createPulseWave(dutyCycle) {
    const numHarmonics = 64;
    const real = new Float32Array(numHarmonics);
    const imag = new Float32Array(numHarmonics);
    for (let n = 1; n < numHarmonics; n++) {
      imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * dutyCycle);
    }
    return audioCtx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  function createGBWaveChannel() {
    const numHarmonics = 32;
    const real = new Float32Array(numHarmonics);
    const imag = new Float32Array(numHarmonics);
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

  function scheduleKick(time) {
    // Main pitched component: sine sweep 200→40 Hz
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.07);
    oscGain.gain.setValueAtTime(0.18, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    osc.connect(oscGain);
    oscGain.connect(musicGain);
    osc.start(time);
    osc.stop(time + 0.09);
    musicNodes.push(osc);

    // Second harmonic for richness (2x freq)
    const osc2 = audioCtx.createOscillator();
    const osc2Gain = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(400, time);
    osc2.frequency.exponentialRampToValueAtTime(80, time + 0.07);
    osc2Gain.gain.setValueAtTime(0.06, time);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
    osc2.connect(osc2Gain);
    osc2Gain.connect(musicGain);
    osc2.start(time);
    osc2.stop(time + 0.07);
    musicNodes.push(osc2);

    // Noise component: low-pass filtered
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    src.start(time);
    src.stop(time + 0.07);
    musicNodes.push(src);
  }

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

    // Noise component: band-pass + high shelf for brightness
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 3000;
    bandpass.Q.value = 1.0;
    const highshelf = audioCtx.createBiquadFilter();
    highshelf.type = 'highshelf';
    highshelf.frequency.value = 5000;
    highshelf.gain.value = 4;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    src.connect(bandpass);
    bandpass.connect(highshelf);
    highshelf.connect(gain);
    gain.connect(musicGain);
    src.start(time);
    src.stop(time + 0.12);
    musicNodes.push(src);
  }

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

  function scheduleHiHatOpen(time) {
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    src.start(time);
    src.stop(time + 0.08);
    musicNodes.push(src);
  }

  // ─── Sound Effects ───

  function play(effectName) {
    if (!enabled || !initialized || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

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

    if (effects[effectName]) effects[effectName]();
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
  //  + delay/echo effect, vibrato, velocity variation
  // =====================================================

  let currentSongIndex = 0;

  function sequenceDuration(notes) {
    return notes.reduce((sum, n) => sum + n[1], 0);
  }

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

  function nd(bpm) {
    const beat = 60 / bpm;
    return {
      S: beat / 4,
      E: beat / 2,
      Q: beat,
      DQ: beat * 1.5,
      H: beat * 2,
      DH: beat * 3,
      W: beat * 4
    };
  }

  // ─── SONG 1: Korobeiniki (Коробейники) — Game Boy Tetris Type A ───
  function buildKorobeiniki() {
    const d = nd(140);

    const melA = [
      [659, d.Q], [494, d.E], [523, d.E], [587, d.Q], [523, d.E], [494, d.E],
      [440, d.Q], [440, d.E], [523, d.E], [659, d.Q], [587, d.E], [523, d.E],
      [494, d.DQ], [523, d.E], [587, d.Q], [659, d.Q],
      [523, d.Q], [440, d.Q], [440, d.H],
    ];

    const melB = [
      [587, d.DQ], [698, d.E], [880, d.Q], [784, d.E], [698, d.E],
      [659, d.DQ], [523, d.E], [659, d.Q], [587, d.E], [523, d.E],
      [494, d.DQ], [523, d.E], [587, d.Q], [659, d.Q],
      [523, d.Q], [440, d.Q], [440, d.H],
    ];

    const harmA = [
      [523, d.Q], [392, d.E], [440, d.E], [494, d.Q], [440, d.E], [392, d.E],
      [330, d.Q], [330, d.E], [440, d.E], [523, d.Q], [494, d.E], [440, d.E],
      [392, d.DQ], [440, d.E], [494, d.Q], [523, d.Q],
      [440, d.Q], [330, d.Q], [330, d.H],
    ];

    const harmB = [
      [440, d.DQ], [523, d.E], [659, d.Q], [587, d.E], [523, d.E],
      [523, d.DQ], [440, d.E], [523, d.Q], [494, d.E], [440, d.E],
      [392, d.DQ], [440, d.E], [494, d.Q], [523, d.Q],
      [440, d.Q], [330, d.Q], [330, d.H],
    ];

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

    const drumPattern = [
      ['KH', d.E], ['H', d.E], ['SH', d.E], ['H', d.E],
      ['KH', d.E], ['H', d.E], ['SH', d.E], ['H', d.E],
    ];

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

    // Chorus harmony — chord tones a third below
    const harmCh = [
      [523, d.E], [523, d.E], [523, d.E], [523, d.E], [494, d.E], [523, d.E], [587, d.E], [523, d.E],
      [494, d.Q], [392, d.Q], [330, d.Q], [0, d.Q],
      [523, d.E], [523, d.E], [523, d.E], [523, d.E], [494, d.E], [523, d.E], [587, d.E], [523, d.E],
      [494, d.Q], [392, d.Q], [330, d.Q], [0, d.Q],
    ];

    // Verse harmony — legato thirds below
    const harmVe = [
      [330, d.Q], [392, d.Q], [440, d.DQ], [494, d.E],
      [523, d.H], [494, d.Q], [440, d.Q],
      [392, d.Q], [330, d.Q], [330, d.Q], [330, d.Q],
      [392, d.H], [0, d.H],
      [392, d.Q], [440, d.Q], [494, d.DQ], [523, d.E],
      [587, d.H], [523, d.Q], [494, d.Q],
      [440, d.Q], [392, d.Q], [330, d.Q], [392, d.Q],
      [330, d.H], [0, d.H],
    ];

    // Accel harmony — parallel thirds
    const harmAc = [
      [523, d.E], [523, d.E], [587, d.E], [523, d.E], [494, d.E], [440, d.E], [392, d.E], [330, d.E],
      [392, d.E], [440, d.E], [494, d.E], [523, d.E], [587, d.E], [523, d.E], [494, d.E], [440, d.E],
      [523, d.Q], [494, d.Q], [440, d.Q], [392, d.Q],
      [330, d.H], [0, d.H],
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

    const drumPattern = [
      ['KH', d.E], ['H', d.E], ['SH', d.E], ['H', d.E],
      ['K', d.E], ['H', d.E], ['SH', d.E], ['H', d.E],
    ];

    const melody  = [...chorus, ...verse, ...chorus, ...accel, ...chorus];
    const bass    = [...bassCh, ...bassVe, ...bassCh, ...bassAc, ...bassCh];
    const harmony = [...harmCh, ...harmVe, ...harmCh, ...harmAc, ...harmCh];

    return buildSong('KALINKA', 138, melody, bass, 'pulse50', 'gbwave', harmony, drumPattern);
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

    // Verse 1 harmony — thirds below
    const harmV1 = [
      [440, d.Q], [494, d.E], [523, d.E], [587, d.DQ], [523, d.E],
      [494, d.Q], [440, d.E], [494, d.E], [523, d.H],
      [330, d.Q], [392, d.E], [440, d.E], [494, d.DQ], [440, d.E],
      [392, d.H], [0, d.H],
    ];

    // Verse 2 harmony — thirds below
    const harmV2 = [
      [440, d.Q], [494, d.E], [523, d.E], [587, d.DQ], [523, d.E],
      [494, d.Q], [440, d.Q], [392, d.Q], [330, d.Q],
      [330, d.Q], [330, d.E], [392, d.E], [440, d.DQ], [392, d.E],
      [330, d.H], [0, d.H],
    ];

    // Chorus harmony — sixths below
    const harmCh = [
      [440, d.Q], [392, d.Q], [330, d.Q], [392, d.Q],
      [440, d.H], [392, d.H],
      [330, d.Q], [330, d.Q], [330, d.Q], [392, d.Q],
      [440, d.H], [0, d.H],
      [494, d.Q], [523, d.Q], [494, d.Q], [440, d.Q],
      [392, d.Q], [330, d.Q], [330, d.Q], [330, d.Q],
      [392, d.Q], [330, d.Q], [330, d.H],
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

    // March-style drum pattern
    const drumPattern = [
      ['KH', d.E], ['H', d.E], ['SH', d.E], ['H', d.E],
      ['KH', d.E], ['H', d.E], ['SH', d.E], ['H', d.E],
    ];

    const melody  = [...verse1, ...verse2, ...chorus, ...verse1, ...verse2, ...chorus];
    const bass    = [...bass1, ...bass2, ...bassCh, ...bass1, ...bass2, ...bassCh];
    const harmony = [...harmV1, ...harmV2, ...harmCh, ...harmV1, ...harmV2, ...harmCh];

    return buildSong('KATYUSHA', 120, melody, bass, 'pulse50', 'gbwave', harmony, drumPattern);
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

    // Verse harmony — sixths and thirds
    const harmV = [
      [523, d.DQ], [494, d.E], [440, d.Q], [415, d.Q],
      [330, d.H], [440, d.Q], [392, d.Q],
      [330, d.DQ], [392, d.E], [440, d.Q], [494, d.Q],
      [523, d.H], [0, d.H],
      [494, d.DQ], [440, d.E], [392, d.Q], [330, d.Q],
      [330, d.Q], [330, d.Q], [392, d.Q], [440, d.Q],
      [392, d.Q], [330, d.Q], [330, d.Q], [330, d.Q],
      [330, d.H], [0, d.H],
    ];

    // Passion harmony — animated, following emotional contour
    const harmPa = [
      [523, d.Q], [587, d.Q], [523, d.Q], [494, d.Q],
      [440, d.H], [494, d.Q], [523, d.Q],
      [494, d.DQ], [440, d.E], [392, d.Q], [330, d.Q],
      [392, d.H], [0, d.H],
      [440, d.DQ], [392, d.E], [330, d.Q], [330, d.Q],
      [330, d.Q], [392, d.Q], [440, d.Q], [494, d.Q],
      [392, d.Q], [330, d.Q], [330, d.Q], [330, d.Q],
      [330, d.H], [0, d.H],
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

    // Slower, expressive drum pattern with open hi-hat
    const drumPattern = [
      ['KH', d.E], ['H', d.E], ['SH', d.E], ['H', d.E],
      ['K', d.E], ['O', d.E], ['SH', d.E], ['H', d.E],
    ];

    const melody  = [...verse, ...passion, ...verse];
    const bass    = [...bassV, ...bassPa, ...bassV];
    const harmony = [...harmV, ...harmPa, ...harmV];

    return buildSong('DARK EYES', 108, melody, bass, 'pulse25', 'gbwave', harmony, drumPattern);
  }

  // Build all songs
  const SONGS = [
    buildKorobeiniki(),
    buildKalinka(),
    buildKatyusha(),
    buildDarkEyes()
  ];

  // ─── Music scheduler ───

  /**
   * Schedule a voice with optional vibrato and velocity variation
   * @param {Array} notes - [freq, dur] pairs
   * @param {string} waveKey - waveform key or oscillator type
   * @param {number} gainLevel - peak gain level
   * @param {number} startTime - audioCtx time to begin
   * @param {boolean} isBass - use bass-style (hard) envelope
   * @param {boolean} useVibrato - add pitch vibrato to sustained notes
   */
  function scheduleVoice(notes, waveKey, gainLevel, startTime, isBass, useVibrato) {
    let time = startTime;
    const wave = resolveWave(waveKey);
    let noteIndex = 0;

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

        // Velocity variation: alternate strong/weak for musical accent
        const velocityMul = isBass ? 1.0 : (noteIndex % 2 === 0 ? 1.0 : 0.88);
        const effectiveGain = gainLevel * velocityMul;

        if (isBass) {
          gain.gain.setValueAtTime(effectiveGain, time);
          gain.gain.setValueAtTime(effectiveGain, time + dur - 0.005);
          gain.gain.linearRampToValueAtTime(0, time + dur);
        } else {
          gain.gain.setValueAtTime(effectiveGain, time);
          gain.gain.setValueAtTime(effectiveGain * 0.85, time + 0.005);
          gain.gain.setValueAtTime(effectiveGain * 0.85, time + dur - 0.008);
          gain.gain.linearRampToValueAtTime(0, time + dur - 0.002);
          gain.gain.setValueAtTime(0, time + dur);
        }

        osc.connect(gain);
        gain.connect(musicGain);
        osc.start(time);
        osc.stop(time + dur);
        musicNodes.push(osc);

        // Vibrato: LFO on sustained melody notes (>= ~0.3s)
        if (useVibrato && dur >= 0.28) {
          const lfo = audioCtx.createOscillator();
          const lfoGain = audioCtx.createGain();
          lfo.type = 'sine';
          lfo.frequency.setValueAtTime(5.5, time);
          // Gradual vibrato onset
          lfoGain.gain.setValueAtTime(0, time);
          lfoGain.gain.linearRampToValueAtTime(3.5, time + 0.08);
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start(time);
          lfo.stop(time + dur);
          musicNodes.push(lfo);
        }
      }
      time += dur;
      noteIndex++;
    }
  }

  /**
   * Schedule drums for one loop
   */
  function scheduleDrums(drumPattern, songDuration, startTime) {
    let drumTime = startTime;
    let drumIdx = 0;
    const songEnd = startTime + songDuration;

    while (drumTime < songEnd) {
      const [type, dur] = drumPattern[drumIdx % drumPattern.length];
      if (type.includes('K')) scheduleKick(drumTime);
      if (type.includes('S')) scheduleSnare(drumTime);
      if (type.includes('O')) scheduleHiHatOpen(drumTime);
      else if (type.includes('H')) scheduleHiHat(drumTime);
      drumTime += dur;
      drumIdx++;
    }
  }

  /**
   * Schedule one loop of the current song
   */
  function scheduleSongLoop(startTime) {
    const song = SONGS[currentSongIndex];

    // Pulse 1: Melody (with vibrato)
    scheduleVoice(song.melody, song.melodyWave, 0.18, startTime, false, true);

    // Pulse 2: Harmony (no vibrato)
    if (song.harmony) {
      scheduleVoice(song.harmony, song.harmonyWave, 0.10, startTime, false, false);
    }

    // Wave channel: Bass
    scheduleVoice(song.bass, song.bassWave, 0.14, startTime, true, false);

    // Noise channel: Drums
    if (song.drums) {
      scheduleDrums(song.drums, song.duration, startTime);
    }
  }

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

  // ─── MP3 playlist (cyclic with 5s silence between tracks) ───
  const PLAYLIST = [
    { name: 'KOROBEINIKI', src: 'assets/music/01-korobeinsky.mp3' },
    { name: 'KATYUSHA',    src: 'assets/music/02-katyusha.mp3' },
    { name: 'KALINKA',     src: 'assets/music/03-kalinka.mp3' }
  ];
  const SILENCE_MS = 5000;

  let audioEl = null;
  let silenceTimerId = null;
  let playlistIndex = 0;

  function ensureAudioEl() {
    if (audioEl) return audioEl;
    audioEl = new Audio();
    audioEl.preload = 'auto';
    audioEl.volume = 0.5;
    audioEl.addEventListener('ended', onTrackEnded);
    audioEl.addEventListener('error', onTrackEnded);
    return audioEl;
  }

  function onTrackEnded() {
    if (!musicPlaying) return;
    if (silenceTimerId) clearTimeout(silenceTimerId);
    silenceTimerId = setTimeout(function() {
      silenceTimerId = null;
      if (!musicPlaying) return;
      playlistIndex = (playlistIndex + 1) % PLAYLIST.length;
      playCurrentTrack();
    }, SILENCE_MS);
  }

  function playCurrentTrack() {
    if (!musicPlaying) return;
    const el = ensureAudioEl();
    el.src = PLAYLIST[playlistIndex].src;
    const p = el.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function() { /* autoplay blocked / ignore */ });
    }
  }

  function startMusic() {
    if (musicPlaying || !enabled) return;
    musicPlaying = true;
    playCurrentTrack();
  }

  function stopMusic() {
    musicPlaying = false;
    if (silenceTimerId) {
      clearTimeout(silenceTimerId);
      silenceTimerId = null;
    }
    if (audioEl) {
      try { audioEl.pause(); } catch (e) { /* ignore */ }
    }
  }

  function nextSong() {
    if (silenceTimerId) {
      clearTimeout(silenceTimerId);
      silenceTimerId = null;
    }
    playlistIndex = (playlistIndex + 1) % PLAYLIST.length;
    if (musicPlaying) {
      playCurrentTrack();
    }
    return PLAYLIST[playlistIndex].name;
  }

  function getCurrentSongName() {
    return PLAYLIST[playlistIndex].name;
  }

  function toggle() {
    enabled = !enabled;
    if (!enabled) {
      stopMusic();
    }
    return enabled;
  }

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
