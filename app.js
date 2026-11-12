'use strict';

/* ------------------------------------------------------------------ *
 * Sheet geometry in mm (must match sheet/make_sheet.py)
 * ------------------------------------------------------------------ */
const SHEET = {
  w: 210, h: 297,
  marker: 10, inset: 7,
  gridX: 17, gridY: 24, cell: 4, cols: 44, rows: 60,
  key: { y: 272, w: 16, h: 12, black: 73, white: 97, grey: 121 },
  greyValue: 128,                       // the key's grey is #808080
};
const S = 8;                            // px per mm in the rectified image
const INSET = 0.14;                     // ignore this border of each square (printed lines, slop)
const FILL_THRESHOLD = 0.65;            // a square counts as solid when >= 65% of it is inked
const INK_THRESHOLD = 48;               // a pixel is "ink" when its darkest channel is this far below paper white
const MERGE_DELTA_E = 10;               // colours closer than this (CIELAB ΔE) share a palette entry;
                                        // small enough that a highlight/shadow shade of a colour stays separate

// the printable sheet, embedded so the download works from any copy of the site
const SHEET_PDF_BASE64 = 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUuMjc2IDg0MS44OV0gL0NvbnRlbnRzIDQgMCBSIC9SZXNvdXJjZXMgPDwgL0ZvbnQgPDwgL0YxIDUgMCBSIC9GMiA2IDAgUiA+PiA+PiA+PgplbmRvYmoKNCAwIG9iago8PCAvTGVuZ3RoIDI5NDIgPj4Kc3RyZWFtCjIuODM1IDAgMCAtMi44MzUgMCA4NDEuODkgY20KMiBKCjAuODE2IDAuODE2IDAuODE2IFJHIDAuMSB3CjIxIDI0IG0gMjEgMjY0IGwKMjUgMjQgbSAyNSAyNjQgbAoyOSAyNCBtIDI5IDI2NCBsCjM3IDI0IG0gMzcgMjY0IGwKNDEgMjQgbSA0MSAyNjQgbAo0NSAyNCBtIDQ1IDI2NCBsCjUzIDI0IG0gNTMgMjY0IGwKNTcgMjQgbSA1NyAyNjQgbAo2MSAyNCBtIDYxIDI2NCBsCjY5IDI0IG0gNjkgMjY0IGwKNzMgMjQgbSA3MyAyNjQgbAo3NyAyNCBtIDc3IDI2NCBsCjg1IDI0IG0gODUgMjY0IGwKODkgMjQgbSA4OSAyNjQgbAo5MyAyNCBtIDkzIDI2NCBsCjEwMSAyNCBtIDEwMSAyNjQgbAoxMDUgMjQgbSAxMDUgMjY0IGwKMTA5IDI0IG0gMTA5IDI2NCBsCjExNyAyNCBtIDExNyAyNjQgbAoxMjEgMjQgbSAxMjEgMjY0IGwKMTI1IDI0IG0gMTI1IDI2NCBsCjEzMyAyNCBtIDEzMyAyNjQgbAoxMzcgMjQgbSAxMzcgMjY0IGwKMTQxIDI0IG0gMTQxIDI2NCBsCjE0OSAyNCBtIDE0OSAyNjQgbAoxNTMgMjQgbSAxNTMgMjY0IGwKMTU3IDI0IG0gMTU3IDI2NCBsCjE2NSAyNCBtIDE2NSAyNjQgbAoxNjkgMjQgbSAxNjkgMjY0IGwKMTczIDI0IG0gMTczIDI2NCBsCjE4MSAyNCBtIDE4MSAyNjQgbAoxODUgMjQgbSAxODUgMjY0IGwKMTg5IDI0IG0gMTg5IDI2NCBsCjE3IDI4IG0gMTkzIDI4IGwKMTcgMzIgbSAxOTMgMzIgbAoxNyAzNiBtIDE5MyAzNiBsCjE3IDQ0IG0gMTkzIDQ0IGwKMTcgNDggbSAxOTMgNDggbAoxNyA1MiBtIDE5MyA1MiBsCjE3IDYwIG0gMTkzIDYwIGwKMTcgNjQgbSAxOTMgNjQgbAoxNyA2OCBtIDE5MyA2OCBsCjE3IDc2IG0gMTkzIDc2IGwKMTcgODAgbSAxOTMgODAgbAoxNyA4NCBtIDE5MyA4NCBsCjE3IDkyIG0gMTkzIDkyIGwKMTcgOTYgbSAxOTMgOTYgbAoxNyAxMDAgbSAxOTMgMTAwIGwKMTcgMTA4IG0gMTkzIDEwOCBsCjE3IDExMiBtIDE5MyAxMTIgbAoxNyAxMTYgbSAxOTMgMTE2IGwKMTcgMTI0IG0gMTkzIDEyNCBsCjE3IDEyOCBtIDE5MyAxMjggbAoxNyAxMzIgbSAxOTMgMTMyIGwKMTcgMTQwIG0gMTkzIDE0MCBsCjE3IDE0NCBtIDE5MyAxNDQgbAoxNyAxNDggbSAxOTMgMTQ4IGwKMTcgMTU2IG0gMTkzIDE1NiBsCjE3IDE2MCBtIDE5MyAxNjAgbAoxNyAxNjQgbSAxOTMgMTY0IGwKMTcgMTcyIG0gMTkzIDE3MiBsCjE3IDE3NiBtIDE5MyAxNzYgbAoxNyAxODAgbSAxOTMgMTgwIGwKMTcgMTg4IG0gMTkzIDE4OCBsCjE3IDE5MiBtIDE5MyAxOTIgbAoxNyAxOTYgbSAxOTMgMTk2IGwKMTcgMjA0IG0gMTkzIDIwNCBsCjE3IDIwOCBtIDE5MyAyMDggbAoxNyAyMTIgbSAxOTMgMjEyIGwKMTcgMjIwIG0gMTkzIDIyMCBsCjE3IDIyNCBtIDE5MyAyMjQgbAoxNyAyMjggbSAxOTMgMjI4IGwKMTcgMjM2IG0gMTkzIDIzNiBsCjE3IDI0MCBtIDE5MyAyNDAgbAoxNyAyNDQgbSAxOTMgMjQ0IGwKMTcgMjUyIG0gMTkzIDI1MiBsCjE3IDI1NiBtIDE5MyAyNTYgbAoxNyAyNjAgbSAxOTMgMjYwIGwKUwowLjYwNCAwLjYwNCAwLjYwNCBSRyAwLjI1IHcKMTcgMjQgbSAxNyAyNjQgbAozMyAyNCBtIDMzIDI2NCBsCjQ5IDI0IG0gNDkgMjY0IGwKNjUgMjQgbSA2NSAyNjQgbAo4MSAyNCBtIDgxIDI2NCBsCjk3IDI0IG0gOTcgMjY0IGwKMTEzIDI0IG0gMTEzIDI2NCBsCjEyOSAyNCBtIDEyOSAyNjQgbAoxNDUgMjQgbSAxNDUgMjY0IGwKMTYxIDI0IG0gMTYxIDI2NCBsCjE3NyAyNCBtIDE3NyAyNjQgbAoxOTMgMjQgbSAxOTMgMjY0IGwKMTcgMjQgbSAxOTMgMjQgbAoxNyA0MCBtIDE5MyA0MCBsCjE3IDU2IG0gMTkzIDU2IGwKMTcgNzIgbSAxOTMgNzIgbAoxNyA4OCBtIDE5MyA4OCBsCjE3IDEwNCBtIDE5MyAxMDQgbAoxNyAxMjAgbSAxOTMgMTIwIGwKMTcgMTM2IG0gMTkzIDEzNiBsCjE3IDE1MiBtIDE5MyAxNTIgbAoxNyAxNjggbSAxOTMgMTY4IGwKMTcgMTg0IG0gMTkzIDE4NCBsCjE3IDIwMCBtIDE5MyAyMDAgbAoxNyAyMTYgbSAxOTMgMjE2IGwKMTcgMjMyIG0gMTkzIDIzMiBsCjE3IDI0OCBtIDE5MyAyNDggbAoxNyAyNjQgbSAxOTMgMjY0IGwKUwowIEogMC4zMzMgMC4zMzMgMC4zMzMgUkcgMC4zNSB3CjE3IDI2MCA0IDQgcmUKMTcgMjU2IDggOCByZQoxNyAyNTIgMTIgMTIgcmUKMTcgMjQ4IDE2IDE2IHJlClMKMCAwIDAgcmcKNyA3IDEwIDEwIHJlCjE5MyA3IDEwIDEwIHJlCjcgMjgwIDEwIDEwIHJlCjE5MyAyODAgMTAgMTAgcmUKZgowIEogMC42MDQgMC42MDQgMC42MDQgUkcgMC4yIHcKMCAwIDAgcmcgNzMgMjcyIDE2IDEyIHJlIEIKMSAxIDEgcmcgOTcgMjcyIDE2IDEyIHJlIEIKMC41MDIgMC41MDIgMC41MDIgcmcgMTIxIDI3MiAxNiAxMiByZSBCCjAuMzMzIDAuMzMzIDAuMzMzIHJnIEJUIC9GMiAxIFRmIDUgMCAwIC01IDk0LjQ0IDE1LjYgVG0gKFBpeGlEcmF3KSBUaiBFVAowLjYwNCAwLjYwNCAwLjYwNCByZyBCVCAvRjEgMSBUZiAyLjIgMCAwIC0yLjIgMzUgMjY3LjQgVG0gKGNvbG91ciBibGFjayBhIGJveCB0aGUgZGVzaXJlZCBzaXplIG9mIHBpeGVscykgVGogRVQKMC42MDQgMC42MDQgMC42MDQgcmcgQlQgL0YxIDEgVGYgMi42IDAgMCAtMi42IDQ4IDI3OSBUbSAoY29sb3VyIGtleSkgVGogRVQKMC43NjkgMC43NjkgMC43NjkgcmcgQlQgL0YxIDEgVGYgMiAwIDAgLTIgOTQuODg0IDI5NC42IFRtIChtYWRlIGJ5IEFyeWFuIFBhdGhhaykgVGogRVQKMC42MDQgMC42MDQgMC42MDQgcmcgQlQgL0YxIDEgVGYgMi4yIDAgMCAtMi4yIDE4LjQgMjY3LjQgVG0gKDEpIFRqIEVUCjAuNjA0IDAuNjA0IDAuNjA0IHJnIEJUIC9GMSAxIFRmIDIuMiAwIDAgLTIuMiAyMi40IDI2Ny40IFRtICgyKSBUaiBFVAowLjYwNCAwLjYwNCAwLjYwNCByZyBCVCAvRjEgMSBUZiAyLjIgMCAwIC0yLjIgMjYuNCAyNjcuNCBUbSAoMykgVGogRVQKMC42MDQgMC42MDQgMC42MDQgcmcgQlQgL0YxIDEgVGYgMi4yIDAgMCAtMi4yIDMwLjQgMjY3LjQgVG0gKDQpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgPj4KZW5kb2JqCjYgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgPj4KZW5kb2JqCnhyZWYKMCA3CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY0IDAwMDAwIG4gCjAwMDAwMDAxMjEgMDAwMDAgbiAKMDAwMDAwMDI2NCAwMDAwMCBuIAowMDAwMDAzMjU4IDAwMDAwIG4gCjAwMDAwMDMzNTUgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA3IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgozNDU3CiUlRU9GCg=='; // generated by sheet/make_sheet.py
(() => {
  const bytes = Uint8Array.from(atob(SHEET_PDF_BASE64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  document.querySelectorAll('a.sheetPdf').forEach((a) => { a.href = url; a.download = 'pixidraw-sheet.pdf'; });
})();

const $ = (id) => document.getElementById(id);
const els = {
  status: $('status'), file: $('file'), dropZone: $('dropZone'),
  edit: $('edit'), editEmpty: $('editEmpty'), palette: $('palette'),
  brush: $('brush'), eraser: $('eraser'), undo: $('undo'), scale: $('scale'),
  rotLeft: $('rotLeft'), rotRight: $('rotRight'), flip: $('flip'), onion: $('onion'),
  colourEdit: $('colourEdit'), colourHex: $('colourHex'), addColour: $('addColour'),
  exportPng: $('exportPng'), saveFrame: $('saveFrame'),
  frames: $('frames'), frameCount: $('frameCount'), preview: $('preview'), saveAnim: $('saveAnim'),
};

const state = {
  rectified: null,   // ImageData: warped + colour-corrected page, S px/mm
  analysis: null,    // { blockN, n, cols, rows, cells[] }
  drawing: null,     // editing buffer (character + padding): { cell, x, y, w, h, palette: ['#rrggbb'], data: Uint8Array }
                     // data: 0 = empty, i+1 = palette[i]; x/y = buffer's position on the sheet
  undo: [],
  frames: [],        // cropped drawings: { cell, x, y, w, h, palette, data }
  editing: null,     // the saved frame currently loaded in the editor, if any
  tool: null,        // null | 'brush' | 'eraser'
  colour: -1,        // selected palette index for the brush
};

function setStatus(msg, isError) {
  els.status.textContent = msg;
  els.status.classList.toggle('error', !!isError);
}

/* ------------------------------------------------------------------ *
 * OpenCV loading
 * ------------------------------------------------------------------ */
const cvReady = new Promise((resolve, reject) => {
  window.__cvLoaded = async () => {
    try {
      if (window.cv instanceof Promise) window.cv = await window.cv;
      if (window.cv.Mat) resolve(); else window.cv.onRuntimeInitialized = resolve;
    } catch (e) { reject(e); }
  };
  window.__cvFailed = () => reject(new Error('Could not load OpenCV.js (needs an internet connection).'));
});
cvReady.then(() => setStatus('Ready. Upload a photo of the sheet.'), (e) => setStatus(e.message, true));

/* ------------------------------------------------------------------ *
 * Step 1: find the 4 corner markers and warp the page to a rectangle
 * ------------------------------------------------------------------ */

// every solid, roughly square dark blob = a possible marker
function markerCandidates(cv, bin, imgArea) {
  const contours = new cv.MatVector(), hier = new cv.Mat();
  cv.findContours(bin, contours, hier, cv.RETR_LIST, cv.CHAIN_APPROX_NONE);
  const cands = [];
  for (let i = 0; i < contours.size(); i++) {
    const c = contours.get(i);
    const area = cv.contourArea(c);
    if (area > imgArea * 0.00003 && area < imgArea * 0.02) {
      const r = cv.boundingRect(c);
      const mr = cv.minAreaRect(c).size;          // rotated box, so tilted squares still count as solid
      const aspect = mr.width / mr.height;
      if (aspect > 0.55 && aspect < 1.8 && area / (mr.width * mr.height) > 0.75) {
        // extreme points along the diagonals = the square's 4 corners (sheet is roughly upright)
        const p = c.data32S;
        let tl = 0, br = 0, tr = 0, bl = 0;
        for (let k = 0; k < p.length; k += 2) {
          const s = p[k] + p[k + 1], d = p[k] - p[k + 1];
          if (s < p[tl] + p[tl + 1]) tl = k;
          if (s > p[br] + p[br + 1]) br = k;
          if (d > p[tr] - p[tr + 1]) tr = k;
          if (d < p[bl] - p[bl + 1]) bl = k;
        }
        const pt = (k) => [p[k], p[k + 1]];
        cands.push({ cx: r.x + r.width / 2, cy: r.y + r.height / 2, side: Math.sqrt(area), corners: [pt(tl), pt(tr), pt(bl), pt(br)] });
      }
    }
    c.delete();
  }
  contours.delete(); hier.delete();
  return cands;
}

// Choose the 4 candidates that are laid out like the sheet's markers: a quadrilateral with the
// sheet's proportions, similar-sized squares, and squares the right size for that quadrilateral.
// Works whether or not the photo is cropped; among valid layouts the largest one wins.
function pickMarkers(all) {
  const span = SHEET.w - 2 * SHEET.inset - SHEET.marker;           // distance between marker centres
  const RATIO = (SHEET.h - 2 * SHEET.inset - SHEET.marker) / span;
  const SIDE = SHEET.marker / span;
  const cands = all.sort((a, b) => b.side - a.side).slice(0, 60);
  const dist = (a, b) => Math.hypot(a.cx - b.cx, a.cy - b.cy);
  const n = cands.length;
  let best = null, bestArea = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) for (let l = k + 1; l < n; l++) {
    const q = [cands[i], cands[j], cands[k], cands[l]];
    let tl = q[0], tr = q[0], bl = q[0], br = q[0];
    for (const c of q) {
      if (c.cx + c.cy < tl.cx + tl.cy) tl = c;
      if (c.cx + c.cy > br.cx + br.cy) br = c;
      if (c.cx - c.cy > tr.cx - tr.cy) tr = c;
      if (c.cx - c.cy < bl.cx - bl.cy) bl = c;
    }
    if (new Set([tl, tr, bl, br]).size < 4) continue;
    const top = dist(tl, tr), bottom = dist(bl, br), left = dist(tl, bl), right = dist(tr, br);
    // opposite sides may differ up to ~2x (strong perspective)
    if (Math.abs(Math.log(top / bottom)) > 0.75 || Math.abs(Math.log(left / right)) > 0.75) continue;
    // a rectangle seen in perspective keeps its diagonals similar; a sheared shape doesn't
    if (Math.abs(Math.log(dist(tl, br) / dist(tr, bl))) > 0.25) continue;
    const w = (top + bottom) / 2, h = (left + right) / 2;
    if (Math.abs(Math.log(h / w / RATIO)) > 0.35) continue;
    // each marker should be the right size for the edges next to it ...
    const fit = (c, horiz, vert) => Math.abs(Math.log(c.side / ((horiz + vert / RATIO) / 2) / SIDE));
    if (fit(tl, top, left) > 0.5 || fit(tr, top, right) > 0.5 || fit(bl, bottom, left) > 0.5 || fit(br, bottom, right) > 0.5) continue;
    // ... and markers should shrink / grow with perspective the same way the edges do
    if (Math.abs(Math.log(((bl.side + br.side) / (tl.side + tr.side)) / (bottom / top))) > 0.35) continue;
    if (Math.abs(Math.log(((tr.side + br.side) / (tl.side + bl.side)) / (right / left))) > 0.35) continue;
    if (w * h > bestArea) { bestArea = w * h; best = [tl, tr, bl, br]; }
  }
  return best;
}

function rectify(srcCanvas) {
  const cv = window.cv;
  const mats = [];
  const M = (m) => (mats.push(m), m);
  try {
    const src = M(cv.imread(srcCanvas));
    const gray = M(new cv.Mat());
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    const imgArea = src.cols * src.rows;

    // Global (Otsu) threshold first; adaptive threshold as a fallback for uneven lighting.
    let found = null;
    for (const mode of ['otsu', 'adaptive']) {
      const bin = M(new cv.Mat());
      if (mode === 'otsu') cv.threshold(gray, bin, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU);
      else {
        const block = (Math.round(Math.max(src.cols, src.rows) / 8) | 1);
        cv.adaptiveThreshold(gray, bin, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY_INV, block, 25);
      }
      found = pickMarkers(markerCandidates(cv, bin, imgArea));
      if (found) break;
    }
    if (!found) {
      throw new Error('Could not find the 4 corner markers. Make sure all four black squares are visible and the sheet is upright.');
    }

    // 16 correspondences: each marker's TL, TR, BL, BR -> known mm positions
    const a = SHEET.inset, b = SHEET.inset + SHEET.marker;
    const mmOrigins = [[a, a], [SHEET.w - b, a], [a, SHEET.h - b], [SHEET.w - b, SHEET.h - b]];
    const offs = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const from = [], to = [];
    found.forEach((f, i) => f.corners.forEach((c, j) => {
      from.push(c[0] + 0.5, c[1] + 0.5);
      to.push((mmOrigins[i][0] + offs[j][0] * SHEET.marker) * S, (mmOrigins[i][1] + offs[j][1] * SHEET.marker) * S);
    }));
    const fromMat = M(cv.matFromArray(16, 1, cv.CV_32FC2, from));
    const toMat = M(cv.matFromArray(16, 1, cv.CV_32FC2, to));
    const Hm = M(cv.findHomography(fromMat, toMat));
    if (Hm.empty()) throw new Error('Could not compute the page warp.');

    const out = M(new cv.Mat());
    cv.warpPerspective(src, out, Hm, new cv.Size(SHEET.w * S, SHEET.h * S), cv.INTER_LINEAR, cv.BORDER_REPLICATE);
    return new ImageData(new Uint8ClampedArray(out.data), out.cols, out.rows);
  } finally {
    mats.forEach((m) => m.delete());
  }
}

/* ------------------------------------------------------------------ *
 * Step 2: colour-correct using the printed key (black / white / grey)
 * ------------------------------------------------------------------ */
function meanPatch(img, xmm, ymm, wmm, hmm) {
  const x0 = Math.round(xmm * S), x1 = Math.round((xmm + wmm) * S);
  const y0 = Math.round(ymm * S), y1 = Math.round((ymm + hmm) * S);
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0, i = (y * img.width + x0) * 4; x < x1; x++, i += 4) {
      sum[0] += img.data[i]; sum[1] += img.data[i + 1]; sum[2] += img.data[i + 2]; n++;
    }
  }
  return sum.map((v) => v / n);
}

