'use strict';

Tetris.Decorations = (function() {

  // Soviet color palette
  var RED_BRIGHT  = '#cc3333';
  var RED_DARK    = '#8b1a1a';
  var GOLD        = '#c4a668';
  var GOLD_DARK   = '#b8a83e';
  var GREEN       = '#5b8b4e';
  var GREEN_DARK  = '#3a6a30';
  var BLUE        = '#4a6a8b';
  var BG_DARK     = '#1a1a0e';
  var WHITE_DIM   = '#d4c8a0';
  var BROWN       = '#6b4226';
  var BROWN_LIGHT = '#8b6240';
  var ORANGE      = '#b87840';
  var CREAM       = '#e8d8a8';

  // Seeded PRNG for deterministic textures
  var _seed = 12345;
  function pseudoRandom() {
    _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
    return _seed / 0x7fffffff;
  }
  function resetSeed() { _seed = 12345; }


  // ─────────────────────────────────────────────
  //  FIVE-POINTED STAR (3D beveled)
  // ─────────────────────────────────────────────

  function drawStar(ctx, cx, cy, radius, color) {
    var outerR = radius;
    var innerR = radius * 0.382;
    var points = [];
    var i, angle;

    for (i = 0; i < 10; i++) {
      angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
      var r = (i % 2 === 0) ? outerR : innerR;
      points.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
      });
    }

    var baseColor = color || RED_BRIGHT;

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = radius * 0.3;
    ctx.shadowOffsetX = radius * 0.05;
    ctx.shadowOffsetY = radius * 0.08;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (i = 1; i < 10; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = baseColor;
    ctx.fill();
    ctx.restore();

    // Beveled 3D facets
    var lightColor, darkColor;
    if (baseColor === RED_BRIGHT || baseColor === RED_DARK) {
      lightColor = '#e04444';
      darkColor = '#7a1212';
    } else if (baseColor === GOLD || baseColor === GOLD_DARK) {
      lightColor = '#d4b878';
      darkColor = '#9a8a2e';
    } else {
      lightColor = '#e04444';
      darkColor = '#7a1212';
    }

    for (i = 0; i < 5; i++) {
      var outerIdx = i * 2;
      var leftInner = (outerIdx + 9) % 10;
      var rightInner = (outerIdx + 1) % 10;

      ctx.beginPath();
      ctx.moveTo(points[outerIdx].x, points[outerIdx].y);
      ctx.lineTo(points[leftInner].x, points[leftInner].y);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fillStyle = lightColor;
      ctx.globalAlpha = 0.35;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(points[outerIdx].x, points[outerIdx].y);
      ctx.lineTo(points[rightInner].x, points[rightInner].y);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fillStyle = darkColor;
      ctx.globalAlpha = 0.35;
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (i = 1; i < 10; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = Math.max(1, radius * 0.04);
    ctx.stroke();
  }


  // ─────────────────────────────────────────────
  //  HAMMER AND SICKLE (improved bezier version)
  // ─────────────────────────────────────────────

  function drawHammerSickle(ctx, cx, cy, size) {
    var s = size;
    ctx.save();
    ctx.translate(cx, cy);

    // Metallic gradient
    var grad = ctx.createLinearGradient(-s * 0.3, -s * 0.3, s * 0.3, s * 0.3);
    grad.addColorStop(0, '#d4b878');
    grad.addColorStop(0.5, GOLD);
    grad.addColorStop(1, '#9a8a2e');

    // Classic Soviet emblem layout:
    // Sickle blade sweeps from upper-left down through right
    // Hammer handle goes from lower-right up to upper-left, crossing sickle handle
    // They cross near the center

    // --- Sickle (classic curved blade) ---
    ctx.save();
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#6a5a18';
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Sickle blade — wide crescent, tip at top
    ctx.beginPath();
    // Tip of sickle (top, slightly right of center)
    ctx.moveTo(s * 0.05, -s * 0.42);
    // Outer arc: sweeps right and down (large circular arc)
    ctx.bezierCurveTo(
      s * 0.30, -s * 0.40,
      s * 0.44, -s * 0.18,
      s * 0.38, s * 0.05
    );
    ctx.bezierCurveTo(
      s * 0.32, s * 0.22,
      s * 0.12, s * 0.32,
      -s * 0.10, s * 0.28
    );
    // Transition to inner arc
    ctx.lineTo(-s * 0.06, s * 0.20);
    // Inner arc: sweeps back to tip (thinner blade)
    ctx.bezierCurveTo(
      s * 0.08, s * 0.22,
      s * 0.22, s * 0.14,
      s * 0.28, s * 0.0
    );
    ctx.bezierCurveTo(
      s * 0.34, -s * 0.14,
      s * 0.22, -s * 0.30,
      s * 0.05, -s * 0.35
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sickle handle — straight, going down-left
    ctx.beginPath();
    ctx.moveTo(-s * 0.10, s * 0.28);
    ctx.lineTo(-s * 0.22, s * 0.46);
    ctx.lineWidth = s * 0.055;
    ctx.strokeStyle = grad;
    ctx.stroke();
    ctx.strokeStyle = '#6a5a18';
    ctx.lineWidth = Math.max(1, s * 0.015);
    ctx.stroke();

    ctx.restore();

    // --- Hammer (crosses over sickle) ---
    ctx.save();
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#6a5a18';
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Hammer handle (diagonal, from lower-right to upper-left)
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, -s * 0.18);
    ctx.lineTo(s * 0.22, s * 0.46);
    ctx.lineWidth = s * 0.055;
    ctx.strokeStyle = grad;
    ctx.stroke();
    // Thin outline on handle
    ctx.lineWidth = Math.max(1, s * 0.015);
    ctx.strokeStyle = '#6a5a18';
    ctx.stroke();

    // Hammer head — classic flat rectangle, perpendicular to handle
    ctx.save();
    ctx.translate(-s * 0.12, -s * 0.18);
    ctx.rotate(-Math.PI * 0.22);

    // Classic symmetric hammer head
    var headW = s * 0.30;
    var headH = s * 0.11;
    ctx.beginPath();
    ctx.rect(-headW * 0.5, -headH * 0.5, headW, headH);
    ctx.fillStyle = grad;
    ctx.fill();

    // Bevel highlight (top half)
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-headW * 0.5, -headH * 0.5, headW, headH * 0.4);

    // Bevel shadow (bottom half)
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(-headW * 0.5, headH * 0.1, headW, headH * 0.4);

    // Outline
    ctx.beginPath();
    ctx.rect(-headW * 0.5, -headH * 0.5, headW, headH);
    ctx.strokeStyle = '#6a5a18';
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.stroke();

    ctx.restore();
    ctx.restore();

    ctx.restore();
  }


  // ─────────────────────────────────────────────
  //  MOSCOW STATE UNIVERSITY (MGU) — Stalinist Gothic
  // ─────────────────────────────────────────────

  function drawMGU(ctx, cx, bottomY, totalW, totalH) {
    ctx.save();

    // Proportions of the MGU main building
    var wingW = totalW * 0.32;
    var wingH = totalH * 0.28;
    var centerW = totalW * 0.30;
    var centerH = totalH * 0.45;
    var towerW = totalW * 0.16;
    var towerH = totalH * 0.30;
    var spireH = totalH * 0.22;

    // Colors
    var wallColor = '#c8b888';
    var wallDark  = '#a89868';
    var wallLight = '#ddd0b0';

    // ─── Side wings (left and right) ───
    [-1, 1].forEach(function(side) {
      var wingX = cx + side * totalW * 0.28;
      var wingTop = bottomY - wingH;

      // Wing body
      ctx.fillStyle = wallColor;
      ctx.fillRect(wingX - wingW * 0.5, wingTop, wingW, wingH);

      // Horizontal bands
      ctx.fillStyle = wallDark;
      ctx.fillRect(wingX - wingW * 0.5, wingTop, wingW, wingH * 0.06);
      ctx.fillRect(wingX - wingW * 0.5, wingTop + wingH * 0.5, wingW, wingH * 0.04);

      // Windows (rows of dark rectangles)
      ctx.fillStyle = '#2a2a1e';
      var winRows = 3;
      var winCols = 4;
      var winW2 = wingW * 0.12;
      var winH2 = wingH * 0.10;
      for (var wr = 0; wr < winRows; wr++) {
        for (var wc = 0; wc < winCols; wc++) {
          var wx = wingX - wingW * 0.35 + wc * (wingW * 0.22);
          var wy = wingTop + wingH * 0.12 + wr * (wingH * 0.28);
          ctx.fillRect(wx, wy, winW2, winH2);
        }
      }

      // Wing outline
      ctx.strokeStyle = wallDark;
      ctx.lineWidth = 1;
      ctx.strokeRect(wingX - wingW * 0.5, wingTop, wingW, wingH);

      // Small decorative top element on wings
      var wingCapW = wingW * 0.3;
      var wingCapH = wingH * 0.12;
      ctx.fillStyle = wallColor;
      ctx.fillRect(wingX - wingCapW * 0.5, wingTop - wingCapH, wingCapW, wingCapH);
      ctx.strokeRect(wingX - wingCapW * 0.5, wingTop - wingCapH, wingCapW, wingCapH);
    });

    // ─── Central body (taller) ───
    var centerTop = bottomY - centerH;
    ctx.fillStyle = wallColor;
    ctx.fillRect(cx - centerW * 0.5, centerTop, centerW, centerH);

    // Horizontal decorative bands
    ctx.fillStyle = wallDark;
    ctx.fillRect(cx - centerW * 0.5, centerTop, centerW, centerH * 0.04);
    ctx.fillRect(cx - centerW * 0.5, centerTop + centerH * 0.35, centerW, centerH * 0.03);
    ctx.fillRect(cx - centerW * 0.5, centerTop + centerH * 0.7, centerW, centerH * 0.03);

    // Windows on center
    ctx.fillStyle = '#2a2a1e';
    var cWinRows = 4;
    var cWinCols = 5;
    var cWinW = centerW * 0.08;
    var cWinH = centerH * 0.06;
    for (var cwr = 0; cwr < cWinRows; cwr++) {
      for (var cwc = 0; cwc < cWinCols; cwc++) {
        var cwx = cx - centerW * 0.35 + cwc * (centerW * 0.17);
        var cwy = centerTop + centerH * 0.08 + cwr * (centerH * 0.20);
        ctx.fillRect(cwx, cwy, cWinW, cWinH);
      }
    }

    // Center outline
    ctx.strokeStyle = wallDark;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - centerW * 0.5, centerTop, centerW, centerH);

    // ─── Central tower (stepped tiers) ───
    // Tier 1 (wider)
    var t1W = towerW * 1.1;
    var t1H = towerH * 0.35;
    var t1Top = centerTop - t1H;
    ctx.fillStyle = wallLight;
    ctx.fillRect(cx - t1W * 0.5, t1Top, t1W, t1H);

    // Tier 1 windows
    ctx.fillStyle = '#2a2a1e';
    for (var twi = -1; twi <= 1; twi++) {
      ctx.fillRect(cx + twi * t1W * 0.28 - cWinW * 0.5, t1Top + t1H * 0.2, cWinW, t1H * 0.35);
    }

    ctx.strokeStyle = wallDark;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(cx - t1W * 0.5, t1Top, t1W, t1H);

    // Decorative cornice
    ctx.fillStyle = wallDark;
    ctx.fillRect(cx - t1W * 0.54, t1Top, t1W * 1.08, t1H * 0.08);

    // Tier 2 (narrower)
    var t2W = towerW * 0.7;
    var t2H = towerH * 0.30;
    var t2Top = t1Top - t2H;
    ctx.fillStyle = wallLight;
    ctx.fillRect(cx - t2W * 0.5, t2Top, t2W, t2H);
    ctx.strokeRect(cx - t2W * 0.5, t2Top, t2W, t2H);

    // Tier 2 cornice
    ctx.fillStyle = wallDark;
    ctx.fillRect(cx - t2W * 0.55, t2Top, t2W * 1.1, t2H * 0.10);

    // Clock on tier 2
    var clockR2 = Math.min(t2W * 0.22, t2H * 0.3);
    var clockCy2 = t2Top + t2H * 0.55;
    ctx.beginPath();
    ctx.arc(cx, clockCy2, clockR2, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a0e';
    ctx.fill();
    ctx.strokeStyle = GOLD_DARK;
    ctx.lineWidth = Math.max(1, clockR2 * 0.1);
    ctx.stroke();

    // Clock hands
    ctx.beginPath();
    ctx.moveTo(cx, clockCy2);
    ctx.lineTo(cx, clockCy2 - clockR2 * 0.6);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(1, clockR2 * 0.08);
    ctx.stroke();

    // ─── Spire (tall pointed top) ───
    var spireBot = t2Top;
    var spireTop = spireBot - spireH;

    // Spire gradient
    var spGrad = ctx.createLinearGradient(cx - t2W * 0.2, spireTop, cx + t2W * 0.2, spireTop);
    spGrad.addColorStop(0, wallDark);
    spGrad.addColorStop(0.3, wallLight);
    spGrad.addColorStop(0.7, wallLight);
    spGrad.addColorStop(1, wallDark);

    ctx.beginPath();
    ctx.moveTo(cx, spireTop);
    ctx.lineTo(cx + t2W * 0.35, spireBot);
    ctx.lineTo(cx - t2W * 0.35, spireBot);
    ctx.closePath();
    ctx.fillStyle = spGrad;
    ctx.fill();

    // Facet lines on spire
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.5;
    for (var sfi = 1; sfi <= 3; sfi++) {
      var sfx = cx - t2W * 0.35 + (t2W * 0.7 * sfi) / 4;
      ctx.beginPath();
      ctx.moveTo(cx, spireTop);
      ctx.lineTo(sfx, spireBot);
      ctx.stroke();
    }

    // Spire outline
    ctx.beginPath();
    ctx.moveTo(cx, spireTop);
    ctx.lineTo(cx + t2W * 0.35, spireBot);
    ctx.lineTo(cx - t2W * 0.35, spireBot);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Red star on top of spire
    drawStar(ctx, cx, spireTop - totalW * 0.04, totalW * 0.05, RED_BRIGHT);

    ctx.restore();
  }


  // ─────────────────────────────────────────────
  //  KOKOSHNIKI (decorative ogee gables)
  // ─────────────────────────────────────────────

  function drawKokoshniki(ctx, cx, y, width, count, archH) {
    var archW = width / count;
    ctx.save();
    ctx.fillStyle = CREAM;
    ctx.strokeStyle = GOLD_DARK;
    ctx.lineWidth = Math.max(0.5, archW * 0.03);

    for (var i = 0; i < count; i++) {
      var ax = cx - width * 0.5 + archW * (i + 0.5);
      ctx.beginPath();
      ctx.moveTo(ax - archW * 0.4, y + archH);
      // Left side up to pointed tip (ogee arch)
      ctx.quadraticCurveTo(ax - archW * 0.35, y + archH * 0.3, ax, y);
      // Right side back down
      ctx.quadraticCurveTo(ax + archW * 0.35, y + archH * 0.3, ax + archW * 0.4, y + archH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }


  // ─────────────────────────────────────────────
  //  DOME PATTERN FILLS
  // ─────────────────────────────────────────────

  function drawDomePattern(ctx, domeTop, domeBot, domeW, pattern, color1, color2) {
    var h = domeBot - domeTop;

    if (pattern === 'smooth') {
      // Smooth metallic gradient (for central dome)
      var grad = ctx.createRadialGradient(
        -domeW * 0.15, domeTop + h * 0.35, domeW * 0.1,
        0, domeTop + h * 0.5, domeW * 0.6
      );
      grad.addColorStop(0, '#e8d090');
      grad.addColorStop(0.4, color1);
      grad.addColorStop(1, '#8a7a2e');
      ctx.fillStyle = grad;
      ctx.fillRect(-domeW, domeTop, domeW * 2, h);
      return;
    }

    if (pattern === 'spiral') {
      // Spiral/twisted pattern — diagonal bands that shift
      var bandCount = 10;
      var bandH = h / bandCount;
      for (var b = 0; b < bandCount * 2; b++) {
        var yStart = domeTop + (b - bandCount * 0.5) * bandH;
        ctx.fillStyle = (b % 2 === 0) ? color1 : color2;
        ctx.save();
        ctx.beginPath();
        // Parallelogram bands (angled to create spiral illusion)
        var shift = domeW * 0.4;
        ctx.moveTo(-domeW, yStart);
        ctx.lineTo(domeW, yStart - shift);
        ctx.lineTo(domeW, yStart - shift + bandH);
        ctx.lineTo(-domeW, yStart + bandH);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    if (pattern === 'diamond') {
      // Diamond/chevron pattern
      var rows = 8;
      var cols = 4;
      var dH = h / rows;
      var dW = (domeW * 2) / cols;
      for (var dr = 0; dr < rows; dr++) {
        for (var dc = 0; dc < cols; dc++) {
          var dcx = -domeW + dW * (dc + 0.5);
          var dcy = domeTop + dH * (dr + 0.5);
          ctx.fillStyle = ((dr + dc) % 2 === 0) ? color1 : color2;
          ctx.beginPath();
          ctx.moveTo(dcx, dcy - dH * 0.5);
          ctx.lineTo(dcx + dW * 0.5, dcy);
          ctx.lineTo(dcx, dcy + dH * 0.5);
          ctx.lineTo(dcx - dW * 0.5, dcy);
          ctx.closePath();
          ctx.fill();
        }
      }
      return;
    }

    if (pattern === 'zigzag') {
      // Zigzag horizontal bands
      var zigBands = 8;
      var zigH = h / zigBands;
      var zigAmp = domeW * 0.15;
      var zigFreq = 4;

      // First fill background color
      ctx.fillStyle = color2;
      ctx.fillRect(-domeW, domeTop, domeW * 2, h);

      // Draw zigzag filled regions
      for (var zb = 0; zb < zigBands; zb++) {
        if (zb % 2 !== 0) continue;
        var zy = domeTop + zb * zigH;
        ctx.fillStyle = color1;
        ctx.beginPath();
        ctx.moveTo(-domeW, zy);
        // Top zigzag edge
        for (var zx = -domeW; zx <= domeW; zx += domeW / zigFreq) {
          var zigOff = ((zx + domeW) / (domeW / zigFreq)) % 2 < 1 ? -zigAmp : zigAmp;
          ctx.lineTo(zx, zy + zigOff * 0.3);
        }
        // Bottom straight edge
        ctx.lineTo(domeW, zy + zigH);
        ctx.lineTo(-domeW, zy + zigH);
        ctx.closePath();
        ctx.fill();
      }
      return;
    }

    // Default: horizontal stripes (legacy)
    var bands = 7;
    var bandH2 = h / bands;
    for (var sb = 0; sb < bands; sb++) {
      ctx.fillStyle = (sb % 2 === 0) ? color1 : color2;
      ctx.fillRect(-domeW, domeTop + sb * bandH2, domeW * 2, bandH2);
    }
  }


  // ─────────────────────────────────────────────
  //  TENT ROOF (shatyor — central tower)
  // ─────────────────────────────────────────────

  function drawTentRoof(ctx, cx, topY, width, height) {
    var tentBot = topY + height;

    // Green gradient
    var grad = ctx.createLinearGradient(cx - width * 0.5, topY, cx + width * 0.5, topY);
    grad.addColorStop(0, GREEN_DARK);
    grad.addColorStop(0.35, GREEN);
    grad.addColorStop(0.65, GREEN);
    grad.addColorStop(1, GREEN_DARK);

    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx + width * 0.5, tentBot);
    ctx.lineTo(cx - width * 0.5, tentBot);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Facet lines (octagonal pyramid suggestion)
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 0.8;
    for (var i = 1; i <= 5; i++) {
      var fx = cx - width * 0.5 + (width * i) / 6;
      ctx.beginPath();
      ctx.moveTo(cx, topY);
      ctx.lineTo(fx, tentBot);
      ctx.stroke();
    }

    // Outline
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx + width * 0.5, tentBot);
    ctx.lineTo(cx - width * 0.5, tentBot);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Small gold onion dome on top
    var miniDomeW = width * 0.25;
    var miniDomeH = height * 0.25;
    drawOnionDome(ctx, cx, topY - miniDomeH, miniDomeW, miniDomeH, GOLD, GOLD_DARK, 1, 'smooth');

    return tentBot;
  }


  // ─────────────────────────────────────────────
  //  ST. BASIL'S CATHEDRAL (improved)
  // ─────────────────────────────────────────────

  function drawOnionDome(ctx, cx, topY, domeW, domeH, color1, color2, stripes, patternType) {
    var bands = stripes || 6;
    var pattern = patternType || 'stripe';

    ctx.save();
    ctx.translate(cx, topY);

    // Cross at the very top
    var crossH = domeH * 0.15;
    var crossW = domeW * 0.15;
    ctx.fillStyle = GOLD;
    ctx.fillRect(-crossW * 0.15, 0, crossW * 0.3, crossH);
    ctx.fillRect(-crossW * 0.5, crossH * 0.2, crossW, crossH * 0.2);

    // Small orb under cross
    ctx.beginPath();
    ctx.arc(0, crossH + domeH * 0.02, domeW * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = GOLD;
    ctx.fill();

    // More dramatic dome shape
    var domeTop = crossH + domeH * 0.03;
    var domeBot = domeTop + domeH * 0.85;
    var bulgeMid = domeTop + domeH * 0.55; // shifted down for more dramatic shape

    // Clip to dome shape
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, domeTop);
    ctx.bezierCurveTo(
      domeW * 0.08, domeTop + domeH * 0.08,
      domeW * 0.70, bulgeMid - domeH * 0.18,  // more outward bulge
      domeW * 0.52, bulgeMid
    );
    ctx.bezierCurveTo(
      domeW * 0.42, bulgeMid + domeH * 0.18,
      domeW * 0.18, domeBot - domeH * 0.03,
      domeW * 0.15, domeBot                     // narrower base
    );
    ctx.lineTo(-domeW * 0.15, domeBot);
    ctx.bezierCurveTo(
      -domeW * 0.18, domeBot - domeH * 0.03,
      -domeW * 0.42, bulgeMid + domeH * 0.18,
      -domeW * 0.52, bulgeMid
    );
    ctx.bezierCurveTo(
      -domeW * 0.70, bulgeMid - domeH * 0.18,
      -domeW * 0.08, domeTop + domeH * 0.08,
      0, domeTop
    );
    ctx.closePath();
    ctx.clip();

    // Fill with pattern
    drawDomePattern(ctx, domeTop, domeBot, domeW, pattern, color1, color2);

    ctx.restore();

    // Redraw dome outline
    ctx.beginPath();
    ctx.moveTo(0, domeTop);
    ctx.bezierCurveTo(
      domeW * 0.08, domeTop + domeH * 0.08,
      domeW * 0.70, bulgeMid - domeH * 0.18,
      domeW * 0.52, bulgeMid
    );
    ctx.bezierCurveTo(
      domeW * 0.42, bulgeMid + domeH * 0.18,
      domeW * 0.18, domeBot - domeH * 0.03,
      domeW * 0.15, domeBot
    );
    ctx.lineTo(-domeW * 0.15, domeBot);
    ctx.bezierCurveTo(
      -domeW * 0.18, domeBot - domeH * 0.03,
      -domeW * 0.42, bulgeMid + domeH * 0.18,
      -domeW * 0.52, bulgeMid
    );
    ctx.bezierCurveTo(
      -domeW * 0.70, bulgeMid - domeH * 0.18,
      -domeW * 0.08, domeTop + domeH * 0.08,
      0, domeTop
    );
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = Math.max(1, domeW * 0.025);
    ctx.stroke();

    // Subtle highlight on left side
    ctx.beginPath();
    ctx.moveTo(0, domeTop);
    ctx.bezierCurveTo(
      -domeW * 0.08, domeTop + domeH * 0.08,
      -domeW * 0.70, bulgeMid - domeH * 0.18,
      -domeW * 0.52, bulgeMid
    );
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = Math.max(1, domeW * 0.04);
    ctx.stroke();

    ctx.restore();

    return topY + domeTop + domeH * 0.85;
  }

  function drawTower(ctx, cx, topY, towerW, towerH, color) {
    var taperTop = towerW * 0.85;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - taperTop * 0.5, topY);
    ctx.lineTo(cx + taperTop * 0.5, topY);
    ctx.lineTo(cx + towerW * 0.5, topY + towerH);
    ctx.lineTo(cx - towerW * 0.5, topY + towerH);
    ctx.closePath();
    ctx.fill();

    // Vertical panel lines (suggesting faceted shape)
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 0.5;
    for (var pi = 1; pi <= 3; pi++) {
      var topX = cx - taperTop * 0.5 + (taperTop * pi) / 4;
      var botX = cx - towerW * 0.5 + (towerW * pi) / 4;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.lineTo(botX, topY + towerH);
      ctx.stroke();
    }

    // Window arches
    ctx.fillStyle = '#2a2a1e';
    var windowW = towerW * 0.22;
    var windowH = towerH * 0.2;
    var windowY = topY + towerH * 0.3;

    // Left window
    ctx.beginPath();
    ctx.moveTo(cx - windowW * 1.8, windowY + windowH);
    ctx.lineTo(cx - windowW * 1.8, windowY + windowH * 0.3);
    ctx.arc(cx - windowW * 1.3, windowY + windowH * 0.3, windowW * 0.5, Math.PI, 0, false);
    ctx.lineTo(cx - windowW * 0.8, windowY + windowH);
    ctx.closePath();
    ctx.fill();

    // Right window
    ctx.beginPath();
    ctx.moveTo(cx + windowW * 0.8, windowY + windowH);
    ctx.lineTo(cx + windowW * 0.8, windowY + windowH * 0.3);
    ctx.arc(cx + windowW * 1.3, windowY + windowH * 0.3, windowW * 0.5, Math.PI, 0, false);
    ctx.lineTo(cx + windowW * 1.8, windowY + windowH);
    ctx.closePath();
    ctx.fill();

    // Decorative horizontal bands
    ctx.fillStyle = GOLD_DARK;
    ctx.fillRect(cx - taperTop * 0.5, topY + towerH * 0.15, taperTop, towerH * 0.04);
    ctx.fillRect(cx - towerW * 0.48, topY + towerH * 0.65, towerW * 0.96, towerH * 0.04);

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - taperTop * 0.5, topY);
    ctx.lineTo(cx + taperTop * 0.5, topY);
    ctx.lineTo(cx + towerW * 0.5, topY + towerH);
    ctx.lineTo(cx - towerW * 0.5, topY + towerH);
    ctx.closePath();
    ctx.stroke();
  }

  function drawCathedral(ctx, x, y, width, height) {
    ctx.save();

    // Cathedral base (gallery / lower building) — red brick with white trim
    var baseH = height * 0.20;
    var baseY = y + height - baseH;
    var baseW = width * 0.82;
    var baseCx = x + width * 0.5;

    // Red brick base
    ctx.fillStyle = RED_DARK;
    ctx.fillRect(baseCx - baseW * 0.5, baseY, baseW, baseH);

    // Brick texture on base
    var bH = baseH / 6;
    var bW = baseW / 8;
    ctx.strokeStyle = '#5a1010';
    ctx.lineWidth = 0.5;
    for (var br = 0; br < 6; br++) {
      var byy = baseY + br * bH;
      ctx.beginPath();
      ctx.moveTo(baseCx - baseW * 0.5, byy);
      ctx.lineTo(baseCx + baseW * 0.5, byy);
      ctx.stroke();
      var bOff = (br % 2 === 0) ? 0 : bW * 0.5;
      for (var bc = 0; bc <= 8; bc++) {
        var bxx = baseCx - baseW * 0.5 + bOff + bc * bW;
        if (bxx >= baseCx - baseW * 0.5 && bxx <= baseCx + baseW * 0.5) {
          ctx.beginPath();
          ctx.moveTo(bxx, byy);
          ctx.lineTo(bxx, byy + bH);
          ctx.stroke();
        }
      }
    }

    // White horizontal trim bands
    ctx.fillStyle = CREAM;
    ctx.fillRect(baseCx - baseW * 0.5, baseY, baseW, baseH * 0.04);
    ctx.fillRect(baseCx - baseW * 0.5, baseY + baseH * 0.48, baseW, baseH * 0.04);

    // Entrance arches (ogee-pointed, Russian style)
    ctx.fillStyle = '#1a1a0e';
    var archW = baseW * 0.12;
    ctx.beginPath();
    ctx.moveTo(baseCx - archW, baseY + baseH);
    ctx.lineTo(baseCx - archW, baseY + baseH * 0.45);
    ctx.quadraticCurveTo(baseCx, baseY + baseH * 0.15, baseCx + archW, baseY + baseH * 0.45);
    ctx.lineTo(baseCx + archW, baseY + baseH);
    ctx.closePath();
    ctx.fill();

    // Side arches
    var archW2 = baseW * 0.07;
    [-0.3, 0.3].forEach(function(off) {
      ctx.beginPath();
      ctx.moveTo(baseCx + baseW * off - archW2, baseY + baseH);
      ctx.lineTo(baseCx + baseW * off - archW2, baseY + baseH * 0.6);
      ctx.quadraticCurveTo(baseCx + baseW * off, baseY + baseH * 0.35, baseCx + baseW * off + archW2, baseY + baseH * 0.6);
      ctx.lineTo(baseCx + baseW * off + archW2, baseY + baseH);
      ctx.closePath();
      ctx.fill();
    });

    // Base outline
    ctx.strokeStyle = '#8a7a50';
    ctx.lineWidth = 1;
    ctx.strokeRect(baseCx - baseW * 0.5, baseY, baseW, baseH);

    // Kokoshniki (ogee gables) along top of base — 2 rows for authenticity
    drawKokoshniki(ctx, baseCx, baseY - baseH * 0.10, baseW * 0.85, 9, baseH * 0.10);
    drawKokoshniki(ctx, baseCx, baseY - baseH * 0.18, baseW * 0.65, 5, baseH * 0.10);

    // ─── 9 towers/domes (8 chapels + 1 central tent) ───
    // Authentic St. Basil's: 4 large on diagonals, 4 small on cardinals, 1 central tent
    var towers = [
      // 4 small cardinal chapels (N, S, E, W) — shorter
      { rx: 0.50, tw: 0.07, th: 0.15, dw: 0.10, dh: 0.11, c1: GOLD,       c2: GOLD_DARK, s: 1, baseOff: 0.06, pat: 'smooth'  },  // N (front)
      { rx: 0.22, tw: 0.07, th: 0.14, dw: 0.10, dh: 0.11, c1: GREEN,      c2: GOLD,      s: 5, baseOff: 0.04, pat: 'diamond' },  // W
      { rx: 0.78, tw: 0.07, th: 0.14, dw: 0.10, dh: 0.11, c1: '#8b5e3c',  c2: GOLD,      s: 5, baseOff: 0.04, pat: 'stripe'  },  // E
      { rx: 0.50, tw: 0.07, th: 0.13, dw: 0.10, dh: 0.11, c1: GREEN_DARK, c2: CREAM,     s: 5, baseOff: 0.00, pat: 'diamond' },  // S (behind, skip - obscured)

      // 4 large diagonal chapels — taller, bigger domes, vivid colors
      { rx: 0.32, tw: 0.09, th: 0.22, dw: 0.14, dh: 0.16, c1: RED_BRIGHT, c2: WHITE_DIM, s: 6, baseOff: 0.03, pat: 'spiral'  },  // NW — red/white spiral
      { rx: 0.68, tw: 0.09, th: 0.22, dw: 0.14, dh: 0.16, c1: GREEN,      c2: CREAM,     s: 6, baseOff: 0.03, pat: 'diamond' },  // NE — green/cream diamond
      { rx: 0.15, tw: 0.08, th: 0.18, dw: 0.12, dh: 0.14, c1: BLUE,       c2: WHITE_DIM, s: 7, baseOff: 0.05, pat: 'zigzag'  },  // SW — blue/white zigzag
      { rx: 0.85, tw: 0.08, th: 0.18, dw: 0.12, dh: 0.14, c1: ORANGE,     c2: GREEN,     s: 7, baseOff: 0.05, pat: 'stripe'  },  // SE — orange/green stripe

      // Central tent-roof tower (tallest)
      { rx: 0.50, tw: 0.11, th: 0.30, dw: 0.15, dh: 0.22, c1: GOLD,       c2: GREEN,     s: 8, baseOff: 0.00, pat: 'tent'    },
    ];

    // Draw from outside-in so center overlaps side chapels
    var sorted = towers.slice().sort(function(a, b) {
      return Math.abs(b.rx - 0.5) - Math.abs(a.rx - 0.5);
    });

    for (var i = 0; i < sorted.length; i++) {
      var t = sorted[i];
      var tcx = x + width * t.rx;
      var tw = width * t.tw;
      var th = height * t.th;
      var dw = width * t.dw;
      var dh = height * t.dh;
      var towerTopY = baseY - th - (height * t.baseOff);

      // Ornate drum (cylindrical section under dome)
      var drumH = height * 0.04;
      var drumY = towerTopY;
      var drumW = tw * 0.42;

      // Drum body — white with arched windows
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.moveTo(tcx - drumW, drumY + drumH);
      ctx.lineTo(tcx - drumW * 0.92, drumY);
      ctx.lineTo(tcx + drumW * 0.92, drumY);
      ctx.lineTo(tcx + drumW, drumY + drumH);
      ctx.closePath();
      ctx.fill();

      // Drum vertical columns
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      var colCount = Math.max(3, Math.round(drumW * 2 / 8));
      for (var ci = 1; ci < colCount; ci++) {
        var colX = tcx - drumW * 0.92 + (drumW * 1.84 * ci) / colCount;
        ctx.beginPath();
        ctx.moveTo(colX, drumY);
        ctx.lineTo(colX, drumY + drumH);
        ctx.stroke();
      }

      // Drum gold bands (top and bottom)
      ctx.fillStyle = GOLD_DARK;
      ctx.fillRect(tcx - drumW, drumY, drumW * 2, drumH * 0.14);
      ctx.fillRect(tcx - drumW, drumY + drumH * 0.86, drumW * 2, drumH * 0.14);

      ctx.strokeStyle = '#8a7a50';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(tcx - drumW, drumY + drumH);
      ctx.lineTo(tcx - drumW * 0.92, drumY);
      ctx.lineTo(tcx + drumW * 0.92, drumY);
      ctx.lineTo(tcx + drumW, drumY + drumH);
      ctx.closePath();
      ctx.stroke();

      // Tower body (red/cream alternating colors like real St. Basil's)
      var towerColor = (Math.abs(t.rx - 0.5) < 0.1) ? CREAM : ((i % 2 === 0) ? RED_DARK : CREAM);
      drawTower(ctx, tcx, drumY + drumH, tw, th, towerColor);

      // Kokoshniki at tower top
      var kokCount = Math.max(2, Math.round(tw / (width * 0.022)));
      drawKokoshniki(ctx, tcx, drumY + drumH - height * 0.012, tw * 0.92, kokCount, height * 0.016);

      // Dome or tent roof on top
      if (t.pat === 'tent') {
        var tentW = dw * 1.15;
        var tentH = dh * 1.3;
        drawTentRoof(ctx, tcx, drumY - tentH, tentW, tentH);
      } else {
        drawOnionDome(ctx, tcx, drumY - dh, dw, dh, t.c1, t.c2, t.s, t.pat);
      }
    }

    ctx.restore();
  }


  // ─────────────────────────────────────────────
  //  ORNAMENTAL DIVIDER
  // ─────────────────────────────────────────────

  function drawOrnamentedDivider(ctx, y, w) {
    ctx.save();
    ctx.strokeStyle = GOLD_DARK;
    ctx.lineWidth = 1;

    // Left line
    ctx.beginPath();
    ctx.moveTo(w * 0.10, y);
    ctx.lineTo(w * 0.42, y);
    ctx.stroke();

    // Right line
    ctx.beginPath();
    ctx.moveTo(w * 0.58, y);
    ctx.lineTo(w * 0.90, y);
    ctx.stroke();

    // Small diamond at center
    var ds = w * 0.03;
    ctx.fillStyle = GOLD_DARK;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, y - ds);
    ctx.lineTo(w * 0.5 + ds, y);
    ctx.lineTo(w * 0.5, y + ds);
    ctx.lineTo(w * 0.5 - ds, y);
    ctx.closePath();
    ctx.fill();

    // Secondary thin lines
    ctx.strokeStyle = 'rgba(184, 168, 62, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.10, y + 3);
    ctx.lineTo(w * 0.90, y + 3);
    ctx.stroke();

    ctx.restore();
  }


  // ─────────────────────────────────────────────
  //  DECORATIVE PANEL (combines all elements)
  // ─────────────────────────────────────────────

  function initDecoPanel(canvasElement) {
    var ctx = canvasElement.getContext('2d');
    var w = canvasElement.width;
    var h = canvasElement.height;

    // Fill background
    ctx.fillStyle = BG_DARK;
    ctx.fillRect(0, 0, w, h);

    // Subtle deterministic noise texture
    resetSeed();
    for (var ny = 0; ny < h; ny += 2) {
      for (var nx = 0; nx < w; nx += 2) {
        var val = pseudoRandom();
        if (val > 0.7) {
          ctx.fillStyle = 'rgba(255,255,220,' + (val * 0.03).toFixed(3) + ')';
          ctx.fillRect(nx, ny, 2, 2);
        } else if (val < 0.15) {
          ctx.fillStyle = 'rgba(0,0,0,' + ((1 - val) * 0.04).toFixed(3) + ')';
          ctx.fillRect(nx, ny, 2, 2);
        }
      }
    }

    // Vignette gradient
    var vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.2, w * 0.5, h * 0.5, w * 0.8);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // Layout:
    // Star:              5% - 10%
    // Cathedral:        12% - 55%
    // Divider:          57%
    // Hammer/Sickle:    60% - 72%
    // Divider:          73%
    // MGU:              76% - 100%

    // ─── 1. Soviet star at top ───
    var starRadius = Math.min(w * 0.15, h * 0.06);
    var starCx = w * 0.5;
    var starCy = h * 0.07;
    drawStar(ctx, starCx, starCy, starRadius, RED_BRIGHT);

    // Gold line under star
    drawOrnamentedDivider(ctx, starCy + starRadius + h * 0.015, w);

    // ─── 2. St. Basil's Cathedral ───
    var cathY = h * 0.12;
    var cathH = h * 0.43;
    var cathW = w * 0.92;
    var cathX = (w - cathW) * 0.5;
    drawCathedral(ctx, cathX, cathY, cathW, cathH);

    // ─── Divider ───
    drawOrnamentedDivider(ctx, h * 0.57, w);

    // ─── 3. Hammer and sickle ───
    var hsY = h * 0.66;
    var hsSize = Math.min(w * 0.32, h * 0.12);
    drawHammerSickle(ctx, w * 0.5, hsY, hsSize);

    // ─── Divider ───
    drawOrnamentedDivider(ctx, h * 0.74, w);

    // ─── 4. Moscow State University (MGU) ───
    var mguH = h * 0.24;
    var mguW = w * 0.92;
    drawMGU(ctx, w * 0.5, h, mguW, mguH);

    // ─── 5. Scattered small stars with glow ───
    var smallStarPositions = [
      { x: w * 0.10, y: h * 0.04, r: starRadius * 0.25 },
      { x: w * 0.90, y: h * 0.04, r: starRadius * 0.25 },
      { x: w * 0.06, y: h * 0.15, r: starRadius * 0.2  },
      { x: w * 0.94, y: h * 0.15, r: starRadius * 0.2  },
      { x: w * 0.08, y: h * 0.59, r: starRadius * 0.22 },
      { x: w * 0.92, y: h * 0.59, r: starRadius * 0.22 },
      { x: w * 0.15, y: h * 0.76, r: starRadius * 0.18 },
      { x: w * 0.85, y: h * 0.76, r: starRadius * 0.18 },
      { x: w * 0.50, y: h * 0.78, r: starRadius * 0.20 },
    ];

    for (var si = 0; si < smallStarPositions.length; si++) {
      var sp = smallStarPositions[si];
      // Glow behind star
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(196, 166, 104, 0.12)';
      ctx.fill();
      drawStar(ctx, sp.x, sp.y, sp.r, GOLD);
    }

    // ─── Final CRT scanline overlay ───
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (var sl = 0; sl < h; sl += 3) {
      ctx.beginPath();
      ctx.moveTo(0, sl);
      ctx.lineTo(w, sl);
      ctx.stroke();
    }
  }


  // ─── Reveal public API ───
  return {
    drawCathedral:   drawCathedral,
    drawStar:        drawStar,
    drawHammerSickle: drawHammerSickle,
    drawMGU:         drawMGU,
    initDecoPanel:   initDecoPanel
  };

})();
