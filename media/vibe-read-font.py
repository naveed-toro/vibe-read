"""Turns the two drawn faces into a two-glyph icon font.

The shapes are rebuilt as clean geometry rather than traced from the PNG:
they are a rounded square and some circles, and maths gives crisper curves
and a smaller file than any tracer would. Proportions are measured off the
drawing; the eyes are made exactly symmetric, which the drawing was a pixel
or two out on.

Both states have two eyes, and only the eyes change between them. The first
draft gave the resting face three dots, which was an ellipsis stuck on a
square rather than a face — three of anything is not a pair of eyes, so the
two states were two different objects instead of one thing with two
expressions.
"""

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
import math

EM = 1000
K = 0.5522847498          # circle-through-beziers constant
S = 880                   # face side
X0, Y0 = 60, -130         # face bottom-left, so it sits like a codicon does
R = 0.26 * S              # corner radius, measured off the drawing

def rounded_square(pen):
    rounded_rect(pen, X0, Y0, X0 + S, Y0 + S, R)

def rounded_rect(pen, x0, y0, x1, y1, R, hole=False):
    """Clockwise is the outside of a shape; anticlockwise cuts a hole in one."""
    k = R * K
    if hole:
        pen.moveTo((x0 + R, y0))
        pen.lineTo((x1 - R, y0))
        pen.curveTo((x1 - R + k, y0), (x1, y0 + R - k), (x1, y0 + R))
        pen.lineTo((x1, y1 - R))
        pen.curveTo((x1, y1 - R + k), (x1 - R + k, y1), (x1 - R, y1))
        pen.lineTo((x0 + R, y1))
        pen.curveTo((x0 + R - k, y1), (x0, y1 - R + k), (x0, y1 - R))
        pen.lineTo((x0, y0 + R))
        pen.curveTo((x0, y0 + R - k), (x0 + R - k, y0), (x0 + R, y0))
        pen.closePath()
        return
    pen.moveTo((x0 + R, y1))
    pen.lineTo((x1 - R, y1))
    pen.curveTo((x1 - R + k, y1), (x1, y1 - R + k), (x1, y1 - R))
    pen.lineTo((x1, y0 + R))
    pen.curveTo((x1, y0 + R - k), (x1 - R + k, y0), (x1 - R, y0))
    pen.lineTo((x0 + R, y0))
    pen.curveTo((x0 + R - k, y0), (x0, y0 + R - k), (x0, y0 + R))
    pen.lineTo((x0, y1 - R))
    pen.curveTo((x0, y1 - R + k), (x0 + R - k, y1), (x0 + R, y1))
    pen.closePath()

# ── a page, in the same language as the faces ──────────────────────────────
#
# The notes button wore $(book), and it did not belong beside these two. Not
# because it was somebody else's mark — because it was somebody else's weight.
# The faces are solid shapes with holes cut in them; a codicon is a line
# drawing. At sixteen pixels, side by side, they read as two different sets,
# and they were.
#
# So: solid, the same corner radius, its detail cut out rather than drawn on,
# exactly like the eyes. Three lines with the last one short, which has meant
# "the paragraph ends here" for as long as anyone has drawn a page.
#
# Its own outline, though, not the face's. Sharing the square would have made
# the strongest family and the weakest icon — two buttons side by side, both
# the same rounded box, and a moment's work to tell them apart. Icon families
# share their weight and their corners, not their silhouette.

PAGE = (190, -130, 620, 880, 150)          # x, y, width, height, corner
LINES = (1.0, 1.0, 0.58)                   # the last one is a short line

def page(pen):
    x0, y0, w, h, r = PAGE
    rounded_rect(pen, x0, y0, x0 + w, y0 + h, r)
    for i, run in enumerate(LINES):
        y = y0 + h - 235 - i * 200
        rounded_rect(pen, x0 + 110, y - 40, x0 + 110 + (w - 220) * run, y + 40, 40, hole=True)

def circle(pen, cx, cy, r, hole):
    """A hole runs the other way round, which is what makes it a hole."""
    k = r * K
    if hole:
        pen.moveTo((cx + r, cy))
        pen.curveTo((cx + r, cy + k), (cx + k, cy + r), (cx, cy + r))
        pen.curveTo((cx - k, cy + r), (cx - r, cy + k), (cx - r, cy))
        pen.curveTo((cx - r, cy - k), (cx - k, cy - r), (cx, cy - r))
        pen.curveTo((cx + k, cy - r), (cx + r, cy - k), (cx + r, cy))
    else:
        pen.moveTo((cx + r, cy))
        pen.curveTo((cx + r, cy - k), (cx + k, cy - r), (cx, cy - r))
        pen.curveTo((cx - k, cy - r), (cx - r, cy - k), (cx - r, cy))
        pen.curveTo((cx - r, cy + k), (cx - k, cy + r), (cx, cy + r))
        pen.curveTo((cx + k, cy + r), (cx + r, cy + k), (cx + r, cy))
    pen.closePath()

def at(fx, fy):
    """A point given as a fraction of the face, measured from its top-left."""
    return X0 + fx * S, Y0 + (1 - fy) * S

EYE_Y = 0.522

