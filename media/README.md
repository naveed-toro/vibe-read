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
