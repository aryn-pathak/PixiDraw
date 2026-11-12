#!/usr/bin/env python3
"""Generates the pixidraw A4 sheet as an SVG and a vector PDF from one set of
millimetre geometry. The same numbers live in ../app.js (SHEET) - keep in sync.

    python3 make_sheet.py
"""
import base64
import os

# ---- geometry, all in mm, origin top-left of the page ----
PAGE_W, PAGE_H = 210.0, 297.0
MARKER, MARKER_INSET = 10.0, 7.0            # 4 black corner squares
GRID_X, GRID_Y = 17.0, 24.0                 # top-left of the grid
CELL, MAJOR = 4.0, 16.0
COLS, ROWS = 44, 60                         # 176 x 240 mm
KEY_Y, KEY_W, KEY_H = 272.0, 16.0, 12.0     # colour key swatches
KEY = [(73.0, "#000000"), (97.0, "#ffffff"), (121.0, "#808080")]
FINE_W, FINE_COL = 0.10, "#d0d0d0"
MAJOR_W, MAJOR_COL = 0.25, "#9a9a9a"
TEXT_COL = "#9a9a9a"
GRID_W, GRID_H = COLS * CELL, ROWS * CELL

# Pixel-size key: nested N x N outlines (in grid squares) in the grid's bottom-left corner.
# They sit on grid lines, which the app's square reader ignores, so only ink inside counts.
SIZE_KEY = [1, 2, 3, 4]
SIZE_W, SIZE_COL = 0.35, "#555555"
LABEL_Y = GRID_Y + GRID_H + 3.4

TITLE_COL = "#555555"
CREDIT_COL = "#c4c4c4"

# Helvetica / Helvetica-Bold advance widths (per 1000 em) for the characters used in centred
# text, so the PDF and SVG can centre it exactly (PDF text has no "centre" anchor).
W_REG = dict(zip(" ADPAabdehkmnrty", [278, 667, 722, 667, 667, 556, 556, 556, 556, 556, 500, 833, 556, 333, 278, 500]))
W_BOLD = dict(zip("DPairwx", [722, 667, 556, 278, 389, 778, 556]))


def centred(y, size, text, col, bold=False):
    widths = W_BOLD if bold else W_REG
    w = sum(widths[ch] for ch in text) / 1000 * size
    return (PAGE_W / 2 - w / 2, y, size, text, col, bold)


# (x, y, size, text, colour, bold)
TEXTS = [
    centred(15.6, 5.0, "PixiDraw", TITLE_COL, bold=True),
    (GRID_X + 18.0, LABEL_Y, 2.2, "colour black a box the desired size of pixels", TEXT_COL, False),
    (48.0, 279.0, 2.6, "colour key", TEXT_COL, False),
    centred(294.6, 2.0, "made by Aryan Pathak", CREDIT_COL),
] + [(GRID_X + (k - 0.5) * CELL - 0.6, LABEL_Y, 2.2, str(k), TEXT_COL, False) for k in SIZE_KEY]


def markers():
    a, b = MARKER_INSET, MARKER_INSET + MARKER
    return [(a, a), (PAGE_W - b, a), (a, PAGE_H - b), (PAGE_W - b, PAGE_H - b)]


def grid_lines():
    """-> (fine, major) lists of (x1, y1, x2, y2)."""
    fine, major = [], []
    per = int(MAJOR / CELL)
    for i in range(COLS + 1):
        x = GRID_X + i * CELL
        (major if i % per == 0 else fine).append((x, GRID_Y, x, GRID_Y + GRID_H))
    for j in range(ROWS + 1):
        y = GRID_Y + j * CELL
        (major if j % per == 0 else fine).append((GRID_X, y, GRID_X + GRID_W, y))
    return fine, major


def size_key_rects():
    """-> list of (x, y, w, h) outlines anchored at the grid's bottom-left corner."""
    return [(GRID_X, GRID_Y + GRID_H - k * CELL, k * CELL, k * CELL) for k in SIZE_KEY]


def n(v):
    return ("%.3f" % v).rstrip("0").rstrip(".")


