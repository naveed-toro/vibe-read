# 🙈 Vibe Read — Read My AI

Hide the code, read the reasoning — then give better instructions to AI. Save it as notes.

---

AI writes the code. Its comments explain the why.

<!-- ═══════════════════════════════════════════════════════════════════
     GIF 1 — the one that decides whether anybody installs this.

     Nobody reads a marketplace page. They scroll for two seconds, watch
     whatever moves, and decide. With no download count yet, this picture
     is carrying the whole argument on its own.

     WHAT TO RECORD
       1. Open samples/checkout.py. Zoom the editor up two or three steps
          (Ctrl and +) so the text survives being shrunk on the page.
       2. Hold still 1 second — let the eye see a normal, full file.
       3. Press Alt+X. Now hold 3 seconds. This pause IS the recording:
          it is the moment someone realises they are reading English
          instead of code. Do not cut it short.
       4. Press Alt+X again. Hold 1 second. Stop.

     ABOUT 6 SECONDS, looping.

     HOW
       ScreenToGif — free, Windows, built for this.
       Frame the editor only. No title bar, no sidebar, no taskbar.
       12 fps is plenty. Keep it under 3 MB or the page crawls.
       A dark theme gives a smaller, cleaner file than a light one.

     THEN
       Save as media/hide.gif, commit, push. The link below already
       points at the right address.
     ═══════════════════════════════════════════════════════════════════ -->

![Alt+X hides the code and leaves the reasoning](https://raw.githubusercontent.com/naveed-toro/vibe-read/main/media/hide.gif)

One key. The code goes, the reasoning stays. Press it again and it is all
back — nothing was ever edited.

---

<!-- ═══════════════════════════════════════════════════════════════════
     GIF 2 — the second reason to install.

     The message here is not what the notes say. It is that a document
     appeared. That is a movement, so it has to move.

     WHAT TO RECORD
       1. Same file, already in reading mode — the monkeys showing. That
          way this GIF picks up where the one above left off.
       2. Make the window wide enough for two panes side by side.
       3. Press Alt+M. The notes open on the right.
       4. Hold 3 seconds on the split view. Stop.

     ABOUT 5 SECONDS, looping. Save as media/notes.gif.
     ═══════════════════════════════════════════════════════════════════ -->

![Alt+M turns the file into notes](https://raw.githubusercontent.com/naveed-toro/vibe-read/main/media/notes.gif)

One more key, and it is a document you keep — the reasoning as text, the code
folded underneath.

The fold below is real. Click it.

> **checkout.py**
> 🙈 Vibe Read · 2026-08-08 · 2 notes

### 1. Discount before tax

The other order overcharges the customer, and in most places it is also
illegal.

<details>
<summary>🙈 code</summary>

```python
if coupon:
    subtotal *= (1 - coupon.rate)
```

</details>

---

## Shortcuts

| Key | What it does |
|---|---|
| `Alt` + `X` | Hide / show the code. Select some lines first to do only those. |
| `Alt` + `M` | Keep it as notes |
| `Ctrl` + `C` | Copies only what you can see |

Two keys. There is nothing else to learn.

## Languages

Python, JavaScript, TypeScript, JSX/TSX, Java, C, C++, C#, Go, Rust, Ruby,
PHP, Swift, Kotlin, Scala, Dart, SQL, HTML, XML, Vue, Svelte, CSS, YAML, TOML,
shell, PowerShell, Dockerfile, Makefile, Lua, Haskell, Clojure, LaTeX, MATLAB,
R, Perl, Elixir and more. Trailing comments and Python docstrings too.

## Settings

```json
"vibeRead.hiddenIcon": "🙈"
```

Suggestions: 🙈 ⋯ 💤 🫥 — or anything else you like.

<br>

---

<br>

*The rest of this page is for anyone who wants it. The two keys above are the
whole extension.*

## This isn't a folding tool. It's a way of working.

You describe what you want. The AI writes it — clean, structured, and full of
comments explaining every decision it made. Those comments are gold. They are
the AI telling you exactly what it was thinking.

But you never read them. They arrive buried inside two hundred lines of code,
and your eyes go straight to the code. So you skim, you accept, you move on —
and you learn nothing. Then the next prompt is just as vague as the last one.

**Vibe Read breaks that habit.** One key hides the code and leaves only the
reasoning. You read what the AI was thinking, in plain language, in about
thirty seconds. Now you understand the shape of the solution — and your next
instruction is sharper, because you know what you are asking it to change.

Read the why, then ask better.

## The loop

**1. Ask the AI — and ask for reasoning.** *"Write this function, and comment
your reasoning."* Most people never add that second half. It costs nothing and
it is the whole reason this works.

**2. You get code.** Correct, probably. Overwhelming, definitely.

**3. Press `Alt+X`.** The code disappears. Only the reasoning stays.

**4. Read it.** Thirty seconds. You now know what it did and why.

**5. Ask better.** Not *"fix the checkout"* — but *"keep the discount order,
but round after tax, not before."* That is a sentence you could not have
written a minute ago.

**6. Press `Alt+M`.** What you just learned is kept as notes.

Repeat. Each turn you understand a little more, and the AI has to guess a
little less.

## Details, for the curious

**Trailing comments.** `total = subtotal * 1.2  # VAT included here` hides the
statement and leaves the reason.

**Python docstrings count as reasoning, not code.** Most languages explain
themselves in real comments — JSDoc, Javadoc, `///`, `<!-- -->`. Python puts
its explanation in a string, and hiding that would defeat the point. A string
used as data — a block of SQL, an HTML template — is code, and goes.

**Selecting first narrows it.** Want one line back? Select it and press
`Alt+X`. The same key, narrowed to whatever you picked. No third way, on
purpose.

**`Ctrl+C` only changes while something is hidden.** The rest of the time it
is VS Code's own copy, untouched. An editor's defaults are not mine to take
away.

**Not just for AI code.** The same key works on an unfamiliar repository, a
colleague's module, or your own code from two years ago. It is the fastest way
into a file you do not know.

## Why I built this

I built an extension called **Smart Fold** a while back. It folded code, it
had four modes and eight commands, and almost nobody used it — which was fair,
because nobody wants to learn eight commands.

Then the way I worked changed. I stopped writing most of my code and started
describing it instead. And I noticed something: the AI was explaining itself
carefully, every single time, and I was ignoring every word of it. I was
accepting code I had not understood, and then complaining that my prompts were
not working.

The problem was never folding. It was that the explanation and the code live
in the same file, and the code always wins your attention.

So Vibe Read does one thing: it takes the code away for a moment, so you can
actually read what your AI told you.

---

*Made by [Naveed](https://github.com/naveed-toro). MIT licensed.
Issues and ideas welcome at [github.com/naveed-toro/vibe-read](https://github.com/naveed-toro/vibe-read).*
