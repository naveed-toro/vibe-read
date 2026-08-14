# Changelog

## 0.2.0 — the reading room

`Alt+M` no longer hands you a markdown document. It opens a page — a tab of
its own, the width of the window, with the file's reasoning set as prose and
each paragraph keeping its own code shut underneath it. Nothing else on the
screen, because the promise was a place without distractions.

The type is set to be read rather than to look impressive: sixteen or seventeen
pixels, lines nearly twice their own height, a column about sixty characters
wide, ragged right, a little air between the letters. That is the advice given
for dyslexic readers, which is simply the advice for readers.

Lines are run back into the sentences they were before somebody wrapped them at
the eightieth column — that margin belongs to the editor, not to whoever was
writing. Two breaks are the writer's own and stay: a bare comment marker is a
paragraph break, and a list stays a list.

At the foot of the page, three blocks, all shut: **comments**, the file with
the code taken out and a single `⋯` wherever it went; **code**, the file with
the reasoning taken out; and **as it is**, untouched.

The markdown has not gone anywhere. **Save as Markdown** writes the same page
into a document that opens in GitHub, Obsidian, Notion or anywhere else — and
it opens rendered, not as source.

**There is still one door.** `Alt+X` is the key you learn first, the corner
still says *Vibe Read* and then *Reading 7 whys*, and both tooltips tell you
that `Alt+M` reads the whole file as a page. `Alt+M` has never needed the code
to be hidden first — it works on any file at any moment — but giving it a chip
of its own made two decisions where there had been one, and that is a worse
trade than the one it was fixing.

The command is called **Read the reasoning** now. *Save as notes* always
sounded like the step after some other step.

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