function colourCorrect(img) {
  const k = SHEET.key;
  const patch = (x) => meanPatch(img, x + k.w * 0.25, k.y + k.h * 0.25, k.w * 0.5, k.h * 0.5);
  const black = patch(k.black), white = patch(k.white), grey = patch(k.grey);
  const luts = [0, 1, 2].map((c) => {
    const b = black[c], w = white[c];
    let g = grey[c];
    const mid = SHEET.greyValue;
    const lut = new Uint8ClampedArray(256);
    if (w - b < 20) { for (let v = 0; v < 256; v++) lut[v] = v; return lut; }   // key unreadable: leave as is
    if (!(g > b + 6 && g < w - 6)) g = b + (w - b) * (mid / 255);              // bad grey: fall back to linear
    for (let v = 0; v < 256; v++) {
      lut[v] = v <= b ? 0 : v >= w ? 255 : v < g ? ((v - b) / (g - b)) * mid : mid + ((v - g) / (w - g)) * (255 - mid);
    }
    return lut;
  });
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = luts[0][d[i]]; d[i + 1] = luts[1][d[i + 1]]; d[i + 2] = luts[2][d[i + 2]];
  }
  return { black, white, grey };
}

/* ------------------------------------------------------------------ *
 * Step 3: look at one square of the software grid
 * ------------------------------------------------------------------ */
