# Changelog

## 0.1.0 — first release

Vibe Read starts here.

**The idea**

AI writes the code and explains its reasoning in the comments. Nobody reads
those comments, because they arrive buried in two hundred lines of code.
Vibe Read hides the code so the reasoning is all that is left.

**What you get**

- `Alt+X` — hide the code. Select some lines to hide only those.
- `Alt+M` — keep it as notes: a Markdown document where the reasoning is the
  text and the code sits collapsed underneath it.
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
