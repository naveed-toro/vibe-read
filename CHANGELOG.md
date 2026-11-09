# Changelog

## 0.3.5

The recordings now tell the story on their own: a title card, numbered steps, a zoom onto the button at every click, and a closing card — *Now you know what your AI built — and what to ask for next.*

## 0.3.4

The recording is a little smaller, so that in VS Code's own details pane it is seen whole, with the first line of text under it.

## 0.3.3

The read-me no longer repeats the name and icon that the page header already shows, so the recording starts at the very top and is seen whole without scrolling.

## 0.3.2

The recording is now a short, wide strip right under the title, with bigger captions — it catches the eye without filling the screen, and the text and table sit right beneath it.

## 0.3.1

The recordings in the read-me are shown at a sensible size instead of the full width of the page, so the text and the table are visible at first glance.

---

## 0.3.0 — show, don't tell

- The read-me opens with a short recording: click **Vibe Read**, the code hides, scroll through the AI's reasons, click again and the code is back. A second recording shows **📖 Page**.
- The button keeps its width when it turns into **8 whys**, so it stays under your mouse and the second click lands on it, not on Page.
- A new sample, `samples/checkout.js`, written the way an AI writes code, with its reasons in the comments.

---

## 0.2.8 — one table

The read-me no longer has a separate list of steps. The two clicks — **Vibe Read** and **📖 Page** — are now the first two rows of the same table as the keys, and the first row says what a *why* is.

---

## 0.2.7 — room for both buttons

Once the code is hidden, the button now reads **14 whys** instead of *Reading 14 whys*. The open eyes on it already say you are reading; the shorter label leaves room for **📖 Page** beside it, even when other extensions fill the status bar.

---

## 0.2.6 — the button you pressed stays put

**📖 Page** now appears to the *left* of the button you pressed, so that button stays under your mouse. And when the status bar is crowded, it is Page that gives way (`Alt+M` still opens the page) — never the button that brings your code back.

---

## 0.2.5 — the page, as a fresh reader sees it

- The **comments** block sits on a soft grey card again, so it stands apart from the reading above — but the words on it are full colour and easy to read.
- The page always opens at the top.
- The page and the status bar now show the same number of whys.
- `@param`, `@returns` and other tags each get their own line instead of running into one paragraph.

---

## 0.2.4 — the comments, readable

The **comments** block at the foot of the reading page is open from the start, so it is there when you scroll down. It is no longer set like code — no grey box, no fixed-width letters, no lines cut off at the right edge. It uses the same type as the reading above, a little closer together, with a quiet `⋯` centred wherever the code was.

The description now says what to do first: *Hide the code, read your AI's reasoning — then give it better instructions. Save it as notes.*

---

## 0.2.3 — the next step, where you already are

Once the code is hidden, a second item appears in the status bar right beside the first: **📖 Page**. One click opens the reading page, the same as `Alt+M`. Before the code is hidden it is not there, so the corner still starts with one thing to press.

---

## 0.2.1 — code that looks like code

On the reading page (`Alt+M`), code is now coloured the way it is in the editor: keywords, strings, numbers, function names, types and comments each have their own colour, light or dark to match your theme. Before, every folded block was plain text.

---

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
