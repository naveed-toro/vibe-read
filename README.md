# 🙈 Vibe Read — Read My AI

**AI writes the code. Its comments explain the why. Hide the code,
read the reasoning — then give better instructions. Save it as notes.**

<!-- ═══════════════════════════════════════════════════════════════════
     GIF 1 — the only one that really matters. Everything else on this
     page can be read. This has to be watched, because a still picture
     can show two frozen moments and this is a movement.

     WHAT TO RECORD
       1. Open samples/checkout.py. Zoom the editor up two or three steps
          (Ctrl and + ) so the text is still readable when the page
          shrinks the image.
       2. Sit still for 1 second so the eye settles on the full file.
       3. Press Alt+X. Let the monkeys sit there for 3 seconds — long
          enough to read two of the comments. This is the whole point of
          the recording; do not rush it.
       4. Press Alt+X again. Hold 1 second. Stop.

     ABOUT 6 SECONDS. Loop it.

     HOW
       ScreenToGif (free, Windows, made for exactly this). Record the
       editor area only — no title bar, no sidebar, no taskbar. Nothing
       in the frame that is not the code.
       12 frames a second is plenty. Aim under 3 MB or the page crawls.
       A dark theme makes a smaller, cleaner file than a light one.

     THEN
       Save as media/hide.gif, commit, push. The link below already
       points at the right place. Marketplace will not load a relative
       path — it has to be this full raw.githubusercontent address.
     ═══════════════════════════════════════════════════════════════════ -->

![Alt+X hides the code and leaves the reasoning](https://raw.githubusercontent.com/naveed-toro/vibe-read/main/media/hide.gif)

One key. The code goes, the reasoning stays. Press it again and it is all
back — nothing was ever edited.

---

## This isn't a folding tool. It's a way of working.

Let's be honest about how we code now.

You describe what you want. The AI writes it — clean, structured, and full of
comments explaining every decision it made. Those comments are gold. They are
the AI telling you exactly what it was thinking.

But you never read them. They arrive buried inside two hundred lines of code,
and your eyes go straight to the code. So you skim, you accept, you move on —
and you learn nothing.

Then the next prompt is just as vague as the last one.

**Vibe Read breaks that habit.** One key hides the code and leaves only the
reasoning on screen. You read what the AI was thinking, in plain language, in
about thirty seconds. Now you understand the shape of the solution — and your
next instruction is sharper, because you know what you are asking it to change.

That is the loop. Read the why, then ask better.

---

## The loop

**1. Ask the AI — and ask for reasoning.**

> "Write this function, and comment your reasoning."

Most people never add that second half. It costs nothing and it is the whole
reason this works.

**2. You get code.** Correct, probably. Overwhelming, definitely.

**3. Press `Alt+X`.** The code disappears. Only the reasoning stays.

**4. Read it.** Thirty seconds. You now know what it did and, more
importantly, why.

**5. Ask better.**

> Not *"fix the checkout"* — but
> *"keep the discount order, but round after tax, not before."*

That is a sentence you could not have written a minute ago.

**6. Press `Alt+M`.** What you just learned is kept as notes.

Repeat. Each turn you understand a little more, and the AI has to guess a
little less.

---

## Any file. Any language.

It only needs comments in it.

```python
# The discount comes off before tax. The other order overcharges
# the customer, and in most places it is also illegal.
if coupon:
    subtotal *= (1 - coupon.rate)
```

Comments are recognised properly in Python, JavaScript, TypeScript, JSX/TSX,
Java, C, C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, Dart, SQL, HTML,
XML, Vue, Svelte, CSS, YAML, TOML, shell, PowerShell, Dockerfile, Makefile,
Lua, Haskell, Clojure, LaTeX, MATLAB, R, Perl, Elixir and more.

**Trailing comments too.** This:

```python
total = subtotal * 1.2  # VAT is included in the displayed price here
```

becomes this:

```
🙈  # VAT is included in the displayed price here
```

The statement goes, the reason stays.

**Python docstrings count as reasoning, not as code.** Most languages explain
themselves in real comments — JSDoc, Javadoc, `///`, `<!-- -->`. Python puts
its explanation in a string, and hiding that would defeat the whole point. A
string used as data — a block of SQL, an HTML template — is code, and goes.

No comments in what your AI gave you? Ask it again, adding
**"and comment your reasoning."**

---

## Keep it as notes

`Alt+M` turns the file inside out. The reasoning becomes the document, and the
code folds underneath it — dated, numbered, and yours to keep.

This is what it looks like. The fold below is real: click it.

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

### 2. Round once, at the end

Rounding at each step drifts by a few cents on large carts, and the accounts
team does notice.

<details>
<summary>🙈 code</summary>

```python
return round(subtotal * (1 + tax_rate), 2)
```

</details>

<!-- ═══════════════════════════════════════════════════════════════════
     OPTIONAL PICTURE — not a GIF, and that is deliberate.

     Reading a document is not a movement. A GIF would scroll past
     before anyone could read a word of it. The live fold above already
     does the demonstrating, so this is only worth doing if you want to
     show the split view — the file on the left, the notes on the right,
     side by side.

     A single screenshot. Save as media/notes.png and put it here:
     ![Alt+M opens the notes beside your file](https://raw.githubusercontent.com/naveed-toro/vibe-read/main/media/notes.png)
     ═══════════════════════════════════════════════════════════════════ -->

It opens beside your file. Nothing is written to disk until you save it.

Come back to it in a month and you will still understand your own project.

---

## Shortcuts

| Key | What it does |
|---|---|
| `Alt` + `X` | Hide / show the code. Select some lines first to do only those. |
| `Alt` + `M` | Keep it as notes |
| `Ctrl` + `C` | Copies only what you can see |

Two keys. That is all of them, and there is nothing else to learn.

Want to see one particular line? Select it and press `Alt+X`. The same key,
narrowed to whatever you picked. There is no third way, on purpose.

`Ctrl+C` only changes while something is hidden. The rest of the time it is
VS Code's own copy, untouched — an editor's defaults are not mine to take away.

---

## Settings

```json
"vibeRead.hiddenIcon": "🙈"
```

Suggestions: 🙈 ⋯ 💤 🫥 — or anything else you like.

---

## Not just for AI code

The same key works on anything you did not write yourself: an unfamiliar
repository, a colleague's module, your own code from two years ago. Hide the
code and read what past-you was thinking. It is the fastest way into a file
you do not know.

---

## Why I built this

I built an extension called **Smart Fold** a while back. It folded code, and
it had four modes and eight commands, and almost nobody used it — which was
fair, because nobody wants to learn eight commands.

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