function median(arr) {
  arr.sort((a, b) => a - b);
  return arr[arr.length >> 1];
}

// fill = fraction of the square covered by ink, dark = fraction that is near-black,
// rgb = colour at the centre of the square
function squareStats(img, xmm, ymm, sizemm, inkT) {
  const x0 = Math.round((xmm + sizemm * INSET) * S), x1 = Math.round((xmm + sizemm * (1 - INSET)) * S);
  const y0 = Math.round((ymm + sizemm * INSET) * S), y1 = Math.round((ymm + sizemm * (1 - INSET)) * S);
  const d = img.data;
  let ink = 0, dark = 0, n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0, i = (y * img.width + x0) * 4; x < x1; x++, i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (255 - Math.min(r, g, b) > inkT) ink++;
      if (0.299 * r + 0.587 * g + 0.114 * b < 110) dark++;
      n++;
    }
  }
  const cx0 = Math.round((xmm + sizemm * 0.35) * S), cx1 = Math.round((xmm + sizemm * 0.65) * S);
  const cy0 = Math.round((ymm + sizemm * 0.35) * S), cy1 = Math.round((ymm + sizemm * 0.65) * S);
  const rs = [], gs = [], bs = [];
  for (let y = cy0; y < cy1; y++) {
    for (let x = cx0, i = (y * img.width + cx0) * 4; x < cx1; x++, i += 4) {
      rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]);
    }
  }
  return { fill: ink / n, dark: dark / n, rgb: [median(rs), median(gs), median(bs)] };
}

