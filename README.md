# 🙈 Vibe Read — Read My AI

**AI writes the code. Its comments explain the why. Hide the code,
read the reasoning — then give better instructions. Save it as notes.**

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

### 1. Ask the AI — and ask for reasoning

> "Write this function, and comment your reasoning."

Most people never add that second half. It costs you nothing and it is the
whole reason this works.

### 2. You get code

Correct, probably. Overwhelming, definitely.

```python
def apply_checkout(cart, tax_rate, coupon):
    # An empty cart has to be caught here. The price maths below divides by
    # the item count, so an empty list would crash it.
    if not cart:
        return 0

    subtotal = sum(item.price for item in cart)

    # Discount before tax. The other order overcharges the customer, and in
    # most places it is also illegal.
    if coupon:
        subtotal *= (1 - coupon.rate)

    # Rounding once, at the end. Rounding at each step drifts by a few cents
    # on large carts, and accounting notices.
    return round(subtotal * (1 + tax_rate), 2)
```

### 3. Press `Alt+X`

The code disappears. Only the reasoning stays.

```
🙈
    # An empty cart has to be caught here. The price maths below divides by
    # the item count, so an empty list would crash it.
🙈
🙈

    # Discount before tax. The other order overcharges the customer, and in
    # most places it is also illegal.
🙈
🙈

    # Rounding once, at the end. Rounding at each step drifts by a few cents
    # on large carts, and accounting notices.
🙈
```

### 4. Read it

Thirty seconds. You now know what it did and, more importantly, why.

### 5. Ask better

Not *"fix the checkout"* — but:

> "Keep the discount order, but round after tax, not before."

That is a sentence you could not have written a minute ago.

### 6. Press `Alt+M`

What you just learned is kept as notes: a document where the reasoning is the
text and the code sits collapsed underneath it. Come back to it in a month and
you will still understand your own project.

Repeat. Each turn you understand a little more, and the AI has to guess a
little less.

---

## What it does

🙈 **Hide the code** — one key, and only the reasoning is left on screen
🖱️ **Peek at any line** — rest the mouse on the icon to see what is under it
📋 **Copy what you see** — `Ctrl+C` skips whatever is hidden
📄 **Keep it as notes** — turn the file into a document worth revisiting

---

## Shortcuts

| Key | What it does |
|---|---|
| `Alt` + `X` | Hide / show the code. Select some lines first to do only those. |
| `Alt` + `M` | Keep it as notes |
| `Ctrl` + `C` | Copies only what you can see |

Two keys. That is all of them, and there is nothing else to learn.

To bring back one line on its own, select it and press `Alt+X` — the same key,
narrowed to what you picked. To simply look without changing anything, hover
over the icon.

`Ctrl+C` only changes while something is hidden. The rest of the time it is
VS Code's own copy, untouched — an editor's defaults are not mine to take away.

---

## Settings

```json
"vibeRead.hiddenIcon": "🙈"
```

Suggestions: 🙈 ⋯ 💤 🫥 — or anything else you like.

```json
"vibeRead.showEditorButton": true,
"vibeRead.notesIncludeFullSource": true
```

---

## Languages

Comments are recognised properly in Python, JavaScript, TypeScript, JSX/TSX,
Java, C, C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, Dart, SQL, HTML,
XML, Vue, Svelte, CSS, YAML, TOML, shell, PowerShell, Dockerfile, Makefile,
Lua, Haskell, Clojure, LaTeX, MATLAB, R, Perl, Elixir and more.

Trailing comments work too. This:

```python
total = subtotal * 1.2  # VAT is included in the displayed price here
```

becomes this:

```
🙈  # VAT is included in the displayed price here
```

The statement goes, the reason stays.

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
accepting code I had not understood, and then complaining that my prompts
were not working.

The problem was never folding. It was that the explanation and the code live
in the same file, and the code always wins your attention.

So Vibe Read does one thing: it takes the code away for a moment, so you can
actually read what your AI told you.

---

*Made by [Naveed](https://github.com/naveed-toro). MIT licensed.
Issues and ideas welcome at [github.com/naveed-toro/vibe-read](https://github.com/naveed-toro/vibe-read).*
