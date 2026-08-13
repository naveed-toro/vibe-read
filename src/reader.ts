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
                if (!target) { return; }

                open.agreedLine = message.line;
                target.revealRange(
                    new vscode.Range(message.line, 0, message.line, 0),
                    vscode.TextEditorRevealType.AtTop,
                );
            }
        });
    }

    panel.title = `Reading ${input.fileName}`;
    panel.webview.html = pageFor(panel.webview, extensionUri, input);
    open = { panel, source, sections: input.sections, agreedLine: null };
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

    const line = event.visibleRanges[0].start.line;
    if (line === open.agreedLine) { return; }

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

    const notes = input.sections.map((section, index) => {
        const [heading, ...rest] = section.prose;
        const body = rest.length > 0 ? `<p>${escape(rest.join(' '))}</p>` : '';
        const code = section.code.length > 0
            ? `<details><summary>code · ${section.code.length} line${section.code.length === 1 ? '' : 's'}</summary>` +
              `<pre><code>${escape(trimIndent(section.code).join('\n'))}</code></pre></details>`
            : '';

        return `<section data-line="${section.line}">` +
            `<h2><span class="n">${index + 1}</span>${escape(heading)}</h2>` +
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
const notes = Array.from(document.querySelectorAll('section[data-line]'));
const lines = notes.map(n => Number(n.dataset.line));
const PAD = 14;

document.getElementById('save').addEventListener('click', () => api.postMessage({ type: 'save' }));

// Our own scrolling must not be mistaken for the user's, or the two panes
// spend the afternoon pushing each other.
// Two panes, two scrollbars, and every move one makes is reported to the
// other. Timers were not enough: a line maps back to a slightly different
// pixel than the one it came from, so the reader kept drifting back and could
// not be scrolled at all. So nothing is judged by the clock — a message that
// carries the line we ourselves just sent is our own echo and is dropped, and
// a scroll that lands where we put it is our own doing and is not reported.
let lastLine = null;
let expectedY = -1;
let target = null;
let running = false;

function topOf(index) { return notes[index].offsetTop - PAD; }

// A note is not a line, it is a stretch of lines. Landing on the note would
// jump; travelling through it at the same rate as the file does not. This is
// the closest we get to a diff's locked scrollbars, where both sides are the
// same document and no mapping is needed at all.
function offsetForLine(line) {
    if (notes.length === 0) { return 0; }
    let i = 0;
    while (i + 1 < notes.length && lines[i + 1] <= line) { i++; }
    if (i + 1 >= notes.length) { return topOf(i); }

    const span = lines[i + 1] - lines[i];
    const part = span > 0 ? Math.min(1, Math.max(0, (line - lines[i]) / span)) : 0;
    return topOf(i) + part * (topOf(i + 1) - topOf(i));
}

function lineForOffset(y) {
    if (notes.length === 0) { return 0; }
    let i = 0;
    while (i + 1 < notes.length && topOf(i + 1) <= y) { i++; }
    if (i + 1 >= notes.length) { return lines[i]; }

    const span = topOf(i + 1) - topOf(i);
    const part = span > 0 ? (y - topOf(i)) / span : 0;
    return Math.round(lines[i] + part * (lines[i + 1] - lines[i]));
}

// One note can be two lines of code and half a screen of reasoning, so even a
// perfect mapping arrives in jumps. Easing turns each jump into a movement —
// the eye keeps its place instead of having to find it again.
function ease() {
    if (target === null) { running = false; return; }

    const distance = target - window.scrollY;
    const next = Math.abs(distance) < 0.5 ? target : window.scrollY + distance * 0.22;

    window.scrollTo(0, next);
    expectedY = window.scrollY;

    if (next === target) { target = null; running = false; return; }
    requestAnimationFrame(ease);
}

window.addEventListener('scroll', () => {
    // Landed where we put it, so this is the tail of our own animation.
    if (Math.abs(window.scrollY - expectedY) < 2) { return; }

    // Somebody has taken the wheel. Whatever we were doing is now stale.
    target = null;
    running = false;

    const line = lineForOffset(window.scrollY);
    if (line === lastLine) { return; }
    lastLine = line;
    api.postMessage({ type: 'reveal', line });
});

window.addEventListener('message', event => {
    if (event.data.type !== 'goto') { return; }
    if (event.data.line === lastLine) { return; }

    lastLine = event.data.line;
    target = offsetForLine(event.data.line);
    if (!running) { running = true; requestAnimationFrame(ease); }
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
