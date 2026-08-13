// ---------------------------------------------------------------------------
// The reading room.
//
// Hiding the code was only ever half of it. An editor is built for writing:
// a fixed-width font, code-width lines, syntax colours. Prose survives there,
// but nobody settles into it.
//
// So the reasoning gets its own pane — and, more importantly, that pane is
// tied to the file. Scroll the code and the reasoning follows; scroll the
// reasoning and the code follows. Two views of one thing, the way a diff is
// two views of one file. That tie is the reason this is a webview of our own
// rather than VS Code's markdown preview, which can only ever follow the
// markdown file it was made from.
//
// What travels is still markdown. The button in the corner writes the same
// document as before, and that one opens anywhere. The room is ours; the
// paper is everyone's.
// ---------------------------------------------------------------------------

import * as vscode from 'vscode';
import type { Section } from './notes';

interface Open {
    panel: vscode.WebviewPanel;
    /** The file being read, so scrolling can find its way back. */
    source: string;
    sections: Section[];
    /**
     * The last line these two panes agreed on.
     *
     * A diff editor never needs this: one widget owns both scrollbars. Here
     * there are two, and each answers the other, so the same line comes back
     * as an echo. Judging that by a stopwatch was the mistake — the editor
     * answers late, and by then the reader had been given the wheel. Judged by
     * the line itself, an echo is unmistakable: it is the number we just sent.
     */
    agreedLine: number | null;
    /**
     * Until when the file is only listening.
     *
     * Identity alone was not enough. A reveal does not land in one step — VS
     * Code walks the editor there, and every step of that walk arrives as
     * another scroll event carrying a line we never asked for. Each one was
     * being answered, and the answers landed under the hand of whoever was
     * scrolling the reader. So the pane that was moved keeps quiet for a
     * moment afterwards, which is long enough for its own trail to pass.
     */
    quietUntil: number;
}

let open: Open | undefined;

export interface ReaderInput {
    fileName: string;
    languageId: string;
    sections: Section[];
    /** Called when the reader asks for the portable copy. */
    onSave: () => void;
}

export function showReader(
    extensionUri: vscode.Uri,
    editor: vscode.TextEditor,
    input: ReaderInput,
): void {
    const source = editor.document.uri.toString();

    const panel = open?.panel ?? vscode.window.createWebviewPanel(
        'vibeRead.reader',
        'Reading',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
        },
    );

    if (!open) {
        panel.onDidDispose(() => { open = undefined; });
        panel.webview.onDidReceiveMessage((message: { type: string; line?: number }) => {
            if (!open) { return; }

            if (message.type === 'save') {
                input.onSave();
                return;
            }

            if (message.type === 'reveal' && typeof message.line === 'number') {
                const target = vscode.window.visibleTextEditors
                    .find(e => e.document.uri.toString() === open?.source);
                if (!target || target.visibleRanges.length === 0) { return; }

                // The reader names the note it has reached; the file puts that
                // note's own comment at the top. Both sides land on the same
                // thing, which is the only alignment either of them can promise.
                if (message.line === target.visibleRanges[0].start.line) { return; }

                open.agreedLine = message.line;
                open.quietUntil = Date.now() + 250;
                target.revealRange(
                    new vscode.Range(message.line, 0, message.line, 0),
                    vscode.TextEditorRevealType.AtTop,
                );
            }
        });
    }

    panel.title = `Reading ${input.fileName}`;
    panel.webview.html = pageFor(panel.webview, extensionUri, input);
    open = { panel, source, sections: input.sections, agreedLine: null, quietUntil: 0 };
    panel.reveal(panel.viewColumn, true);
}

/**
 * The file has been scrolled. Tell the reader which note that lands on.
 *
 * Registered once, for every editor, because the reader is meant to follow
 * whichever file it was opened on without being asked again.
 */
export function followEditor(event: vscode.TextEditorVisibleRangesChangeEvent): void {
    if (!open) { return; }
    if (event.textEditor.document.uri.toString() !== open.source) { return; }
    if (event.visibleRanges.length === 0) { return; }

    if (Date.now() < open.quietUntil) { return; }

    const line = event.visibleRanges[0].start.line;
    if (line === open.agreedLine) { return; }

    // Only which line the file has reached. Working out where on screen a
    // comment has got to was tried and abandoned: VS Code counts in lines, not
    // pixels, and a wrapped line counts as one — so the answer was an average
    // that was wrong by a little all the time. A note arriving at the top of
    // both panes is a thing that can actually be kept.
    open.agreedLine = line;
    open.panel.webview.postMessage({ type: 'goto', line });
}

