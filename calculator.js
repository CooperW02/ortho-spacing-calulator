'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TICK = 5;   // px, half-length of perpendicular end-tick
const MIN_LBL = 14; // px, min arrow length for inline label

// ═══════════════════════════════════════════════════════════════════════════════
//  SPACING FORMULA — edit this function to change how spacing is calculated.
//
//  Inputs:
//    areaH  — total drawing area width  (horizontal units)
//    areaV  — total drawing area height (vertical units)
//    shape  — object with views, each having .H (width) and .V (height):
//               shape.FRONT  { H: width,  V: height }
//               shape.TOP    { H: width,  V: depth  }
//               shape.RIGHT  { H: depth,  V: height }
//
//  Return: { vert: [v0, v1, v0], hori: [h0, h1, h0] }
//    vert — array of vertical spacing values:   [top margin, middle gap, top margin]
//    hori — array of horizontal spacing values: [side margin, middle gap, side margin]
//    (v0 = top & bottom margin, v1 = gap between top and bottom view rows)
//    (h0 = left & right margin, h1 = gap between left and right view columns)
// ═══════════════════════════════════════════════════════════════════════════════
function getSpacing(areaH, areaV, shape) {
  // — Vertical spacing —
  // Total vertical space available after placing the two view rows (TOP and FRONT heights)
  const vertRaw = areaV - (shape.FRONT.V + shape.TOP.V);
  const vertRounded = Math.round(vertRaw);
  let vert;
  if (vertRounded % 3 === 0) {
    // Divide evenly into 3: top margin, middle gap, bottom margin
    vert = [vertRounded / 3, vertRounded / 3, vertRounded / 3];
  } else {
    // Middle gap = 3 units (or half the space if space is too tight for that)
    const v1 = Math.min(3, Math.floor(vertRounded / 2));
    const v0 = Math.max(0, (vertRounded - v1) / 2);
    vert = [v0, v1];
  }

  // — Horizontal spacing —
  // Total horizontal space after placing the two view columns (FRONT and RIGHT widths)
  const horiRaw = areaH - (shape.FRONT.H + shape.RIGHT.H);
  const horiRounded = Math.round(horiRaw);
  let hori;
  if (horiRounded % 3 === 0) {
    // Divide evenly into 3: left margin, middle gap, right margin
    hori = [horiRounded / 3, horiRounded / 3, horiRounded / 3];
  } else {
    // Middle gap = 3 units (or half the space if space is too tight for that)
    const h1 = Math.min(3, Math.floor(horiRounded / 2));
    const h0 = Math.max(0, (horiRounded - h1) / 2);
    hori = [h0, h1];
  }

  return { vert, hori };
}

// ─── Read DOM inputs ──────────────────────────────────────────────────────────
function readInputs() {
  const W = parseFloat(document.getElementById('width').value) || 6;
  const H = parseFloat(document.getElementById('height').value) || 4;
  const D = parseFloat(document.getElementById('depth').value) || 5;
  const aH = parseFloat(document.getElementById('areaH').value) || 16;
  const aV = parseFloat(document.getElementById('areaV').value) || 16;
  const shape = {
    TOP: { H: W, V: D },
    FRONT: { H: W, V: H },
    RIGHT: { H: D, V: H }
  };
  return { W, H, D, aH, aV, shape };
}

// ─── Calculate button ─────────────────────────────────────────────────────────
function calculate() {
  const { shape, aH, aV } = readInputs();
  const sp = getSpacing(aH, aV, shape);

  const v0 = sp.vert[0];
  const v1 = sp.vert.length > 1 ? sp.vert[1] : sp.vert[0];
  const h0 = sp.hori[0];
  const h1 = sp.hori.length > 1 ? sp.hori[1] : sp.hori[0];

  const sec = document.getElementById('results-section');
  const rows = document.getElementById('result-rows');
  sec.style.display = '';
  rows.innerHTML = [
    ['h0  side margins', h0],
    ['h1  mid gap', h1],
    ['v0  top/bot', v0],
    ['v1  mid gap', v1],
  ].map(([k, v]) =>
    `<div class="result-row">
       <span class="result-key">${k}</span>
       <span class="result-val">${v.toFixed(2)}</span>
     </div>`
  ).join('');

  render(shape, { v0, v1, h0, h1 }, true);
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────
let _g;

function mk(tag, attrs) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  _g.appendChild(e);
  return e;
}

