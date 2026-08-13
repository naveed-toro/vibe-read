# The face

Two states of one character, drawn by Naveed.

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

*A third glyph lived here for an afternoon: an arrow with the word "Reset"
drawn beside it, so that a title-bar button could carry a label VS Code will
not let it have. It worked, and it could not be made to fit — a title-bar
button is a fixed little square, and anything wide enough to read hangs
outside it and lands on whatever is there at that window width. The reset is
a row in the list now, where a label is simply allowed.*
