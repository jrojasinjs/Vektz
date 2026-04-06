'use strict';

/**
 * Cossack Dance LCD Animation
 * Single Cossack performing acrobatic Kazachok moves
 * High-detail pixel art on small canvas, scaled with image-rendering: pixelated
 */
Tetris.Cossacks = (function() {
  const W = 96;
  const H = 48;

  // LCD Game Boy palette (4 shades)
  const FG    = '#2a3318'; // darkest - outlines, boots, hat
  const MID   = '#4a5832'; // mid-dark - shirt, shadow
  const LIGHT = '#7a8a62'; // mid-light - skin, pants detail
  const PALE  = '#8a9a72'; // lightest detail
  const BG    = '#9fb085'; // background

  let canvas = null;
  let ctx = null;
  let animFrame = 0;
  let frameTimer = 0;
  const FRAME_MS = 150;

  const CX = 41;
  const GROUND_Y = H - 5;
  const BASE_Y = GROUND_Y - 24;

  // ─── Drawing Primitives ───

  function r(x, y, w, h, c) {
    ctx.fillStyle = c || FG;
    ctx.fillRect(x, y, w, h);
  }

  // ─── Detailed Body Parts ───

  /** Papakha - tall Cossack fur hat with texture */
  function drawPapakha(x, y) {
    // Tall fur crown
    r(x + 3, y - 4, 8, 4, FG);
    r(x + 2, y - 3, 10, 3, FG);
    // Fur texture highlights
    r(x + 4, y - 3, 1, 1, MID);
    r(x + 7, y - 2, 2, 1, MID);
    r(x + 5, y - 1, 1, 1, MID);
    r(x + 9, y - 3, 1, 1, MID);
    // Brim / band
    r(x + 2, y, 10, 2, FG);
    r(x + 3, y, 8, 1, MID);
  }

  /** Face with eyes, nose, big handlebar mustache, chin */
  function drawFace(x, y) {
    // Face shape
    r(x + 3, y + 2, 8, 6, LIGHT);
    // Ears
    r(x + 2, y + 3, 1, 2, LIGHT);
    r(x + 11, y + 3, 1, 2, LIGHT);
    // Eyes - white then pupil
    r(x + 4, y + 3, 2, 2, BG);
    r(x + 8, y + 3, 2, 2, BG);
    r(x + 5, y + 3, 1, 2, FG);
    r(x + 9, y + 3, 1, 2, FG);
    // Eyebrows
    r(x + 4, y + 2, 2, 1, FG);
    r(x + 8, y + 2, 2, 1, FG);
    // Nose
    r(x + 6, y + 4, 2, 2, MID);
    // Big handlebar mustache - the iconic Cossack feature
    r(x + 4, y + 6, 6, 1, FG);
    r(x + 3, y + 6, 1, 1, FG);
    r(x + 10, y + 6, 1, 1, FG);
    r(x + 2, y + 6, 1, 1, FG);
    r(x + 11, y + 6, 1, 1, FG);
    // Mustache tips curling up
    r(x + 1, y + 5, 1, 1, FG);
    r(x + 12, y + 5, 1, 1, FG);
    // Chin
    r(x + 5, y + 7, 4, 1, LIGHT);
  }

  /** Kosovorotka (traditional embroidered shirt) with belt and saber hilt */
  function drawTorso(x, y) {
    // Shirt body
    r(x + 3, y + 8, 8, 7, MID);
    // Collar / neckline V
    r(x + 6, y + 8, 2, 1, LIGHT);
    r(x + 6, y + 9, 2, 1, LIGHT);
    // Embroidery detail on chest (vertical stripe)
    r(x + 7, y + 8, 1, 4, FG);
    // Shoulder seams
    r(x + 3, y + 8, 1, 1, FG);
    r(x + 10, y + 8, 1, 1, FG);
    // Belt with ornate buckle
    r(x + 3, y + 13, 8, 2, FG);
    r(x + 4, y + 13, 6, 1, MID);
    // Buckle
    r(x + 6, y + 13, 2, 2, PALE);
    r(x + 6, y + 13, 2, 1, LIGHT);
    // Saber hilt on left hip
    r(x + 2, y + 12, 1, 3, FG);
    r(x + 1, y + 11, 2, 1, FG);
  }

  function drawHead(x, y) {
    drawPapakha(x, y);
    drawFace(x, y);
  }

  function drawBody(x, y) {
    drawHead(x, y);
    drawTorso(x, y);
  }

  // ─── Arm helpers ───

  function armAkimbo(x, y, side) {
    if (side === 'L') {
      // Upper arm out
      r(x + 1, y + 9, 2, 2, MID);
      // Forearm angled to hip
      r(x + 0, y + 11, 3, 2, MID);
      // Fist on hip
      r(x + 1, y + 12, 2, 2, LIGHT);
    } else {
      r(x + 11, y + 9, 2, 2, MID);
      r(x + 11, y + 11, 3, 2, MID);
      r(x + 11, y + 12, 2, 2, LIGHT);
    }
  }

  function armWide(x, y, side) {
    if (side === 'L') {
      r(x + 1, y + 9, 2, 2, MID);
      r(x - 1, y + 9, 2, 2, MID);
      r(x - 3, y + 9, 2, 2, MID);
      r(x - 5, y + 9, 2, 2, MID);
      // Fist
      r(x - 6, y + 9, 2, 2, LIGHT);
    } else {
      r(x + 11, y + 9, 2, 2, MID);
      r(x + 13, y + 9, 2, 2, MID);
      r(x + 15, y + 9, 2, 2, MID);
      r(x + 17, y + 9, 2, 2, MID);
      r(x + 18, y + 9, 2, 2, LIGHT);
    }
  }

  function armUp(x, y, side) {
    if (side === 'L') {
      r(x + 1, y + 8, 2, 2, MID);
      r(x + 0, y + 6, 2, 3, MID);
      r(x - 1, y + 3, 2, 4, MID);
      r(x - 2, y + 2, 2, 2, LIGHT);
    } else {
      r(x + 11, y + 8, 2, 2, MID);
      r(x + 12, y + 6, 2, 3, MID);
      r(x + 13, y + 3, 2, 4, MID);
      r(x + 14, y + 2, 2, 2, LIGHT);
    }
  }

  function armCrossed(x, y) {
    // Arms folded across chest
    r(x + 1, y + 9, 2, 2, MID);
    r(x + 11, y + 9, 2, 2, MID);
    r(x + 3, y + 10, 3, 2, LIGHT);
    r(x + 8, y + 10, 3, 2, LIGHT);
  }

  // ─── Leg / boot helpers ───

  function leg(lx, ly, h) {
    // Sharovary (baggy trouser leg) with boot
    r(lx, ly, 3, h, LIGHT);
    // Trouser stripe
    r(lx + 1, ly, 1, h, MID);
  }

  function boot(bx, by) {
    // Tall leather boot
    r(bx, by, 3, 3, FG);
    r(bx - 1, by + 2, 5, 1, FG);
    // Boot highlight
    r(bx + 1, by, 1, 2, MID);
  }

  function legWithBoot(lx, ly, h) {
    leg(lx, ly, h);
    boot(lx, ly + h);
  }

  // ─── Shadow under character ───
  function drawShadow(x, y, w) {
    r(x, y, w, 1, LIGHT);
  }

  // ─── Acrobatic Poses (16 total) ───

  // 0: Standing idle — arms akimbo, weight centered
  function poseIdle(x, y) {
    drawBody(x, y);
    armAkimbo(x, y, 'L');
    armAkimbo(x, y, 'R');
    r(x + 3, y + 15, 8, 2, LIGHT);
    legWithBoot(x + 4, y + 17, 3);
    legWithBoot(x + 8, y + 17, 3);
    drawShadow(x + 2, GROUND_Y, 10);
    return 0;
  }

  // 1: Kick right — classic kazachok, weight on left leg
  function poseKickR(x, y) {
    drawBody(x, y);
    armWide(x, y, 'L');
    armWide(x, y, 'R');
    r(x + 3, y + 15, 8, 2, LIGHT);
    // Standing left leg
    legWithBoot(x + 4, y + 17, 3);
    // Right leg kicked out — segmented for curve
    r(x + 8, y + 15, 3, 2, LIGHT);
    r(x + 11, y + 16, 3, 2, LIGHT);
    r(x + 14, y + 17, 3, 2, LIGHT);
    boot(x + 17, y + 18);
    drawShadow(x + 2, GROUND_Y, 18);
    return 0;
  }

  // 2: Kick left — mirror of kick right
  function poseKickL(x, y) {
    drawBody(x, y);
    armWide(x, y, 'L');
    armWide(x, y, 'R');
    r(x + 3, y + 15, 8, 2, LIGHT);
    // Standing right leg
    legWithBoot(x + 8, y + 17, 3);
    // Left leg kicked out
    r(x + 3, y + 15, 3, 2, LIGHT);
    r(x + 0, y + 16, 3, 2, LIGHT);
    r(x - 3, y + 17, 3, 2, LIGHT);
    boot(x - 6, y + 18);
    drawShadow(x - 5, GROUND_Y, 18);
    return 0;
  }

  // 3: Prisyadka — deep squat, arms wide
  function posePrisyadka(x, y) {
    drawBody(x, y + 4);
    armWide(x, y + 4, 'L');
    armWide(x, y + 4, 'R');
    // Wide squat legs
    r(x + 1, y + 19, 12, 2, LIGHT);
    // Boots planted wide
    boot(x - 1, y + 20);
    boot(x + 11, y + 20);
    drawShadow(x - 2, GROUND_Y, 18);
    return 0;
  }

  // 4: Prisyadka kick right — squat + extend right leg
  function posePrisyadkaKickR(x, y) {
    drawBody(x, y + 4);
    armWide(x, y + 4, 'L');
    armWide(x, y + 4, 'R');
    // Squat left side
    r(x + 1, y + 19, 5, 2, LIGHT);
    boot(x - 1, y + 20);
    // Right leg extended from squat
    r(x + 6, y + 19, 3, 2, LIGHT);
    r(x + 9, y + 19, 4, 2, LIGHT);
    r(x + 13, y + 20, 4, 2, LIGHT);
    boot(x + 16, y + 20);
    drawShadow(x - 2, GROUND_Y, 22);
    return 0;
  }

  // 5: Prisyadka kick left — squat + extend left leg
  function posePrisyadkaKickL(x, y) {
    drawBody(x, y + 4);
    armWide(x, y + 4, 'L');
    armWide(x, y + 4, 'R');
    // Squat right side
    r(x + 8, y + 19, 5, 2, LIGHT);
    boot(x + 11, y + 20);
    // Left leg extended
    r(x + 5, y + 19, 3, 2, LIGHT);
    r(x + 1, y + 19, 4, 2, LIGHT);
    r(x - 3, y + 20, 4, 2, LIGHT);
    boot(x - 6, y + 20);
    drawShadow(x - 7, GROUND_Y, 22);
    return 0;
  }

  // 6: Jump — tucked legs, arms up
  function poseJump(x, y) {
    const jy = y - 7;
    drawBody(x, jy);
    armUp(x, jy, 'L');
    armUp(x, jy, 'R');
    r(x + 3, jy + 15, 8, 2, LIGHT);
    // Tucked legs
    r(x + 3, jy + 17, 3, 2, LIGHT);
    r(x + 8, jy + 17, 3, 2, LIGHT);
    boot(x + 2, jy + 18);
    boot(x + 8, jy + 18);
    // No ground shadow when airborne
    return 0;
  }

  // 7: Split jump — legs wide in the air, peak height
  function poseSplitJump(x, y) {
    const jy = y - 10;
    drawBody(x, jy);
    armUp(x, jy, 'L');
    armUp(x, jy, 'R');
    r(x + 3, jy + 15, 8, 2, LIGHT);
    // Full horizontal split
    r(x + 2, jy + 16, 3, 2, LIGHT);
    r(x - 1, jy + 16, 3, 2, LIGHT);
    r(x - 4, jy + 17, 3, 2, LIGHT);
    boot(x - 7, jy + 17);
    r(x + 9, jy + 16, 3, 2, LIGHT);
    r(x + 12, jy + 16, 3, 2, LIGHT);
    r(x + 15, jy + 17, 3, 2, LIGHT);
    boot(x + 17, jy + 17);
    // Small ground shadow far below
    drawShadow(x + 4, GROUND_Y, 6);
    return 0;
  }

  // 8: Spin frame 1 — pirouette on one leg
  function poseSpin1(x, y) {
    drawBody(x, y - 1);
    armWide(x, y - 1, 'L');
    armWide(x, y - 1, 'R');
    r(x + 3, y + 14, 8, 2, LIGHT);
    // Standing leg
    legWithBoot(x + 6, y + 16, 4);
    // Raised leg bent behind (passé)
    r(x + 3, y + 15, 3, 2, LIGHT);
    r(x + 2, y + 14, 2, 2, LIGHT);
    drawShadow(x + 4, GROUND_Y, 6);
    return 0;
  }

  // 9: Spin frame 2 — opposite phase
  function poseSpin2(x, y) {
    drawBody(x, y - 1);
    armWide(x, y - 1, 'L');
    armWide(x, y - 1, 'R');
    r(x + 3, y + 14, 8, 2, LIGHT);
    // Standing leg
    legWithBoot(x + 6, y + 16, 4);
    // Raised leg bent forward
    r(x + 8, y + 15, 3, 2, LIGHT);
    r(x + 10, y + 14, 2, 2, LIGHT);
    drawShadow(x + 4, GROUND_Y, 6);
    return 0;
  }

  // 10: Cartwheel tilt — body angled, one hand reaching ground
  function poseCartwheel1(x, y) {
    // Head tilted right
    drawPapakha(x + 4, y - 3);
    drawFace(x + 4, y - 3);
    // Torso angled ~45deg (drawn as shifted blocks)
    r(x + 5, y + 6, 7, 7, MID);
    r(x + 8, y + 6, 2, 2, LIGHT);
    r(x + 5, y + 11, 7, 1, FG);
    r(x + 6, y + 11, 2, 1, PALE);
    // Saber
    r(x + 4, y + 10, 1, 3, FG);
    // Right arm reaching down to ground
    r(x + 12, y + 9, 2, 3, MID);
    r(x + 13, y + 12, 2, 4, MID);
    r(x + 14, y + 16, 2, 4, MID);
    r(x + 14, y + 20, 2, 2, LIGHT);
    // Left arm up
    r(x + 2, y + 5, 3, 2, MID);
    r(x + 0, y + 2, 3, 4, MID);
    r(x - 1, y + 1, 2, 2, LIGHT);
    // Legs going up and right
    r(x + 6, y + 12, 3, 3, LIGHT);
    r(x + 5, y + 9, 2, 4, LIGHT);
    boot(x + 4, y + 6);
    r(x + 8, y + 12, 3, 3, LIGHT);
    r(x + 10, y + 10, 2, 3, LIGHT);
    boot(x + 10, y + 7);
    drawShadow(x + 12, GROUND_Y, 6);
    return 0;
  }

  // 11: Handstand — fully inverted
  function poseHandstand(x, y) {
    // Hands on ground (arms as columns)
    r(x + 4, y + 17, 2, 5, MID);
    r(x + 4, y + 21, 2, 2, LIGHT);
    r(x + 8, y + 17, 2, 5, MID);
    r(x + 8, y + 21, 2, 2, LIGHT);
    // Inverted torso
    r(x + 3, y + 10, 8, 7, MID);
    r(x + 7, y + 15, 1, 2, LIGHT);
    // Belt inverted (near top of torso now)
    r(x + 3, y + 10, 8, 2, FG);
    r(x + 4, y + 10, 6, 1, MID);
    r(x + 6, y + 10, 2, 2, PALE);
    // Saber hangs down
    r(x + 2, y + 10, 1, 3, FG);
    // Inverted head
    r(x + 3, y + 5, 8, 5, LIGHT);
    // Inverted hat at very top
    r(x + 2, y + 2, 10, 3, FG);
    r(x + 3, y + 1, 8, 2, FG);
    r(x + 4, y + 2, 1, 1, MID);
    r(x + 8, y + 2, 1, 1, MID);
    // Inverted eyes (upside down so lower in face)
    r(x + 4, y + 7, 2, 2, BG);
    r(x + 8, y + 7, 2, 2, BG);
    r(x + 5, y + 7, 1, 2, FG);
    r(x + 9, y + 7, 1, 2, FG);
    // Inverted mustache (appears above eyes now)
    r(x + 3, y + 5, 8, 1, FG);
    r(x + 2, y + 5, 1, 1, FG);
    r(x + 11, y + 5, 1, 1, FG);
    r(x + 1, y + 6, 1, 1, FG);
    r(x + 12, y + 6, 1, 1, FG);
    // Legs in V pointing up
    r(x + 3, y + 5, 2, 6, LIGHT);
    r(x + 1, y + 2, 2, 4, LIGHT);
    r(x + 9, y + 5, 2, 6, LIGHT);
    r(x + 11, y + 2, 2, 4, LIGHT);
    // Boots at the very top
    boot(x + 0, y + 0);
    boot(x + 11, y + 0);
    drawShadow(x + 3, GROUND_Y, 8);
    return 0;
  }

  // 12: Bow — respectful Cossack salute
  function poseBow(x, y) {
    // Head lowered forward
    drawPapakha(x + 4, y + 4);
    drawFace(x + 4, y + 4);
    // Torso leaning forward
    r(x + 5, y + 12, 7, 6, MID);
    r(x + 8, y + 12, 2, 2, LIGHT);
    r(x + 5, y + 16, 7, 1, FG);
    r(x + 7, y + 16, 2, 1, PALE);
    // Right arm swept back
    r(x + 12, y + 13, 3, 2, MID);
    r(x + 14, y + 12, 3, 2, MID);
    r(x + 16, y + 11, 2, 2, LIGHT);
    // Left arm holds hat brim
    r(x + 3, y + 7, 2, 3, MID);
    r(x + 2, y + 6, 2, 2, LIGHT);
    // Legs straight
    r(x + 5, y + 17, 3, 3, LIGHT);
    r(x + 8, y + 17, 3, 3, LIGHT);
    boot(x + 4, y + 19);
    boot(x + 8, y + 19);
    drawShadow(x + 2, GROUND_Y, 14);
    return 0;
  }

  // 13: High kick — one leg vertical, standing split
  function poseHighKick(x, y) {
    drawBody(x, y);
    // Left arm down for balance
    armAkimbo(x, y, 'L');
    // Right arm up
    armUp(x, y, 'R');
    r(x + 3, y + 15, 8, 2, LIGHT);
    // Standing leg
    legWithBoot(x + 4, y + 17, 3);
    // Right leg kicked straight UP
    r(x + 8, y + 14, 3, 2, LIGHT);
    r(x + 9, y + 11, 3, 2, LIGHT);
    r(x + 10, y + 8, 3, 2, LIGHT);
    boot(x + 10, y + 5);
    drawShadow(x + 2, GROUND_Y, 10);
    return 0;
  }

  // 14: Hopak leap — one leg forward, one back, arms wide
  function poseLeap(x, y) {
    const jy = y - 6;
    drawBody(x, jy);
    armWide(x, jy, 'L');
    armWide(x, jy, 'R');
    r(x + 3, jy + 15, 8, 2, LIGHT);
    // Front leg extended forward
    r(x + 8, jy + 16, 3, 2, LIGHT);
    r(x + 11, jy + 17, 4, 2, LIGHT);
    boot(x + 14, jy + 17);
    // Back leg extended back
    r(x + 3, jy + 16, 3, 2, LIGHT);
    r(x + 0, jy + 17, 3, 2, LIGHT);
    r(x - 3, jy + 18, 3, 2, LIGHT);
    boot(x - 6, jy + 18);
    drawShadow(x + 4, GROUND_Y, 6);
    return 0;
  }

  // 15: Crouch ready — about to spring
  function poseCrouch(x, y) {
    drawBody(x, y + 6);
    armCrossed(x, y + 6);
    r(x + 2, y + 21, 10, 2, LIGHT);
    boot(x + 0, y + 21);
    boot(x + 10, y + 21);
    drawShadow(x - 1, GROUND_Y, 16);
    return 0;
  }

  const POSES = [
    poseIdle,           // 0
    poseKickR,          // 1
    poseKickL,          // 2
    posePrisyadka,      // 3
    posePrisyadkaKickR, // 4
    posePrisyadkaKickL, // 5
    poseJump,           // 6
    poseSplitJump,      // 7
    poseSpin1,          // 8
    poseSpin2,          // 9
    poseCartwheel1,     // 10
    poseHandstand,      // 11
    poseBow,            // 12
    poseHighKick,       // 13
    poseLeap,           // 14
    poseCrouch          // 15
  ];

  // Extended choreography — 48-frame routine with acrobatic variety
  const SEQUENCE = [
    // Opening: bow and warmup
    0, 0, 12, 12, 0,
    // Classic kazachok kicks
    1, 2, 1, 2,
    // Down to prisyadka
    3, 4, 3, 5, 3, 4, 5,
    // Rise and spin
    0, 8, 9, 8, 9, 8, 9,
    // High kick showoff
    0, 13, 0, 13,
    // Crouch then explosive jump
    15, 15, 6, 7, 6,
    // Land into kicks
    0, 1, 2, 1,
    // Leap across
    14, 14, 0,
    // Grand finale: cartwheel to handstand
    10, 11, 11, 10,
    // Prisyadka burst
    3, 4, 5, 4, 5,
    // Final bow
    0, 0, 12, 12
  ];

  // ─── Ground & Scenery ───

  function drawGround() {
    // Main ground line
    r(1, GROUND_Y, W - 2, 1, MID);
    // Grass / texture
    for (let i = 4; i < W - 4; i += 5) {
      r(i, GROUND_Y - 1, 1, 1, LIGHT);
      r(i + 2, GROUND_Y - 1, 2, 1, PALE);
    }
  }

  function render() {
    if (!ctx) return;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    drawGround();

    const idx = animFrame % SEQUENCE.length;
    POSES[SEQUENCE[idx]](CX, BASE_Y);
  }

  function update(deltaTime) {
    if (!canvas) return;
    frameTimer += deltaTime;
    if (frameTimer >= FRAME_MS) {
      frameTimer -= FRAME_MS;
      animFrame++;
      render();
    }
  }

  function init() {
    canvas = document.getElementById('lcd-canvas');
    if (!canvas) return;

    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    render();
  }

  return {
    init,
    update
  };
})();
