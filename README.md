| | |
|---|---|
| <kbd>Alt</kbd> <kbd>X</kbd><br><br>🖱️&nbsp;**Read** | <img src="https://raw.githubusercontent.com/naveed-toro/vibe-read/main/media/vibe-read.gif" width="460" alt="Click Read: the code hides, only the AI's reasons stay"> |

**AI writes the code and explains its thinking in the comments. But that thinking is buried in two hundred lines of code, so nobody reads it.**

| | |
|---|---|
| ⋯ 🤫 🙈<br><br>**Vibe** | <img src="https://raw.githubusercontent.com/naveed-toro/vibe-read/main/media/vibe-pick.gif" width="460" alt="Click the mark in the status bar and pick a mood for the hidden code"> |

**Pick a mood for the hidden code.** Same code, a different vibe.

| | |
|---|---|
| ✏️<br><br>**Change&nbsp;vibe** | <img src="https://raw.githubusercontent.com/naveed-toro/vibe-read/main/media/vibe-own.gif" width="460" alt="Press the pencil and type any emoji or word"> |

**Make it yours.** Type any emoji or word, and the hidden code changes as you type.

| | |
|---|---|
| <kbd>Alt</kbd> <kbd>M</kbd><br><br>🖱️&nbsp;**📖&nbsp;Page** | <img src="https://raw.githubusercontent.com/naveed-toro/vibe-read/main/media/vibe-read-page.gif" width="460" alt="Click Page: every why numbered, set like a book, then save it as notes"> |

**Read it like a book.** Every why numbered — then save it as notes, a Markdown file next to your code.

---

## Code is for the machine. Comments are for you.

Your AI explains every decision it makes, in the comments. You never read them, because they are buried in the code. Vibe Read hides the code for a moment, so you finally do — and your next instruction to the AI is a sharper one.

| | |
|---|---|
| 🖱️&nbsp;**Read** · <kbd>Alt</kbd>&nbsp;<kbd>X</kbd> | The code hides. Only the AI's reasons, the comments, stay. Press again and it is back exactly as it was — nothing is edited. |
| 🖱️&nbsp;**📖&nbsp;Page** · <kbd>Alt</kbd>&nbsp;<kbd>M</kbd> | The whole file's reasoning on one page, every why numbered, its code folded under it. **Save as notes** keeps it as a Markdown file for GitHub, Obsidian or Notion. |
| Select&nbsp;lines · <kbd>Alt</kbd>&nbsp;<kbd>X</kbd> | Hides or shows only those lines. |
| <kbd>Ctrl</kbd>&nbsp;<kbd>C</kbd> | While the code is hidden, copies only what you see. The rest of the time it is VS Code's own copy. |
| ✏️&nbsp;**Vibe** | The mark where the code was: ⋯ Mute, 🤫 Shh, 🙈 🙉 🙊 Hide, 🌚 Vibe, 💻 Code — or your own, with the pencil. |

The status bar button counts the comments as **whys**: *8 whys* means the file explains eight things. A low number means the AI barely explained itself — ask it for better comments next time.

Can't see a button? Right-click the status bar and tick **Vibe Read: Read**, **Page** or **Your vibe**. <kbd>Alt</kbd> <kbd>X</kbd> and <kbd>Alt</kbd> <kbd>M</kbd> always work.

## How to use it with your AI

1. **Ask for reasons.** *"Write this function, and comment your reasoning."* That second half costs nothing and is the whole reason this works.
2. **Press Read.** The code goes, the reasons stay. Thirty seconds of reading.
3. **Ask better.** Not *"fix the checkout"*, but *"keep the discount before tax, round only at the end."* A sentence you could not have written a minute ago.
4. **Save as notes.** What you understood is kept.

Then round again. Each turn you understand a little more, and the AI guesses a little less.

## Any language

Python, JavaScript, TypeScript, JSX/TSX, Java, C, C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, Dart, SQL, HTML, XML, Vue, Svelte, CSS, YAML, TOML, shell, PowerShell, Dockerfile, Makefile, Lua, Haskell, Clojure, LaTeX, MATLAB, R, Perl, Elixir and more.

**Trailing comments** count: `total = subtotal * 1.2  # VAT included` hides the sum and keeps the reason. **Python docstrings** count as reasoning too; a string used as data, like a block of SQL, is code and hides.

## Why I built this

I stopped writing most of my code and started describing it instead. The AI explained itself carefully every single time — and I ignored every word, accepted code I had not understood, then wondered why my prompts were not working.

The explanation and the code live in the same file, and the code always wins your attention. So this does one thing: it takes the code away for a moment, so you can actually read what your AI told you.

---

*Made by [Naveed](https://github.com/naveed-toro). MIT licensed. Issues and ideas welcome at [github.com/naveed-toro/vibe-read](https://github.com/naveed-toro/vibe-read).*