export function readerIsOpenFor(document: vscode.TextDocument): boolean {
    return open?.source === document.uri.toString();
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

function pageFor(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
    input: ReaderInput,
): string {
    const nonce = String(Math.random()).slice(2);
    const font = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'media', 'vibe-read.woff'),
    );
    const today = new Date().toISOString().slice(0, 10);
    const count = input.sections.length;

    // Every element that can name a line in the file names it. These are the
    // points where the two panes are known to agree, and the scrolling is
    // nothing but the straight line drawn between one and the next — so the
    // more of them there are, the truer it is everywhere in between.
    const notes = input.sections.map((section, index) => {
        const [heading, ...rest] = section.prose;
        const body = rest.length > 0
            ? `<p data-line="${section.line + 1}">${escape(rest.join(' '))}</p>`
            : '';
        const code = section.code.length > 0
            ? `<details data-line="${section.codeLine}">` +
              `<summary>code · ${section.code.length} line${section.code.length === 1 ? '' : 's'}</summary>` +
              `<pre><code>${escape(trimIndent(section.code).join('\n'))}</code></pre></details>`
            : '';

        return `<section>` +
            `<h2 data-line="${section.line}"><span class="n">${index + 1}</span>${escape(heading)}</h2>` +
            body + code +
            `</section>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
@font-face { font-family: 'vibe-read'; src: url('${font}') format('woff'); }

body {
    font-family: var(--vscode-font-family);
    font-size: 15px;
    line-height: 1.7;
    color: var(--vscode-foreground);
    padding: 0 2.2em 60vh 2.2em;
    max-width: 46em;
}

header {
    display: flex; align-items: baseline; gap: .7em;
    padding: 1.4em 0 .9em 0;
    border-bottom: 1px solid var(--vscode-panel-border);
    font-size: .85em;
    opacity: .75;
}
header .face { font-family: 'vibe-read'; font-size: 1.5em; opacity: .9; }
header .grow { flex: 1; }
header button {
    font: inherit; cursor: pointer;
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    background: var(--vscode-button-secondaryBackground, transparent);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px; padding: .2em .7em;
}
header button:hover { background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground)); }

section { padding: 1.6em 0; }
h2 { font-size: 1.15em; font-weight: 600; margin: 0 0 .5em 0; line-height: 1.45; }
h2 .n { opacity: .4; margin-right: .6em; font-weight: 400; }
p { margin: 0 0 .8em 0; }

details { margin-top: .7em; }
summary {
    cursor: pointer; list-style: none;
    font-size: .8em; opacity: .55;
    font-family: var(--vscode-editor-font-family);
}
summary::-webkit-details-marker { display: none; }
summary::before { content: '▸ '; }
details[open] summary::before { content: '▾ '; }
summary:hover { opacity: .9; }
/*
 * One block, not a background behind each line. Code is quoted here the way
 * everyone quotes code — a bordered box, a fixed-width font, and lines that
 * run off to the right rather than being folded in half. Anything else and
 * the eye stops trusting that it is looking at code.
 */
pre {
    margin: .7em 0 0 0; padding: .75em 1em;
    background: var(--vscode-textCodeBlock-background, var(--vscode-editor-background));
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 5px;
    overflow-x: auto;
}
pre code {
    display: block;
    background: none;
    border: 0;
    padding: 0;
    white-space: pre;
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
    line-height: 1.55;
    tab-size: 4;
}
</style>
</head>
<body>
<header>
    <span class="face">&#xe002;</span>
    <span>${escape(input.fileName)} · ${today} · ${count} note${count === 1 ? '' : 's'}</span>
    <span class="grow"></span>
    <button id="save">Save as Markdown</button>
</header>
${notes}
<script nonce="${nonce}">
const api = acquireVsCodeApi();

document.getElementById('save').addEventListener('click', () => api.postMessage({ type: 'save' }));

// Where the two panes are known to meet: a comment and its heading, the rest
// of a comment and its paragraph, a stretch of code and its fold. Between two
// of these, position is worked out by straight proportion, and at each one it
// is exact. This is how VS Code's own markdown preview follows its source, and
// it is the only arrangement here with nothing in it to tune — the shape of
// the file decides everything, rather than some number chosen by hand that
// suits one file and ruins the next.
/** A little breathing room above whatever is being lined up. */
const PAD = 14;

const anchors = Array.from(document.querySelectorAll('[data-line]'))
    .filter(el => Number(el.dataset.line) >= 0);

let marks = [];

// Opening a fold moves everything below it, so the measurements are taken
// again rather than trusted from load. Cheap, and the alternative is a page
// that quietly points at where things used to be.
function measure() {
    marks = anchors
        .map(el => ({ line: Number(el.dataset.line), y: el.offsetTop - PAD }))
        .sort((a, b) => a.line - b.line)
        .filter((m, i, all) => i === 0 || m.line > all[i - 1].line);
}

measure();
window.addEventListener('resize', measure);
for (const fold of document.querySelectorAll('details')) {
    fold.addEventListener('toggle', measure);
}

/** Straight-line reading between the two marks a value falls between. */
function between(value, from, to) {
    if (marks.length === 0) { return 0; }
    if (marks.length === 1 || value <= marks[0][from]) { return marks[0][to]; }

    for (let i = 1; i < marks.length; i++) {
        if (value <= marks[i][from]) {
            const span = marks[i][from] - marks[i - 1][from];
            const part = span > 0 ? (value - marks[i - 1][from]) / span : 0;
            return marks[i - 1][to] + part * (marks[i][to] - marks[i - 1][to]);
        }
    }
    return marks[marks.length - 1][to];
}

let expectedY = -1;
let target = null;
let running = false;

// The hand on the wheel wins. While somebody is scrolling this pane, the
// file's answers are dropped rather than obeyed — otherwise the page is pulled
// out from under them by the very movement they asked for.
let drivingUntil = 0;
let waitingToTell = false;

// The last line this pane sent. When it comes back it is our own voice, and
// it must be dropped however late it arrives — a stopwatch cannot tell an
// echo from an answer, and this one was arriving after the clock ran out.
// Obeying it undid every small scroll: the file rounds to a whole line, that
// line maps back to where the note sits, and the page was dragged back to
// exactly where it had started.
let lastSent = null;

// The file arrives in whole lines, so a step of one line can be a step of
// eighty pixels here. Easing spreads that step over a few frames, which is
// the difference between a page that follows and a page that flinches.
function ease() {
    if (target === null) { running = false; return; }

    const distance = target - window.scrollY;
    const next = Math.abs(distance) < 0.5 ? target : window.scrollY + distance * 0.25;

    window.scrollTo(0, next);
    expectedY = window.scrollY;

    if (next === target) { target = null; running = false; return; }
    requestAnimationFrame(ease);
}

window.addEventListener('message', event => {
    if (event.data.type !== 'goto') { return; }
    if (event.data.line === lastSent) { return; }
    if (Date.now() < drivingUntil) { return; }

    lastSent = event.data.line;

    const wanted = between(event.data.line, 'line', 'y');
    // Already there: the file is answering a move we made ourselves.
    if (Math.abs(wanted - window.scrollY) < 2) { return; }

    target = wanted;
    if (!running) { running = true; requestAnimationFrame(ease); }
});

window.addEventListener('scroll', () => {
    // Landed where we put it, so this is the tail of our own movement.
    if (Math.abs(window.scrollY - expectedY) < 2) { return; }

    // Somebody has taken the wheel. Whatever we were doing is now stale.
    target = null;
    running = false;
    drivingUntil = Date.now() + 250;

    // A wheel throws off scroll events far faster than a screen redraws, and
    // each one crossing to the file is a line the editor is asked to walk to.
    // One a frame is as often as any of it can be seen.
    if (waitingToTell) { return; }
    waitingToTell = true;
    requestAnimationFrame(() => {
        waitingToTell = false;
        drivingUntil = Date.now() + 250;
        lastSent = Math.round(between(window.scrollY, 'y', 'line'));
        api.postMessage({ type: 'reveal', line: lastSent });
    });
});
</script>
</body>
</html>`;
}

function escape(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/** Same as the markdown copy: code reads better pulled back to the margin. */
function trimIndent(lines: string[]): string[] {
    const indents = lines
        .filter(l => l.trim() !== '')
        .map(l => l.length - l.trimStart().length);

    const smallest = indents.length > 0 ? Math.min(...indents) : 0;
    return smallest === 0 ? lines : lines.map(l => l.slice(smallest));
}