def make_svg():
    fine, major = grid_lines()
    o = []
    o.append('<?xml version="1.0" encoding="UTF-8"?>')
    o.append('<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">')
    o.append('<rect width="210" height="297" fill="#ffffff"/>')
    for name, lines, w, col in (("fine", fine, FINE_W, FINE_COL), ("major", major, MAJOR_W, MAJOR_COL)):
        d = " ".join("M%s %sL%s %s" % tuple(n(v) for v in l) for l in lines)
        o.append('<path id="grid-%s" d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="square"/>' % (name, d, col, n(w)))
    for x, y, w, h in size_key_rects():
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="none" stroke="%s" stroke-width="%s"/>' % (n(x), n(y), n(w), n(h), SIZE_COL, n(SIZE_W)))
    for x, y in markers():
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="#000000"/>' % (n(x), n(y), n(MARKER), n(MARKER)))
    for x, col in KEY:
        o.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" stroke="%s" stroke-width="0.2"/>' % (n(x), n(KEY_Y), n(KEY_W), n(KEY_H), col, MAJOR_COL))
    for x, y, size, s, col, bold in TEXTS:
        o.append('<text x="%s" y="%s" font-family="Helvetica, Arial, sans-serif" font-size="%s"%s fill="%s">%s</text>' % (
            n(x), n(y), n(size), ' font-weight="bold"' if bold else "", col,
            s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")))
    o.append("</svg>")
    return "\n".join(o) + "\n"


def rgb(hexcol):
    return " ".join(n(int(hexcol[i:i + 2], 16) / 255) for i in (1, 3, 5))


def make_pdf():
    fine, major = grid_lines()
    k = 72 / 25.4
    c = []
    # work in mm with a top-left origin, same as the SVG
    c.append("%s 0 0 %s 0 %s cm" % (n(k), n(-k), n(PAGE_H * k)))
    c.append("2 J")
    for lines, w, col in ((fine, FINE_W, FINE_COL), (major, MAJOR_W, MAJOR_COL)):
        c.append("%s RG %s w" % (rgb(col), n(w)))
        for l in lines:
            c.append("%s %s m %s %s l" % tuple(n(v) for v in l))
        c.append("S")
    c.append("0 J %s RG %s w" % (rgb(SIZE_COL), n(SIZE_W)))
    for x, y, w, h in size_key_rects():
        c.append("%s %s %s %s re" % (n(x), n(y), n(w), n(h)))
    c.append("S")
    c.append("0 0 0 rg")
    for x, y in markers():
        c.append("%s %s %s %s re" % (n(x), n(y), n(MARKER), n(MARKER)))
    c.append("f")
    c.append("0 J %s RG 0.2 w" % rgb(MAJOR_COL))
    for x, col in KEY:
        c.append("%s rg %s %s %s %s re B" % (rgb(col), n(x), n(KEY_Y), n(KEY_W), n(KEY_H)))
    for x, y, size, s, col, bold in TEXTS:
        esc = s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        c.append("%s rg BT /%s 1 Tf %s 0 0 %s %s %s Tm (%s) Tj ET" % (rgb(col), "F2" if bold else "F1", n(size), n(-size), n(x), n(y), esc))
    stream = "\n".join(c).encode("latin-1")

    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        ("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %s %s] /Contents 4 0 R "
         "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>" % (n(PAGE_W * k), n(PAGE_H * k))).encode(),
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    ]
    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = []
    for i, body in enumerate(objs, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + body + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
    for off in offsets:
        out += b"%010d 00000 n \n" % off
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref)
    return bytes(out)


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "pixidraw-sheet.svg"), "w") as f:
        f.write(make_svg())
    pdf = make_pdf()
    with open(os.path.join(here, "pixidraw-sheet.pdf"), "wb") as f:
        f.write(pdf)
    # embed the PDF in the web app, so "Download sheet" works without the separate file
    app = os.path.join(here, "..", "app.js")
    with open(app) as f:
        lines = f.read().split("\n")
    marker = "const SHEET_PDF_BASE64 = "
    lines = [marker + "'%s'; // generated by sheet/make_sheet.py" % base64.b64encode(pdf).decode() if l.startswith(marker) else l for l in lines]
    with open(app, "w") as f:
        f.write("\n".join(lines))
    print("wrote pixidraw-sheet.svg, pixidraw-sheet.pdf and the embedded copy in app.js")