/* ------------------------------------------------------------------ *
 * Step 4: read the size block, lay the pixel grid, read every pixel
 * ------------------------------------------------------------------ */
function analyse() {
  const img = state.rectified;
  if (!img) return;
  const fillT = FILL_THRESHOLD, inkT = INK_THRESHOLD;
  const g = SHEET;

  // Size block: grow an N x N block of 4 mm squares from the grid's bottom-left corner
  // while every square in it is filled black.
  const isBlack = (col, row) => squareStats(img, g.gridX + col * g.cell, g.gridY + row * g.cell, g.cell, inkT).dark >= fillT;
  const last = g.rows - 1;
  let blockN = 0;
  while (blockN < Math.min(g.cols, g.rows)) {
    const k = blockN;                    // test the next ring: column k and row (rows-1-k)
    let ok = true;
    for (let j = 0; j <= k && ok; j++) ok = isBlack(k, last - j) && isBlack(j, last - k);
    if (!ok) break;
    blockN++;
  }

  const n = blockN || 1;
  const size = n * g.cell;
  const cols = Math.floor(g.cols / n), rows = Math.floor(g.rows / n);

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // skip pixels that overlap the size block
      const inBlock = c * n < blockN && (r + 1) * n > g.rows - blockN;
      if (inBlock) { cells.push(null); continue; }
      const st = squareStats(img, g.gridX + c * size, g.gridY + r * size, size, inkT);
      cells.push(st.fill >= fillT ? st.rgb : null);
    }
  }
  state.analysis = { blockN, n, cols, rows, cells };
  buildDrawing();
}

