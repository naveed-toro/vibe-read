# Changelog

## 0.1.0 — first release

Vibe Read starts here.

**The idea**

AI writes the code and explains its reasoning in the comments. Nobody reads
those comments, because they arrive buried in two hundred lines of code.
Vibe Read hides the code so the reasoning is all that is left.

**What you get**

- `Alt+X` — hide the code. Select some lines first to hide only those.
- `Alt+M` — keep it as notes: a Markdown document where the reasoning is the
  text and the code sits collapsed underneath it.
- `Ctrl+C` — copies only what you can see. Only while something is hidden;
  the rest of the time this is VS Code's own copy, untouched.
- `vibeRead.hiddenIcon` — 🙈 by default, or anything you like.

There is no separate command for a single line, and that is deliberate. Select
the line and press `Alt+X`.

**Languages**

Comments are recognised properly in Python, JavaScript, TypeScript, Java, C,
C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, SQL, HTML, YAML, shell, Lua,
Haskell, LaTeX and more. Trailing comments work too — `total = a + b  # why`
hides the statement and leaves the reason.

---

*Vibe Read grew out of Smart Fold, an earlier extension of mine. Smart Fold
folded code. Vibe Read is about reading what the AI was thinking, which turned
out to be a different thing entirely — different enough to deserve its own name.*
