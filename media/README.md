# The face

Two states of one character, drawn by Naveed.

    E003  reset     an arrow with the word "Reset" beside it, because a
                    title-bar button takes an icon and no label

    E001  resting   eyes open, focused on nothing — the code and the
                    reasoning still mixed, and none of it read yet
    E002  reading   the same eyes, with a centre. Focus is the only
                    thing that changed

`vibe-read-faces.png` is the original drawing. `vibe-read.woff` is the font
built from it, and `vibe-read-font.py` is what builds the font — the shapes
are rebuilt there as geometry rather than traced, because a rounded square
and some circles are cleaner drawn by maths than by a tracer.

To change the drawing: edit the proportions in the script and run it. It
writes the `.woff` here itself. Nothing else needs touching — the two names in
`contributes.icons` stay the same.

    python3 media/vibe-read-font.py

`icon.png` at the root is the marketplace icon, and comes from the same
shapes. Two other colourways sit here in case the amber one wears thin.

## The letters

`Reset` is set in DejaVu Sans Bold, whose outlines are copied into the glyph
by the script. DejaVu is used rather than a UI face because it survives being
shrunk to sixteen pixels — tall x-height, open apertures, sturdy stems.

Its licence permits this so long as the result is not called DejaVu, and is
not sold on its own. Neither applies: the font is called Vibe Read and it
ships inside an extension.

    Fonts are (c) Bitstream (see below). DejaVu changes are in public domain.
    https://dejavu-fonts.github.io/License.html

## If you widen the word, mind the metrics

The reset glyph hangs about thirty pixels to the left of its own box. A
title-bar button in VS Code is a fixed little square and takes no label, so
the label has to be part of the icon and has to hang outside it.

That only works if `hmtx` tells the truth. `hmtx` declares where a glyph's ink
begins and `glyf` is where it actually begins, nothing checks that they agree,
and when they disagree a rasteriser trusts the declaration and slides the
outline over until they do. Get it wrong by 2168 units and the word appears
thirty-five pixels to the right of where you drew it, sitting on the button
and spilling past it — which looks exactly like a sizing problem and is not
one.

The script sets the bearing from the glyph's own `xMin`, after calling
`recalcBounds`. Leave it that way.
