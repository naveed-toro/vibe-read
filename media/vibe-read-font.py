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
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
import math

EM = 1000
K = 0.5522847498          # circle-through-beziers constant
S = 880                   # face side
X0, Y0 = 60, -130         # face bottom-left, so it sits like a codicon does
R = 0.26 * S              # corner radius, measured off the drawing

def rounded_square(pen):
    """Clockwise, so it is the outside."""
    x0, y0, x1, y1 = X0, Y0, X0 + S, Y0 + S
    k = R * K
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

# ── the third glyph: an arrow with its own label ────────────────────────────
#
# VS Code lets a title-bar button carry an icon and nothing else. No label, no
# text, only a tooltip that appears once you have already found the thing. So
# a lone arrow in a corner explains itself to nobody — the same wall the pencil
# and the chevron ran into, because a picture cannot name a noun.
#
# A glyph, though, can be any shape and any width, and letters are shapes. So
# the label goes inside the icon: this character is the arrow and the word
# "Reset" together, and VS Code has no way of knowing it is looking at a
# sentence.
#
# The arc is sampled as a polygon rather than fitted with curves. At sixteen
# pixels nobody can see the facets, and it is one loop instead of four pages of
# bezier arithmetic.
#
# The letters come from DejaVu Sans Bold, which survives being shrunk better
# than a UI face does — tall x-height, open apertures, sturdy stems. Its
# licence allows this provided the result is not called DejaVu. It is called
# Vibe Read. See media/README.md.

DEJAVU = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
ARROW_R, ARROW_C = 300, (330, 300)
WORD, WORD_SIZE, WORD_GAP = 'Reset', 0.62, 170

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

def reset():
    """Returns the glyph and how wide it needs to be."""
    src = TTFont(DEJAVU)
    upm, shapes, cmap = src['head'].unitsPerEm, src.getGlyphSet(), src.getBestCmap()

    pen = TTGlyphPen(None)
    cx, cy = ARROW_C
    ring(pen, cx, cy, ARROW_R, ARROW_R - 105, math.radians(118), math.radians(410))
    arrowhead(pen, cx, cy, ARROW_R - 52, math.radians(112), 130)

    scale = WORD_SIZE * EM / upm
    x = 2 * ARROW_R + WORD_GAP
    for ch in WORD:
        letter = shapes[cmap[ord(ch)]]
        letter.draw(TransformPen(pen, (scale, 0, 0, scale, x, 0)))
        x += letter.width * scale
    return pen.glyph(), int(x + 60)

def draw(fn):
    tt = TTGlyphPen(None)
    fn(Cu2QuPen(tt, 0.2))
    return tt.glyph()

def build(path):
    order = ['.notdef', 'vibeRead-resting', 'vibeRead-reading', 'vibeRead-reset']
    reset_glyph, reset_width = reset()
    fb = FontBuilder(EM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({0xE001: 'vibeRead-resting', 0xE002: 'vibeRead-reading',
                          0xE003: 'vibeRead-reset'})
    empty = TTGlyphPen(None).glyph()
    fb.setupGlyf({'.notdef': empty,
                  'vibeRead-resting': draw(resting),
                  'vibeRead-reading': draw(reading),
                  'vibeRead-reset': reset_glyph})
    metrics = {g: (EM, X0) for g in order}
    metrics['vibeRead-reset'] = (reset_width, 30)
    fb.setupHorizontalMetrics(metrics)
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
