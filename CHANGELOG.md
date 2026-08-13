# Changelog

## 0.2.0 — the reading room

`Alt+M` no longer hands you a markdown document. It opens a pane beside the
file where the reasoning is the text, the code sits folded underneath it, and
the two scroll together — move the code and the reasoning follows, move the
reasoning and the code follows.

The two panes meet at every point that can name a line: a comment and its
heading, the rest of a comment and its paragraph, a stretch of code and its
fold. Between those points the position is straight proportion. Nothing in it
is tuned by hand, so it behaves the same in a file with a comment every five
lines and one with them seventy apart.

The markdown has not gone anywhere. **Save as Markdown** in the corner of the
reading pane writes the same document as before, and that one opens in GitHub,
Obsidian, Notion or anywhere else.

**Reading and hiding now stand side by side.** Both have a chip in the status
bar, a button above the editor and a line in the right-click menu, and neither
waits for the other. The notes button used to appear only once the code was
already hidden, which taught everybody that `Alt+M` was a step you take
afterwards. It never was. The command is called **Read the reasoning** now;
*Save as notes* always sounded like the step after some other step.

The vibe appears only while something is hidden. A vibe stands in for covered
code, so with nothing covered it was a control that could not do anything,
holding a place in the bar for the whole session.

**An edit that reaches hidden code puts the code back.** Hidden is not gone:
those lines are still in the file, still inside a selection drawn across them,
and still deleted by the next keystroke — and you cannot see what you lost,
because it was invisible before it went. The covering now comes off the moment
an edit touches it, so the file is in plain sight with undo one key away. An
edit inside the reasoning is left alone.

---

## 0.1.0 — first release

Vibe Read starts here.

**The idea**

AI writes the code and explains its reasoning in the comments. Nobody reads
those comments, because they arrive buried in two hundred lines of code.
Vibe Read hides the code so the reasoning is all that is left.

**What you get**

- `Alt+X` — hide the code. Select some lines to hide only those.
- `Alt+M` — keep it as notes: a Markdown document where the reasoning is the
  text and the code sits collapsed underneath it. It opens rendered, not as
  markdown source, because reading is what it is for — the source is one click
  away behind the preview's own Show Source button.
- `Ctrl+C` — copy only what you see. Only while something is hidden; the rest
  of the time this is VS Code's own copy, untouched.
- The vibe is an ellipsis by default, because an emoji repeated down a whole
  page is the noise this extension exists to remove. Click it in the status bar
  and take Shh, Hide, Vibe or Code instead — or replace any of them with your
  own, where your system's emoji keyboard does the choosing. Emoji, text, or
  both, up to eight characters. A vibe is meant to be looked at, not read. The
  box counts down as you type, because nobody can tell by eye whether 🙈🙉🙊 is
  three characters or six.
- Each slot has a name, and the name goes up in the status bar beside the vibe:
  **🤫 Shh**, **🙈 🙉 🙊 Hide**. It belongs to the slot rather than the
  character, so putting something else in the Shh slot leaves it your Shh.

There is no separate command for a single line, and that is deliberate. Select
the line and press `Alt+X`.

**Languages**

Comments are recognised properly in Python, JavaScript, TypeScript, Java, C,
C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, SQL, HTML, YAML, shell, Lua,
Haskell, LaTeX and more. Trailing comments work too — `total = a + b  # why`
hides the statement and leaves the reason.

Python docstrings count as reasoning, not as code. A string used as data — a
block of SQL, an HTML template — still counts as code and is hidden.

---

*Vibe Read grew out of Smart Fold, an earlier extension of mine. Smart Fold
folded code. Vibe Read is about reading what the AI was thinking, which turned
out to be a different thing entirely — different enough to deserve its own name.*