function svgLine(x1, y1, x2, y2, cls) {
  mk('line', { x1, y1, x2, y2, class: cls });
}

// ─── Dimension arrow ──────────────────────────────────────────────────────────
// type: 'shape' (blue) | 'space' (red)
// For horizontal arrow: label goes above (labelOffset < 0) or below (> 0)
// For vertical arrow:   label goes to the left or right based on labelSide
// labelOffset: px nudge of label perpendicular to the arrow (+ = below/right of arrow)
function dimArrow(x1, y1, x2, y2, label, type, opts) {
  opts = opts || {};
  const isSpace = type === 'space';
  const lineCls = isSpace ? 'dim-space' : 'dim-shape';
  const txtCls = isSpace ? 'dim-space-text' : 'dim-shape-text';
  const mEnd = isSpace ? 'url(#ah-red-e)' : 'url(#ah-blue-e)';
  const mStart = isSpace ? 'url(#ah-red-s)' : 'url(#ah-blue-s)';

  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;

  // Perpendicular unit vector
  const px = -dy / len, py = dx / len;

  // Arrow line
  mk('line', {
    x1, y1, x2, y2, class: lineCls,
    'marker-end': mEnd, 'marker-start': mStart
  });

  // Tick marks at each end
  svgLine(x1 + px * TICK, y1 + py * TICK, x1 - px * TICK, y1 - py * TICK, lineCls);
  svgLine(x2 + px * TICK, y2 + py * TICK, x2 - px * TICK, y2 - py * TICK, lineCls);

  // Label placement
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const isH = Math.abs(dy) < 0.5;
  const isV = Math.abs(dx) < 0.5;
  const short = len < MIN_LBL;

  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('class', txtCls);
  t.setAttribute('dominant-baseline', 'middle');
  t.textContent = label;

  if (isH) {
    // Horizontal arrow: place label above the line by default
    const offset = opts.labelOffset !== undefined ? opts.labelOffset : -8;
    t.setAttribute('x', mx);
    t.setAttribute('y', my + offset);
    t.setAttribute('text-anchor', 'middle');
    if (short) {
      // Too short: put label to the right, outside
      t.setAttribute('x', Math.max(x1, x2) + 5);
      t.setAttribute('y', my);
      t.setAttribute('text-anchor', 'start');
    }
  } else if (isV) {
    // Vertical arrow: place label to specified side
    const side = opts.labelSide === 'right' ? 1 : -1;
    const offset = opts.labelOffset !== undefined ? opts.labelOffset : 12;
    t.setAttribute('x', mx + side * offset);
    t.setAttribute('y', my);
    t.setAttribute('text-anchor', opts.labelSide === 'right' ? 'start' : 'end');
    if (short) {
      // Too short: nudge label above midpoint
      t.setAttribute('y', my - 10);
    }
  }

  _g.appendChild(t);
}

