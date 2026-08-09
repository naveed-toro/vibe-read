# 🙈 Vibe Read — Read My AI

Hide the code, read the reasoning — then give better instructions to AI.
Save it as notes.

---

AI writes the code. Its comments explain the why.

<!-- ═══════════════════════════════════════════════════════════════════
     GIF 1 — the one that decides whether anybody installs this.

     Nobody reads a marketplace page. They scroll for two seconds, watch
     whatever moves, and decide. With no download count yet, this picture
     carries the whole argument on its own.

     RECORD
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
       Turn ON the keystroke overlay so Alt+X appears as it is pressed.
       Frame the editor only. No title bar, no sidebar, no taskbar.
       12 fps is plenty. Under 3 MB, or the page crawls.
       A dark theme gives a smaller, cleaner file than a light one.

     SAVE AS  media/hide.gif   then commit and push.
     ═══════════════════════════════════════════════════════════════════ -->

| | |
|---|---|
| <kbd>Alt</kbd> <kbd>X</kbd> | ![The code hides, the reasoning stays](https://raw.githubusercontent.com/naveed-toro/vibe-read/main/media/hide.gif) |

The noise is gone. Just the reasoning.

**Understand better → tell AI better → get better back.**

Nothing was edited. Press Alt+X again and it is all back.

---

<!-- ═══════════════════════════════════════════════════════════════════
     GIF 2 — the second reason to install.

     The message is not what the notes say. It is that a document
     appeared. That is a movement, so it has to move.

     RECORD
       1. Same file, already in reading mode — the monkeys showing, so
          this picks up where the one above left off.
       2. Window wide enough for two panes side by side.
       3. Press Alt+M. The notes open on the right.
       4. Hold 3 seconds on the split view. Stop.

     ABOUT 5 SECONDS.   SAVE AS  media/notes.gif
     ═══════════════════════════════════════════════════════════════════ -->

| | |
|---|---|
| <kbd>Alt</kbd> <kbd>M</kbd> | ![The file becomes notes](https://raw.githubusercontent.com/naveed-toro/vibe-read/main/media/notes.gif) |

One more key, and it is yours to keep. The reasoning becomes the document.

---

<!-- ═══════════════════════════════════════════════════════════════════
     GIF 3 — small, and deliberately so.

     Watching the first one, a reader thinks: that is a blunt instrument,
     I would want some of the code. This answers that, but the doubt
     forms after the pitch, not before it — so it belongs here, and it
     must not compete with the first picture for attention.

     RECORD
       1. Already in reading mode — monkeys showing.
       2. Frame EIGHT OR TEN LINES ONLY, not the whole editor. This is
          what keeps it small.
       3. Drag-select two or three lines. The selection must be visible.
       4. Press Alt+X. Only that code comes back.
       5. Hold 2 seconds. Stop.

     ABOUT 4 SECONDS.   SAVE AS  media/select.gif
     ═══════════════════════════════════════════════════════════════════ -->

| | |
|---|---|
| select lines<br><kbd>Alt</kbd> <kbd>X</kbd> | ![Only the selected lines come back](https://raw.githubusercontent.com/naveed-toro/vibe-read/main/media/select.gif) |

Some parts you want to read with the code. Select those lines, press Alt+X
again.

---

<!-- ═══════════════════════════════════════════════════════════════════
     GIF 4 — the one that makes people keep it.

     People put stickers on laptops, charms in their Crocs, four emoji on
     a Telegram profile. None of it does anything. All of it is why they
     stay attached to the thing. And in an editor, other people see this:
     a developer screen-shares several times a day, and the mark is down
     the left of every hidden line.

     So this is not a settings screenshot. It is somebody making the tool
     theirs, and it should look like fun.

     RECORD
       1. Code hidden, marks showing. Click the mark in the status bar.
       2. Arrow slowly down the list — the editor behind changes with
          each one. That change is the whole recording; let it land.
       3. Stop on one that is nothing like the default.

     ABOUT 6 SECONDS.   SAVE AS  media/mark.gif
     ═══════════════════════════════════════════════════════════════════ -->

![Pick the mark you want](https://raw.githubusercontent.com/naveed-toro/vibe-read/main/media/mark.gif)

Make it yours. Click the mark at the bottom and take one of these, or put in
anything you like — emoji, text, or both. Your system's emoji keyboard does
the choosing.

```
🤫              quiet
🙈 not looking  emoji + text
💤💤            sleepy
💻 code         there is code here
⋯               no emoji — best for reading
＋              Set your own…
```

Every row has a pencil. They are a starting point, not a cage.

---

## Any language.

Python, JavaScript, TypeScript, JSX/TSX, Java, C, C++, C#, Go, Rust, Ruby,
PHP, Swift, Kotlin, Scala, Dart, SQL, HTML, XML, Vue, Svelte, CSS, YAML, TOML,
shell, PowerShell, Dockerfile, Makefile, Lua, Haskell, Clojure, LaTeX, MATLAB,
R, Perl, Elixir and more. Trailing comments and Python docstrings too.

## Two keys

| Key | What it does |
|---|---|
| <kbd>Alt</kbd> <kbd>X</kbd> | Hide / show the code. Select some lines to do only those. |
| <kbd>Alt</kbd> <kbd>M</kbd> | Keep it as notes |
| <kbd>Ctrl</kbd> <kbd>C</kbd> | Copy only what you see |

That is all of them. There is nothing else to learn.

<br>

---

<br>

*Everything below is for whoever wants it. The keys above are the whole
extension.*

## The notes, close up

This is what `Alt+M` writes. The fold is real — click it.

**checkout.py** · 🙈 Vibe Read · 1 note

**1. Discount before tax**

The other order overcharges the customer, and in most places it is also
illegal.

<details>
<summary>🙈 code</summary>

```python
if coupon:
    subtotal *= (1 - coupon.rate)
```

</details>

Dated, numbered, and yours. Nothing is written to disk until you save it.

## This isn't a folding tool. It's a way of working.

You describe what you want. The AI writes it — clean, structured, and full of
comments explaining every decision it made. Those comments are gold. They are
the AI telling you exactly what it was thinking.

But you never read them. They arrive buried inside two hundred lines of code,
and your eyes go straight to the code. So you skim, you accept, you move on —
and you learn nothing. Then the next prompt is just as vague as the last one.

That is the trap. Not that the AI writes badly, but that it explains itself to
someone who is not listening.

**Vibe Read breaks the habit.** One key hides the code and leaves only the
reasoning. Thirty seconds later you know the shape of the solution — and your
next instruction is a sharper one, because you know what you are asking it to
change.

## The loop

**1. Ask for reasoning.** *"Write this function, and comment your reasoning."*
Most people never add that second half. It costs nothing, and it is the whole
reason this works.

**2. You get code.** Correct, probably. Overwhelming, definitely.

**3. Press `Alt+X`.** The code goes. The reasoning stays.

**4. Read it.** Thirty seconds.

**5. Ask better.** Not *"fix the checkout"* — but *"keep the discount order,
but round after tax, not before."* That is a sentence you could not have
written a minute ago.

**6. Press `Alt+M`.** What you understood is kept.

Then round again. Each turn you understand a little more, and the AI guesses a
little less. That is the whole method, and there is nothing clever about it —
it only works because you finally read the part you were skipping.

## Small things that matter

**Trailing comments.** `total = subtotal * 1.2  # VAT included here` hides the
statement and leaves the reason. The comment is the point; the multiplication
is not.

**Python docstrings count as reasoning, not code.** Most languages explain
themselves in real comments — JSDoc, Javadoc, `///`, `<!-- -->`. Python puts
its explanation in a string, and hiding that would defeat the entire point. A
string used as data — a block of SQL, an HTML template — is code, and goes.

**`Ctrl+C` only changes while something is hidden.** The rest of the time it
is VS Code's own copy, untouched. An editor's defaults are not mine to take
away.

**The mark is seen by other people.** That is half the point of letting you
choose it. You screen-share, you pair, you paste a screenshot into a pull
request — and it is down the left of every hidden line while you do. Nobody
ever saw your tab width.

## Why I built this

I built an extension called **Smart Fold** a while back. It folded code. It
had four modes and eight commands, and almost nobody used it — which was fair,
because nobody wants to learn eight commands.

Then the way I worked changed. I stopped writing most of my code and started
describing it instead. And I noticed something uncomfortable: the AI was
explaining itself carefully, every single time, and I was ignoring every word
of it. I was accepting code I had not understood, and then complaining that my
prompts were not working.

The problem was never folding. It was that the explanation and the code live
in the same file, and the code always wins your attention.

So this does one thing. It takes the code away for a moment, so you can
actually read what your AI told you.

---

*Made by [Naveed](https://github.com/naveed-toro). MIT licensed.
Issues and ideas welcome at
[github.com/naveed-toro/vibe-read](https://github.com/naveed-toro/vibe-read).*
