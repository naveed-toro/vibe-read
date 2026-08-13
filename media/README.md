# The face

Two states of one character, drawn by Naveed.

    E003  reset     an arrow with the word "Reset" beside it, because a
                    title-bar button takes an icon and no label

    E003  reset     the arrow only — the word beside it lives in the row
    E004  notes     a page — solid, same corners, lines cut out of it the
                    way the eyes are

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

## The word that could not be pressed

For an afternoon the reset glyph carried the word "Reset" drawn beside the
arrow, so that a title-bar button could have a label VS Code will not give it.
It rendered. It was still wrong, and it took three goes to see why.

The hover highlight and the click both belong to the action item's box, and
that box is sixteen pixels wide. Everything hanging outside it is paint. So
the word was there, and could not be pressed — and a label that asks to be
clicked and does nothing is worse than no label at all, because the first one
teaches somebody the button is broken.

The word lives in a row now, where the label, the icon, the highlight and the
hit area are one thing. Do not try the glyph again.