// ─── Main render ──────────────────────────────────────────────────────────────
function render(shape, sp, calculated) {
  const svg = document.getElementById('drawing');
  _g = document.getElementById('drawing-content');
  _g.innerHTML = '';

  const { v0, v1, h0, h1 } = sp;
  const fmt = v => calculated ? v.toFixed(1) : '?';

  const fW = shape.FRONT.H, fH = shape.FRONT.V;
  const dW = shape.RIGHT.H, dH = shape.TOP.V;

  // Total drawing area in units
  const totalUnitsH = h0 + fW + h1 + dW + h0;
  const totalUnitsV = v0 + dH + v1 + fH + v0;

  // Padding outside the drawing-area box for shape dim arrows
  // Left/right need more room for vertical labels
  const PAD_L = 56, PAD_R = 56, PAD_T = 44, PAD_B = 44;

  // Available SVG space
  const wrap = document.querySelector('.svg-wrap');
  const availW = Math.max((wrap.clientWidth || 600) - 2, 200);
  const availH = Math.max((wrap.clientHeight || 500) - 2, 200);

  // Scale to fit
  const scaleH = (availW - PAD_L - PAD_R) / totalUnitsH;
  const scaleV = (availH - PAD_T - PAD_B) / totalUnitsV;
  const S = Math.max(6, Math.min(scaleH, scaleV, 40));

  // Drawing-area box in SVG coords
  const daX = PAD_L;
  const daY = PAD_T;
  const daW = totalUnitsH * S;
  const daH = totalUnitsV * S;

  svg.setAttribute('width', daX + daW + PAD_R);
  svg.setAttribute('height', daY + daH + PAD_B);

  // ── Background fill first (so grid renders on top) ────────────────────────
  mk('rect', { x: daX, y: daY, width: daW, height: daH, class: 'draw-area-bg' });

  // ── Grid lines — drawn AFTER bg so they're visible ────────────────────────
  // Vertical lines at every integer unit
  for (let u = 0; u <= totalUnitsH; u++) {
    const x = daX + u * S;
    if (x > daX + daW + 0.1) break;
    svgLine(x, daY, x, daY + daH, 'grid-line');
  }
  // Horizontal lines at every integer unit
  for (let u = 0; u <= totalUnitsV; u++) {
    const y = daY + u * S;
    if (y > daY + daH + 0.1) break;
    svgLine(daX, y, daX + daW, y, 'grid-line');
  }

  // ── Drawing area border on top of grid ───────────────────────────────────
  mk('rect', { x: daX, y: daY, width: daW, height: daH, class: 'draw-area-box' });

  // ── Box pixel positions ───────────────────────────────────────────────────
  const pH0 = h0 * S, pH1 = h1 * S, pV0 = v0 * S, pV1 = v1 * S;
  const pfW = fW * S, pfH = fH * S, pdW = dW * S, pdH = dH * S;

  // top-left box
  const tlX = daX + pH0, tlY = daY + pV0, tlW = pfW, tlH = pdH;
  // top-right box
  const trX = daX + pH0 + pfW + pH1, trY = daY + pV0, trW = pdW, trH = pdH;
  // bottom-left box
  const blX = daX + pH0, blY = daY + pV0 + pdH + pV1, blW = pfW, blH = pfH;
  // bottom-right box
  const brX = daX + pH0 + pfW + pH1, brY = daY + pV0 + pdH + pV1, brW = pdW, brH = pfH;

  // ── Boxes ─────────────────────────────────────────────────────────────────
  mk('rect', { x: tlX, y: tlY, width: tlW, height: tlH, class: 'box' });
  mk('rect', { x: trX, y: trY, width: trW, height: trH, class: 'box-accent' });
  mk('rect', { x: blX, y: blY, width: blW, height: blH, class: 'box' });
  mk('rect', { x: brX, y: brY, width: brW, height: brH, class: 'box' });

  // Diagonal top-right box: bottom-left → top-right
  mk('line', { x1: trX, y1: trY + trH, x2: trX + trW, y2: trY, class: 'diag' });

  // View labels
  for (const [x, y, t] of [
    [tlX + tlW / 2, tlY + tlH / 2, 'TOP'],
    // [trX + trW / 2, trY + trH / 2, '3RD APL'],
    [blX + blW / 2, blY + blH / 2, 'FRONT'],
    [brX + brW / 2, brY + brH / 2, 'RIGHT'],
  ]) {
    const lbl = document.createElementNS(SVG_NS, 'text');
    lbl.setAttribute('x', x); lbl.setAttribute('y', y);
    lbl.setAttribute('class', 'view-label');
    lbl.setAttribute('text-anchor', 'middle');
    lbl.setAttribute('dominant-baseline', 'middle');
    lbl.textContent = t;
    _g.appendChild(lbl);
  }

  // ── Shape dimension arrows (blue) ────────────────────────────────────────────
  // Each arrow sits a few px away from its assigned box edge, just outside it.
  // Extension lines (dotted) connect each arrowhead tip to the box corner.
  const OFF = 12; // px gap between box edge and arrow line

  function extDot(x1, y1, x2, y2) {
    mk('line', { x1, y1, x2, y2, class: 'ext-dot' });
  }

  // ── TL box — top edge and left edge ──
  const tlTop = tlY - OFF;   // arrow above TL top edge
  const tlLeft = tlX - OFF;  // arrow left of TL left edge

  dimArrow(tlX, tlTop, tlX + tlW, tlTop, fmt(fW), 'shape');
  extDot(tlX, tlTop, tlX, tlY);
  extDot(tlX + tlW, tlTop, tlX + tlW, tlY);

  dimArrow(tlLeft, tlY, tlLeft, tlY + tlH, fmt(dH), 'shape', { labelSide: 'left' });
  extDot(tlLeft, tlY, tlX, tlY);
  extDot(tlLeft, tlY + tlH, tlX, tlY + tlH);

  // ── TR box — top edge and right edge ──
  const trTop = trY - OFF;
  const trRight = trX + trW + OFF;

  dimArrow(trX, trTop, trX + trW, trTop, fmt(dW), 'shape');
  extDot(trX, trTop, trX, trY);
  extDot(trX + trW, trTop, trX + trW, trY);

  dimArrow(trRight, trY, trRight, trY + trH, fmt(dH), 'shape', { labelSide: 'right' });
  extDot(trRight, trY, trX + trW, trY);
  extDot(trRight, trY + trH, trX + trW, trY + trH);

  // ── BL box — bottom edge and left edge ──
  const blBot = blY + blH + OFF;
  const blLeft = blX - OFF;

  dimArrow(blX, blBot, blX + blW, blBot, fmt(fW), 'shape', { labelOffset: 10 });
  extDot(blX, blBot, blX, blY + blH);
  extDot(blX + blW, blBot, blX + blW, blY + blH);

  dimArrow(blLeft, blY, blLeft, blY + blH, fmt(fH), 'shape', { labelSide: 'left' });
  extDot(blLeft, blY, blX, blY);
  extDot(blLeft, blY + blH, blX, blY + blH);

  // ── BR box — bottom edge and right edge ──
  const brBot = brY + brH + OFF;
  const brRight = brX + brW + OFF;

  dimArrow(brX, brBot, brX + brW, brBot, fmt(dW), 'shape', { labelOffset: 10 });
  extDot(brX, brBot, brX, brY + brH);
  extDot(brX + brW, brBot, brX + brW, brY + brH);

  dimArrow(brRight, brY, brRight, brY + brH, fmt(fH), 'shape', { labelSide: 'right' });
  extDot(brRight, brY, brX + brW, brY);
  extDot(brRight, brY + brH, brX + brW, brY + brH);

  // ── Spacing dimension arrows (red) ────────────────────────────────────────
  //
  // KEY RULE: each spacing region shows its arrow along ONE edge of an
  // adjacent box, with the arrow running exactly from one corner to the next.
  //
  // HORIZONTAL gaps (h0 left, h1 middle, h0 right):
  //   → arrow runs along the TOP edge of the top-row boxes  (y = tlY)
  //   → arrow runs along the BOTTOM edge of the bottom-row boxes (y = blY + blH)
  //   Left gap:   from daX   to tlX,   at y = tlY  (top-left corner of TL box)
  //   Middle gap: from tlX+tlW to trX, at y = tlY  (top edge, between TL and TR)
  //   Right gap:  from trX+trW to daX+daW, at y = tlY
  //   Same repeated at the bottom (blY+blH)
  //
  // VERTICAL gaps (v0 top, v1 middle, v0 bottom):
  //   → arrow runs along LEFT edge of left-col boxes  (x = tlX)
  //   → arrow runs along RIGHT edge of right-col boxes (x = trX + trW)
  //   Top gap:    from daY       to tlY,      at x = tlX
  //   Middle gap: from tlY+tlH  to blY,      at x = tlX
  //   Bottom gap: from blY+blH  to daY+daH,  at x = tlX
  //   Same repeated at right (trX+trW)

  // — Horizontal spacing arrows —
  // Labels go BELOW the top-row arrow (into the gap, away from blue shape arrows above)
  // Labels go ABOVE the bottom-row arrow (into the gap, away from blue shape arrows below)

  // Along top edge of top row (y = tlY) — labels below (+10)
  if (pH0 > 1)
    dimArrow(daX, tlY, tlX, tlY, fmt(h0), 'space', { labelOffset: 10 });
  if (pH1 > 1)
    dimArrow(tlX + tlW, tlY, trX, tlY, fmt(h1), 'space', { labelOffset: 10 });
  if (pH0 > 1)
    dimArrow(trX + trW, tlY, daX + daW, tlY, fmt(h0), 'space', { labelOffset: 10 });

  // Along bottom edge of bottom row (y = blY + blH) — labels above (-8)
  if (pH0 > 1)
    dimArrow(daX, blY + blH, blX, blY + blH, fmt(h0), 'space', { labelOffset: -8 });
  if (pH1 > 1)
    dimArrow(blX + blW, blY + blH, brX, blY + blH, fmt(h1), 'space', { labelOffset: -8 });
  if (pH0 > 1)
    dimArrow(brX + brW, blY + blH, daX + daW, blY + blH, fmt(h0), 'space', { labelOffset: -8 });

  // — Vertical spacing arrows —
  // Labels point INWARD (left-col labels go right, right-col labels go left)
  // so they don't collide with the horizontal arrow labels at the corners.

  // Along left edge of left col (x = tlX) — labels to the RIGHT (inward)
  if (pV0 > 1)
    dimArrow(tlX, daY, tlX, tlY, fmt(v0), 'space', { labelSide: 'right' });
  if (pV1 > 1)
    dimArrow(tlX, tlY + tlH, tlX, blY, fmt(v1), 'space', { labelSide: 'right' });
  if (pV0 > 1)
    dimArrow(tlX, blY + blH, tlX, daY + daH, fmt(v0), 'space', { labelSide: 'right' });

  // Along right edge of right col (x = trX + trW) — labels to the LEFT (inward)
  if (pV0 > 1)
    dimArrow(trX + trW, daY, trX + trW, trY, fmt(v0), 'space', { labelSide: 'left' });
  if (pV1 > 1)
    dimArrow(trX + trW, trY + trH, trX + trW, brY, fmt(v1), 'space', { labelSide: 'left' });
  if (pV0 > 1)
    dimArrow(trX + trW, brY + brH, trX + trW, daY + daH, fmt(v0), 'space', { labelSide: 'left' });
}

// ─── Initial render ───────────────────────────────────────────────────────────
(function init() {
  const { shape } = readInputs();
  render(shape, { v0: 2, v1: 3, h0: 1.2, h1: 2.4 }, false);
})();

window.addEventListener('resize', () => {
  const { shape } = readInputs();
  const calcDone = document.getElementById('results-section').style.display !== 'none';
  if (calcDone) {
    calculate();
  } else {
    render(shape, { v0: 2, v1: 3, h0: 1.2, h1: 2.4 }, false);
  }
});