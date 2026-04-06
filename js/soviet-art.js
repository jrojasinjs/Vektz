'use strict';

/**
 * Soviet Art Panel — St. Basil's Cathedral (detailed)
 * Based on actual photo reference: 9 domes, asymmetric layout,
 * tent roof center, kokoshnik arches, warm brick walls
 */
Tetris.SovietArt = (function() {
  const W = 100;
  const H = 120;

  // Accurate palette from photo
  const BRICK     = '#c48060';
  const BRICK_DK  = '#9a5a3a';
  const BRICK_LT  = '#d8a080';
  const BRICK_RED = '#b86848';
  const WHITE     = '#ece8e0';
  const CREAM     = '#d8d0c0';
  const GRAY      = '#9a9488';
  const GRAY_DK   = '#6a6458';
  const DARK      = '#2a2a1e';

  // Dome colors (from photo, L to R)
  const GRN       = '#4a8a3e';
  const GRN_DK    = '#2a6a20';
  const GRN_LT    = '#6ab858';
  const GRN_PALE  = '#88c878';

  const BLUE      = '#3a7abc';
  const BLUE_DK   = '#2256a0';
  const BLUE_LT   = '#5a9ae0';
  const BLUE_W    = '#d8e8f4';

  const RED       = '#c73a2a';
  const RED_DK    = '#8b1a1a';
  const RED_LT    = '#e04a34';

  const TEAL      = '#3a8a7a';
  const TEAL_DK   = '#286a5a';
  const TEAL_LT   = '#5aaa98';

  const GOLD      = '#c8a848';
  const GOLD_LT   = '#e8d070';
  const GOLD_DK   = '#9a7a28';
  const GOLD_BRT  = '#f0e080';

  const ORANGE    = '#d08030';
  const ORANGE_DK = '#a86020';
  const ORANGE_LT = '#e8a050';

  const YEL_GRN   = '#88a830';
  const YEL_GRN_DK = '#608020';

  const PURPLE    = '#704888';
  const PURPLE_DK = '#503068';

  let ctx = null;

  function r(x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  }

  // ─── Onion dome with twisted candy stripes ───
  function onionDome(cx, top, w, h, colors) {
    // colors = [base, dark, light, accent] for stripe pattern
    const c0 = colors[0], c1 = colors[1], c2 = colors[2];
    const c3 = colors[3] || c2;
    const hw = Math.floor(w / 2);

    // Build dome profile: width at each row
    const rows = [];
    for (let dy = 0; dy < h; dy++) {
      const t = dy / h;
      let rw;
      if (t < 0.15) {
        // Pointed tip
        rw = Math.ceil(1 + (t / 0.15) * 2);
      } else if (t < 0.35) {
        // Narrow neck
        rw = Math.ceil(3 + ((t - 0.15) / 0.2) * (w * 0.4));
      } else if (t < 0.7) {
        // Full bulge
        const bt = (t - 0.35) / 0.35;
        rw = Math.ceil(w * 0.7 + Math.sin(bt * Math.PI) * w * 0.3);
      } else {
        // Taper to base
        const bt = (t - 0.7) / 0.3;
        rw = Math.ceil(w * 0.9 * (1 - bt * 0.5));
      }
      rw = Math.min(rw, w);
      rows.push(rw);
    }

    // Draw with stripes
    for (let dy = 0; dy < h; dy++) {
      const rw = rows[dy];
      const xStart = cx - Math.floor(rw / 2);
      for (let dx = 0; dx < rw; dx++) {
        // Twisted stripe pattern
        const stripePhase = (dx + dy * 0.7) % 6;
        let color;
        if (stripePhase < 2) color = c0;
        else if (stripePhase < 3) color = c1;
        else if (stripePhase < 5) color = c2;
        else color = c3;

        // Highlight on left edge, shadow on right
        if (dx === 0) color = c2;
        if (dx === rw - 1) color = c1;

        r(xStart + dx, top + dy, 1, 1, color);
      }
    }
  }

  // ─── Gold cross with orb ───
  function goldCross(cx, top, size) {
    const s = size;
    // Orb
    r(cx - 1, top + s * 3 + 1, 3, 2, GOLD);
    r(cx, top + s * 3, 1, 1, GOLD_LT);
    // Vertical
    r(cx, top, 1, s * 3 + 1, GOLD);
    // Horizontal
    r(cx - s, top + s, s * 2 + 1, 1, GOLD);
    // Small crossbar
    if (s >= 2) {
      r(cx - 1, top + 1, 3, 1, GOLD);
    }
    // Highlight
    r(cx, top, 1, 1, GOLD_BRT);
  }

  // ─── Kokoshnik arches (decorative pointed arches on facade) ───
  function kokoshnik(cx, top, w) {
    const hw = Math.floor(w / 2);
    // Pointed arch shape
    r(cx - hw, top + 2, w, 1, CREAM);
    r(cx - hw + 1, top + 1, w - 2, 1, CREAM);
    r(cx - 1, top, 3, 1, CREAM);
    r(cx, top - 1, 1, 1, CREAM);
    // Dark inside
    r(cx - hw + 1, top + 3, w - 2, 2, BRICK_DK);
  }

  // ─── Drum (cylinder under dome) with arched windows ───
  function drum(cx, top, w, h) {
    const hw = Math.floor(w / 2);
    r(cx - hw, top, w, h, CREAM);
    // Column details
    r(cx - hw, top, 1, h, GRAY);
    r(cx + hw - 1, top, 1, h, GRAY);
    // Arched windows
    const winW = Math.max(1, Math.floor(w / 5));
    const winSpacing = Math.floor(w / 3);
    for (let i = 0; i < 2; i++) {
      const wx = cx - hw + 2 + i * winSpacing;
      r(wx, top + 1, winW, h - 2, DARK);
      r(wx, top, winW, 1, GRAY);
    }
    // Top/bottom trim
    r(cx - hw, top, w, 1, GRAY);
    r(cx - hw, top + h - 1, w, 1, GRAY);
  }

  // ─── Tower body ───
  function towerBody(cx, top, w, h, baseColor) {
    const hw = Math.floor(w / 2);
    r(cx - hw, top, w, h, baseColor);
    // Pilaster columns
    r(cx - hw, top, 1, h, BRICK_DK);
    r(cx + hw - 1, top, 1, h, BRICK_DK);
    // Window
    const wy = top + Math.floor(h * 0.3);
    r(cx - 1, wy, 2, Math.min(4, h - 4), DARK);
    r(cx - 1, wy - 1, 2, 1, CREAM);
    // Horizontal band
    r(cx - hw, top + h - 2, w, 1, CREAM);
  }

  // ─── Central tent roof (shatyor) — the tall pointed tower ───
  function tentRoof(cx, top, baseW, h) {
    // Green tent with gold ribs (like photo)
    for (let dy = 0; dy < h; dy++) {
      const t = dy / h;
      const rw = Math.ceil(1 + t * (baseW / 2));
      const xStart = cx - Math.floor(rw / 2);
      for (let dx = 0; dx < rw; dx++) {
        // Diamond/scale pattern
        const pattern = ((dx + dy) % 4);
        let color;
        if (pattern === 0) color = GOLD;
        else if (pattern === 1) color = GRN;
        else if (pattern === 2) color = GRN_DK;
        else color = RED;
        // Edge highlight/shadow
        if (dx === 0) color = GRN_LT;
        if (dx === rw - 1) color = GRN_DK;
        r(xStart + dx, top + dy, 1, 1, color);
      }
    }
  }

  // ─── Build the full cathedral ───
  function drawCathedral() {
    const baseY = 95;

    // ═══ BASE WALL (warm salmon brick like photo) ═══
    r(10, baseY - 6, 80, 26, BRICK);
    // Brick texture
    for (let by = 0; by < 26; by += 2) {
      for (let bx = 0; bx < 80; bx += 5) {
        const off = (by % 4 === 0) ? 0 : 2;
        r(10 + bx + off, baseY - 6 + by, 1, 1, BRICK_DK);
        r(11 + bx + off, baseY - 6 + by + 1, 1, 1, BRICK_LT);
      }
    }
    // White trim band at top of wall
    r(10, baseY - 6, 80, 2, CREAM);
    // Crenellations
    for (let mx = 12; mx < 88; mx += 5) {
      r(mx, baseY - 9, 3, 3, BRICK);
      r(mx, baseY - 9, 3, 1, BRICK_LT);
    }

    // ═══ Main entrance arches (3) ═══
    r(42, baseY - 2, 8, 14, DARK);
    r(43, baseY - 4, 6, 2, CREAM);
    r(44, baseY - 5, 4, 1, CREAM);
    // Side arches
    r(30, baseY, 5, 10, DARK);
    r(31, baseY - 1, 3, 1, CREAM);
    r(60, baseY, 5, 10, DARK);
    r(61, baseY - 1, 3, 1, CREAM);

    // ═══ GALLERY LEVEL — covered walkway ═══
    r(14, baseY - 12, 72, 6, BRICK_LT);
    // Gallery arches
    for (let ga = 18; ga < 82; ga += 8) {
      r(ga, baseY - 10, 4, 4, DARK);
      r(ga, baseY - 11, 4, 1, CREAM);
      r(ga + 1, baseY - 12, 2, 1, CREAM);
    }

    // Kokoshnik row above gallery
    for (let ka = 20; ka < 80; ka += 12) {
      kokoshnik(ka, baseY - 17, 8);
    }

    // ════════════════════════════════════════
    // TOWERS AND DOMES (back to front, large to small)
    // Photo arrangement: asymmetric, 8 chapels + central tent
    // ════════════════════════════════════════

    // ─── Far left chapel (green+white striped dome) ───
    towerBody(18, baseY - 30, 8, 18, BRICK);
    drum(18, baseY - 35, 10, 5);
    onionDome(18, baseY - 55, 12, 20, [GRN, GRN_DK, WHITE, GRN_PALE]);
    goldCross(18, baseY - 60, 2);

    // ─── Left-center chapel (blue+white striped dome) ───
    towerBody(33, baseY - 34, 8, 16, BRICK);
    drum(33, baseY - 39, 10, 5);
    onionDome(33, baseY - 58, 12, 19, [BLUE, BLUE_DK, BLUE_W, BLUE_LT]);
    goldCross(33, baseY - 63, 2);

    // ─── Right-center chapel (teal/green dome) ───
    towerBody(60, baseY - 34, 8, 16, BRICK);
    drum(60, baseY - 39, 10, 5);
    onionDome(60, baseY - 57, 12, 18, [TEAL, TEAL_DK, TEAL_LT, GRN]);
    goldCross(60, baseY - 62, 2);

    // ─── Far right chapel (red+green dome) ───
    towerBody(75, baseY - 30, 8, 18, BRICK);
    drum(75, baseY - 35, 10, 5);
    onionDome(75, baseY - 54, 12, 19, [RED, GRN_DK, ORANGE_LT, RED_LT]);
    goldCross(75, baseY - 59, 2);

    // ─── Back-left small chapel (orange/yellow dome) ───
    towerBody(25, baseY - 26, 6, 10, BRICK_LT);
    drum(25, baseY - 30, 7, 4);
    onionDome(25, baseY - 44, 9, 14, [ORANGE, ORANGE_DK, GOLD_LT, YEL_GRN]);
    goldCross(25, baseY - 48, 1);

    // ─── Back-right small chapel (purple dome) ───
    towerBody(68, baseY - 26, 6, 10, BRICK_LT);
    drum(68, baseY - 30, 7, 4);
    onionDome(68, baseY - 44, 9, 14, [PURPLE, PURPLE_DK, ORANGE_LT, RED_LT]);
    goldCross(68, baseY - 48, 1);

    // ─── Small spire left ───
    r(12, baseY - 22, 3, 8, BRICK);
    r(11, baseY - 26, 5, 4, GRN);
    r(12, baseY - 28, 3, 2, GRN_DK);
    r(13, baseY - 29, 1, 1, GOLD);

    // ─── Small spire right ───
    r(82, baseY - 22, 3, 8, BRICK);
    r(81, baseY - 26, 5, 4, RED);
    r(82, baseY - 28, 3, 2, RED_DK);
    r(83, baseY - 29, 1, 1, GOLD);

    // ════════════════════════════════════════
    // CENTRAL TOWER — tall tent roof (shatyor) with green+gold pattern
    // This is the tallest element, drawn last to overlap
    // ════════════════════════════════════════
    towerBody(47, baseY - 42, 10, 24, BRICK);
    // Second window on central tower
    r(46, baseY - 30, 2, 3, DARK);
    r(46, baseY - 31, 2, 1, CREAM);
    // Kokoshniks on central tower
    kokoshnik(47, baseY - 46, 10);
    kokoshnik(44, baseY - 44, 6);
    kokoshnik(50, baseY - 44, 6);
    // Drum
    drum(47, baseY - 50, 12, 4);
    // Tent roof (green+gold pointed pyramid)
    tentRoof(47, baseY - 72, 14, 22);
    // Small dome on very top of tent
    onionDome(47, baseY - 80, 6, 8, [GRN, GOLD, GRN_LT, GOLD_LT]);
    // Tallest cross
    goldCross(47, baseY - 87, 2);

    // ═══ Ground — Red Square cobblestones ═══
    for (let gx = 2; gx < W - 2; gx += 3) {
      const shade = (gx % 6 < 3) ? GRAY : GRAY_DK;
      r(gx, baseY + 18, 2, 1, shade);
      r(gx + 1, baseY + 19, 2, 1, GRAY);
    }
  }

  function draw() {
    const canvas = document.getElementById('soviet-canvas');
    if (!canvas) return;

    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, W, H);
    drawCathedral();
  }

  return {
    init: draw
  };
})();