/* ------------------------------------------------------------------ *
 * Step 5: palette + indexed storage
 * ------------------------------------------------------------------ */
function rgb2lab([r, g, b]) {
  const f = (v) => { v /= 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; };
  const R = f(r), G = f(g), B = f(b);
  const h = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = h((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const Y = h(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const Z = h((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const labDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const fromHex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Colours closer than `threshold` (CIELAB delta-E) become one palette entry.
function quantise(colours, threshold) {
  const clusters = [];                   // { sum: [r,g,b], count, lab }
  const assign = new Array(colours.length);
  const nearest = (lab) => {
    let best = -1, bd = Infinity;
    clusters.forEach((cl, i) => { const d = labDist(lab, cl.lab); if (d < bd) { bd = d; best = i; } });
    return [best, bd];
  };
  const add = (cl, rgb) => {
    cl.count++;
    for (let k = 0; k < 3; k++) cl.sum[k] += rgb[k];
    cl.lab = rgb2lab(cl.sum.map((v) => v / cl.count));
  };
  const labs = colours.map(rgb2lab);
  colours.forEach((rgb, i) => {
    const [best, bd] = nearest(labs[i]);
    if (best >= 0 && bd <= threshold) add(clusters[best], rgb);
    else clusters.push({ sum: rgb.slice(), count: 1, lab: labs[i] });
  });
  // second pass: every colour goes to its nearest final centre
  const centres = clusters.map((cl) => cl.lab);
  clusters.forEach((cl) => { cl.sum = [0, 0, 0]; cl.count = 0; });
  colours.forEach((rgb, i) => {
    let best = 0, bd = Infinity;
    centres.forEach((c, j) => { const d = labDist(labs[i], c); if (d < bd) { bd = d; best = j; } });
    assign[i] = best;
    clusters[best].count++;
    for (let k = 0; k < 3; k++) clusters[best].sum[k] += rgb[k];
  });
  const remap = [], palette = [];
  clusters.forEach((cl, i) => {
    if (cl.count) { remap[i] = palette.length; palette.push(toHex(cl.sum.map((v) => v / cl.count))); }
  });
  return { palette, assign: assign.map((a) => remap[a]) };
}

function buildDrawing() {
  const a = state.analysis;
  const colours = [], where = [];
  a.cells.forEach((rgb, i) => { if (rgb) { colours.push(rgb); where.push(i); } });
  const { palette, assign } = quantise(colours, MERGE_DELTA_E);
  // The editor works on the sheet's whole pixel grid, so there is room to paint around the
  // character. Export and frames are cropped to the character (see cropDrawing).
  const data = new Uint8Array(a.cols * a.rows);
  where.forEach((i, k) => { data[i] = assign[k] + 1; });
  state.drawing = { cell: a.n, x: 0, y: 0, w: a.cols, h: a.rows, palette, data };
  fitCanvas(state.drawing);
  state.undo = [];
  state.colour = palette.length ? 0 : -1;
  state.editing = null;
  renderEditor(true);
  renderFrames();

  const what = a.blockN ? `size block ${a.blockN}×${a.blockN}` : 'no size block found';
  const box = bbox(state.drawing);
  setStatus(`Pixel = ${a.n * SHEET.cell} mm (${what}) · character ${box ? `${box.w}×${box.h}` : '0×0'} px · ${palette.length} colours`);
}

// bounding box of all painted pixels, or null when empty
function bbox(d) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < d.h; y++) {
    for (let x = 0; x < d.w; x++) {
      if (!d.data[y * d.w + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Tight crop around the character, with the palette trimmed to the colours it uses.
// x / y keep its position on the sheet so animation frames stay aligned.
function cropDrawing(d) {
  const b = bbox(d);
  if (!b) return null;
  const remap = new Map(), palette = [], data = new Uint8Array(b.w * b.h);
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const v = d.data[(b.y + y) * d.w + b.x + x];
      if (!v) continue;
      if (!remap.has(v)) { remap.set(v, palette.length + 1); palette.push(d.palette[v - 1]); }
      data[y * b.w + x] = remap.get(v);
    }
  }
  return { cell: d.cell, x: d.x + b.x, y: d.y + b.y, w: b.w, h: b.h, palette, data };
}

// The editing canvas is fixed when a drawing is loaded: a square around the character with
// PAD empty pixels on every side (square so rotating never changes its size).
// d.x / d.y track where the canvas sits on the sheet (can go negative).
const PAD = 5;
function fitCanvas(d) {
  const b = bbox(d) || { x: Math.floor(d.w / 2), y: Math.floor(d.h / 2), w: 1, h: 1 };
  const side = Math.max(b.w, b.h) + 2 * PAD;
  const ox = b.x - PAD - Math.floor((side - 2 * PAD - b.w) / 2);
  const oy = b.y - PAD - Math.floor((side - 2 * PAD - b.h) / 2);
  const data = new Uint8Array(side * side);
  for (let y = 0; y < d.h; y++) {
    for (let x = 0; x < d.w; x++) {
      const v = d.data[y * d.w + x], nx = x - ox, ny = y - oy;
      if (v && nx >= 0 && ny >= 0 && nx < side && ny < side) data[ny * side + nx] = v;
    }
  }
  Object.assign(d, { x: d.x + ox, y: d.y + oy, w: side, h: side, data });
}

// rotate a quarter turn (dir 1 = clockwise, -1 = anticlockwise); the canvas is square
function rotate(d, dir) {
  const n = d.w, data = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const [nx, ny] = dir > 0 ? [n - 1 - y, x] : [y, n - 1 - x];
      data[ny * n + nx] = d.data[y * n + x];
    }
  }
  d.data = data;
}

// mirror left <-> right
function flip(d) {
  const data = new Uint8Array(d.w * d.h);
  for (let y = 0; y < d.h; y++) {
    for (let x = 0; x < d.w; x++) data[y * d.w + d.w - 1 - x] = d.data[y * d.w + x];
  }
  d.data = data;
}

// the frame shown faintly behind the drawing: the previous frame when editing a saved one,
// otherwise the last saved frame
function onionFrame() {
  if (!els.onion.checked) return null;
  const f = state.frames, i = state.editing ? f.indexOf(state.editing) : f.length;
  return i > 0 ? f[i - 1] : null;
}

function snapshot() {
  state.undo.push(state.drawing.data.slice());
  if (state.undo.length > 50) state.undo.shift();
}

// transparent background: grey/white checks, one check per drawing pixel
function drawChecker(ctx, cols, rows, z, ox = 0, oy = 0) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#d9d9d9' : '#ffffff';
      ctx.fillRect(ox + x * z, oy + y * z, z, z);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Editor
 * ------------------------------------------------------------------ */
function paintDrawing(ctx, d, scale, keep) {
  if (!keep) ctx.clearRect(0, 0, d.w * scale, d.h * scale);
  for (let y = 0; y < d.h; y++) {
    for (let x = 0; x < d.w; x++) {
      const v = d.data[y * d.w + x];
      if (!v) continue;
      ctx.fillStyle = d.palette[v - 1];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

function drawingCanvas(d, scale) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, d.w * scale); c.height = Math.max(1, d.h * scale);
  paintDrawing(c.getContext('2d'), d, scale);
  return c;
}

function renderEditor(rebuildPalette) {
  const d = state.drawing;
  const box = d && bbox(d);
  els.edit.classList.toggle('on', !!d);
  els.editEmpty.hidden = !!d;
  els.exportPng.disabled = els.saveFrame.disabled = !box;
  els.undo.disabled = !state.undo.length;
  els.brush.disabled = els.eraser.disabled = els.addColour.disabled = els.rotLeft.disabled = els.rotRight.disabled = els.flip.disabled = !d;
  const editingIndex = state.editing ? state.frames.indexOf(state.editing) : -1;
  els.saveFrame.textContent = editingIndex < 0 ? 'Save as frame' : `Save frame ${editingIndex + 1}`;
  els.colourEdit.disabled = !d || state.colour < 0;

  if (d) {
    const z = Math.max(4, Math.min(40, Math.floor(640 / Math.max(d.w, d.h))));
    if (els.edit.width !== d.w * z || els.edit.height !== d.h * z) {
      els.edit.width = d.w * z; els.edit.height = d.h * z;
    }
    const ctx = els.edit.getContext('2d');
    drawChecker(ctx, d.w, d.h, z);
    const onion = onionFrame();
    if (onion) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(drawingCanvas(onion, z), (onion.x - d.x) * z, (onion.y - d.y) * z);
      ctx.globalAlpha = 1;
    }
    paintDrawing(ctx, d, z, true);
    // faint pixel grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < d.w; x++) { ctx.moveTo(x * z + 0.5, 0); ctx.lineTo(x * z + 0.5, d.h * z); }
    for (let y = 1; y < d.h; y++) { ctx.moveTo(0, y * z + 0.5); ctx.lineTo(d.w * z, y * z + 0.5); }
    ctx.stroke();
    // the character's bounds = what gets exported / saved as a frame
    if (box) {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(43, 89, 195, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x * z + 1, box.y * z + 1, box.w * z - 2, box.h * z - 2);
      ctx.setLineDash([]);
    }
  }

  if (rebuildPalette) {
    els.palette.textContent = '';
    (d ? d.palette : []).forEach((hex, i) => {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.style.background = hex;
      b.title = hex;
      b.addEventListener('click', () => {
        state.colour = i;
        setTool('brush');
        renderEditor(true);
      });
      els.palette.append(b);
    });
  }
  [...els.palette.children].forEach((b, i) => b.setAttribute('aria-pressed', i === state.colour));
  const hex = d && state.colour >= 0 ? d.palette[state.colour] : '#000000';
  els.colourEdit.value = hex;
  els.colourHex.textContent = d && state.colour >= 0 ? hex : '';
}

function setTool(t) {
  state.tool = t;
  els.brush.setAttribute('aria-pressed', t === 'brush');
  els.eraser.setAttribute('aria-pressed', t === 'eraser');
  els.edit.classList.toggle('painting', !!t);
}
els.brush.addEventListener('click', () => setTool(state.tool === 'brush' ? null : 'brush'));
els.eraser.addEventListener('click', () => setTool(state.tool === 'eraser' ? null : 'eraser'));

// editing a palette colour recolours every pixel that uses it
els.colourEdit.addEventListener('input', () => {
  const d = state.drawing;
  if (!d || state.colour < 0) return;
  d.palette[state.colour] = els.colourEdit.value;
  const sw = els.palette.children[state.colour];
  sw.style.background = sw.title = els.colourEdit.value;
  renderEditor(false);
});
els.addColour.addEventListener('click', () => {
  const d = state.drawing;
  if (!d) return;
  d.palette.push(state.colour >= 0 ? d.palette[state.colour] : '#000000');
  state.colour = d.palette.length - 1;
  setTool('brush');
  renderEditor(true);
  els.colourEdit.click();                   // open the system colour picker for the new colour
});

function cellAt(ev) {
  const d = state.drawing, r = els.edit.getBoundingClientRect();
  return [Math.floor(((ev.clientX - r.left) / r.width) * d.w), Math.floor(((ev.clientY - r.top) / r.height) * d.h)];
}
function paintCell(x, y) {
  const d = state.drawing;
  if (x < 0 || y < 0 || x >= d.w || y >= d.h) return false;
  const v = state.tool === 'brush' ? state.colour + 1 : 0;
  if (d.data[y * d.w + x] === v) return false;
  d.data[y * d.w + x] = v;
  return true;
}
// paint every cell on the line between two cells, so fast strokes leave no gaps
function paintLine(x0, y0, x1, y1) {
  let changed = false;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    changed = paintCell(x0, y0) || changed;
    if (x0 === x1 && y0 === y1) return changed;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

let lastCell = null;
els.edit.addEventListener('pointerdown', (ev) => {
  if (!state.drawing || !state.tool || (state.tool === 'brush' && state.colour < 0)) return;
  els.edit.setPointerCapture(ev.pointerId);
  snapshot();
  lastCell = cellAt(ev);
  paintCell(...lastCell);
  renderEditor(false);
});
els.edit.addEventListener('pointermove', (ev) => {
  if (!lastCell) return;
  const cell = cellAt(ev);
  if (paintLine(lastCell[0], lastCell[1], cell[0], cell[1])) renderEditor(false);
  lastCell = cell;
});
['pointerup', 'pointercancel'].forEach((t) => els.edit.addEventListener(t, () => {
  lastCell = null;
}));
els.undo.addEventListener('click', () => {
  const prev = state.undo.pop();
  if (prev) { state.drawing.data = prev; renderEditor(false); }
});
[['rotLeft', (d) => rotate(d, -1)], ['rotRight', (d) => rotate(d, 1)], ['flip', flip]].forEach(([id, fn]) => {
  els[id].addEventListener('click', () => {
    if (!state.drawing) return;
    snapshot();
    fn(state.drawing);
    renderEditor(false);
  });
});
els.onion.addEventListener('change', () => renderEditor(false));

/* ------------------------------------------------------------------ *
 * Export + frames
 * ------------------------------------------------------------------ */
function download(canvas, name) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
}

els.exportPng.addEventListener('click', () => {
  const c = cropDrawing(state.drawing);
  if (c) download(drawingCanvas(c, +els.scale.value), 'pixidraw.png');
});

// Save as frame: adds a new frame, or overwrites the frame being edited
els.saveFrame.addEventListener('click', () => {
  const c = cropDrawing(state.drawing);
  if (!c) return;
  const i = state.editing ? state.frames.indexOf(state.editing) : -1;
  if (i >= 0) state.frames[i] = c; else state.frames.push(c);
  state.editing = null;
  renderFrames();
});

// load a saved frame back into the editor
function editFrame(f) {
  state.drawing = { cell: f.cell, x: f.x, y: f.y, w: f.w, h: f.h, palette: f.palette.slice(), data: f.data.slice() };
  fitCanvas(state.drawing);
  state.undo = [];
  state.colour = f.palette.length ? 0 : -1;
  state.editing = f;
  renderEditor(true);
  renderFrames();
}

// union of every frame's crop box: frames share one cell size and keep their relative positions
function framesBox() {
  const f = state.frames;
  const x0 = Math.min(...f.map((a) => a.x)), y0 = Math.min(...f.map((a) => a.y));
  const x1 = Math.max(...f.map((a) => a.x + a.w)), y1 = Math.max(...f.map((a) => a.y + a.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function renderFrames() {
  els.frameCount.textContent = state.frames.length;
  els.saveAnim.disabled = !state.frames.length;
  els.frames.textContent = '';
  if (state.drawing) renderEditor(false);      // onion skin and the save label depend on the frames
  if (!state.frames.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'No frames yet. Use “Save as frame”, then upload the next drawing.';
    els.frames.append(p);
    return;
  }
  const u = framesBox();
  const z = Math.max(1, Math.floor(80 / Math.max(u.w, u.h)));
  state.frames.forEach((f, i) => {
    const box = document.createElement('div');
    box.className = 'frame' + (f === state.editing ? ' editing' : '');
    const c = document.createElement('canvas');
    c.width = u.w * z; c.height = u.h * z;
    const ctx = c.getContext('2d');
    drawChecker(ctx, u.w, u.h, z);
    ctx.drawImage(drawingCanvas(f, z), (f.x - u.x) * z, (f.y - u.y) * z);
    c.title = 'Edit this frame';
    c.addEventListener('click', () => editFrame(f));
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = i + 1;
    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '×'; del.title = 'Remove frame';
    del.addEventListener('click', () => {
      state.frames.splice(i, 1);
      if (state.editing === f) state.editing = null;
      renderFrames();
    });
    box.append(c, num, del);
    els.frames.append(box);
  });
}

// sprite sheet: one row, every frame in a cell the size of the frames' combined bounds,
// with a 1 px transparent gap between frames (1 px of the PNG, whatever the export scale)
const FRAME_GAP = 1;
els.saveAnim.addEventListener('click', () => {
  const u = framesBox(), scale = +els.scale.value;
  const fw = u.w * scale, fh = u.h * scale, count = state.frames.length;
  const sheet = document.createElement('canvas');
  sheet.width = fw * count + FRAME_GAP * (count - 1); sheet.height = fh;
  const ctx = sheet.getContext('2d');
  state.frames.forEach((f, i) => {
    ctx.drawImage(drawingCanvas(f, scale), i * (fw + FRAME_GAP) + (f.x - u.x) * scale, (f.y - u.y) * scale);
  });
  download(sheet, `pixidraw-sprites-${count}x${fw}x${fh}-gap${FRAME_GAP}.png`);
});

// preview: loops the frames at a fixed rate
const PREVIEW_MS = 160;
let previewIndex = -1;
function tickPreview() {
  const ctx = els.preview.getContext('2d');
  ctx.clearRect(0, 0, els.preview.width, els.preview.height);
  if (state.frames.length) {
    const u = framesBox();
    const z = Math.max(1, Math.floor(96 / Math.max(u.w, u.h)));
    const ox = Math.floor((96 - u.w * z) / 2), oy = Math.floor((96 - u.h * z) / 2);
    previewIndex = (previewIndex + 1) % state.frames.length;
    const f = state.frames[previewIndex];
    drawChecker(ctx, u.w, u.h, z, ox, oy);
    ctx.drawImage(drawingCanvas(f, z), ox + (f.x - u.x) * z, oy + (f.y - u.y) * z);
  }
}
setInterval(tickPreview, PREVIEW_MS);

/* ------------------------------------------------------------------ *
 * Input
 * ------------------------------------------------------------------ */
async function processSource(source) {
  try {
    setStatus('Processing…');
    await cvReady;
    const sw = source.naturalWidth || source.width, sh = source.naturalHeight || source.height;
    const k = Math.min(1, 2600 / Math.max(sw, sh));
    const c = document.createElement('canvas');
    c.width = Math.round(sw * k); c.height = Math.round(sh * k);
    c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
    const img = rectify(c);
    colourCorrect(img);
    state.rectified = img;
    analyse();
  } catch (e) {
    console.error(e);
    setStatus(e.message || String(e), true);
  }
}

async function loadFile(file) {
  if (!file) return;
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (e) {
    setStatus('That file could not be read as an image.', true);
    return;
  }
  await processSource(source);
}

els.file.addEventListener('change', () => { loadFile(els.file.files[0]); els.file.value = ''; });
els.dropZone.addEventListener('dragover', (ev) => { ev.preventDefault(); els.dropZone.classList.add('drag'); });
els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('drag'));
els.dropZone.addEventListener('drop', (ev) => {
  ev.preventDefault();
  els.dropZone.classList.remove('drag');
  loadFile(ev.dataTransfer.files[0]);
});

window.pixidraw = { state, processSource, SHEET };