EYES = (0.300, 0.700)
WIDE = 0.304          # how big an eye is, in both states
PUPIL = 0.165         # the centre that only the reading face has

def resting(pen):
    """Eyes open, focused on nothing. The code and the reasoning still mixed."""
    rounded_square(pen)
    for fx in EYES:
        cx, cy = at(fx, EYE_Y)
        circle(pen, cx, cy, WIDE / 2 * S, hole=True)

def reading(pen):
    """The same eyes, with a centre. Focus is the only thing that changed."""
    rounded_square(pen)
    for fx in EYES:
        cx, cy = at(fx, EYE_Y)
        circle(pen, cx, cy, WIDE / 2 * S, hole=True)
        circle(pen, cx, cy, PUPIL / 2 * S, hole=False)

# ── the arrow ──────────────────────────────────────────────────────────────
#
# Only the arrow. For a while this glyph carried the word "Reset" beside it,
# drawn into the character, because a title-bar button takes an icon and no
# words. It rendered, and it was a mistake, and it took three goes to see why:
# the hover highlight and the click both belong to the action item's box, and
# that box is sixteen pixels wide. Everything hanging outside it was paint.
#
# So the word was there, and it could not be pressed. A label that asks to be
# clicked and does nothing is worse than no label — the first one teaches
# somebody the button is broken.
#
# The word lives in a row now, where the label, the icon, the highlight and the
# hit area are all one thing. This draws the arrow, at an ordinary width, with
# an ordinary bearing.

ARROW_R, ARROW_C = 300, (330, 300)

def ring(pen, cx, cy, outer, inner, a0, a1, steps=40):
    """One thick arc: out along the far edge, back along the near one."""
    def along(r, first, last):
        return [(cx + r * math.cos(first + (last - first) * i / steps),
                 cy + r * math.sin(first + (last - first) * i / steps))
                for i in range(steps + 1)]
    points = along(outer, a0, a1) + along(inner, a1, a0)
    pen.moveTo(points[0])
    for p in points[1:]:
        pen.lineTo(p)
    pen.closePath()

def arrowhead(pen, cx, cy, r, angle, size):
    pen.moveTo((cx + r * math.cos(angle - 0.42), cy + r * math.sin(angle - 0.42)))
    pen.lineTo((cx + (r + size) * math.cos(angle + 0.16),
                cy + (r + size) * math.sin(angle + 0.16)))
    pen.lineTo((cx + (r - size) * math.cos(angle + 0.16),
                cy + (r - size) * math.sin(angle + 0.16)))
    pen.closePath()

def reset(pen):
    cx, cy = ARROW_C
    ring(pen, cx, cy, ARROW_R, ARROW_R - 105, math.radians(118), math.radians(410))
    arrowhead(pen, cx, cy, ARROW_R - 52, math.radians(112), 130)

def draw(fn):
    tt = TTGlyphPen(None)
    fn(Cu2QuPen(tt, 0.2))
    return tt.glyph()

def build(path):
    order = ['.notdef', 'vibeRead-resting', 'vibeRead-reading', 'vibeRead-notes',
             'vibeRead-reset']
    fb = FontBuilder(EM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({0xE001: 'vibeRead-resting', 0xE002: 'vibeRead-reading',
                          0xE003: 'vibeRead-reset', 0xE004: 'vibeRead-notes'})
    glyphs = {'.notdef': TTGlyphPen(None).glyph(),
              'vibeRead-resting': draw(resting),
              'vibeRead-reading': draw(reading),
              'vibeRead-notes': draw(page),
              'vibeRead-reset': draw(reset)}
    for g in glyphs.values():
        g.recalcBounds(None)          # xMin is not filled in until this runs
    fb.setupGlyf(glyphs)
    # The left side bearing has to be the truth, not a guess.
    #
    # hmtx declares where a glyph's ink begins; glyf is where it actually
    # begins. Nothing checks that they agree, and when they disagree a
    # rasteriser trusts the declaration and slides the outline over until they
    # do. This glyph's ink starts 2138 units to the LEFT of its origin and the
    # declaration said 30 to the right, so every renderer dutifully shoved it
    # 2168 units — thirty-five pixels — to the right, and the word that was
    # meant to hang in empty title bar landed on the button and past it.
    #
    # Three attempts at moving it were three attempts at treating the symptom.
    # The number was never wrong; the font was lying about it.
    fb.setupHorizontalMetrics({g: (EM, glyphs[g].xMin if g != '.notdef' else 0)
                               for g in order})
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({'familyName': 'Vibe Read', 'styleName': 'Regular',
                       'psName': 'VibeRead-Regular', 'version': 'Version 1.0'})
    fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    fb.setupPost()
    fb.save(path)
    return path

if __name__ == '__main__':
    import os, sys
    here = os.path.dirname(os.path.abspath(__file__))
    ttf = os.path.join(here, 'vibe-read.ttf')
    build(ttf)
    from fontTools.ttLib import TTFont
    f = TTFont(ttf); f.flavor = 'woff'      # WOFF1 is zlib, so no brotli needed
    f.save(os.path.join(here, 'vibe-read.woff'))
    os.remove(ttf)
    print('media/vibe-read.woff written')
