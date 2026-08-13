// ---------------------------------------------------------------------------
// The reading room.
//
// A tab of its own, the width of the window, and nothing in it but the file's
// reasoning set as prose. The code is not beside it, because the promise was a
// place without distractions and half a screen of code is a distraction.
//
// It used to be a pane alongside the editor, with the two scrolling together.
// That was a good week's work and it was the wrong idea: a thing that follows
// your cursor through the code is a debugger, and this was never meant to be
// one. What it is meant to be is the thirty seconds in which somebody actually
// reads what their AI told them. Reading needs stillness, not synchrony.
//
// Three pieces. The reasoning is open, because that is the whole point; the
// code and the file are shut, because they are only here so that nothing has
// been taken away. What travels is markdown — the button writes the same three
// pieces into a document that opens anywhere.
// ---------------------------------------------------------------------------

import * as vscode from 'vscode';
import { codeOf, commentsOf, type Section } from './notes';

let panel: vscode.WebviewPanel | undefined;

export interface ReaderInput {
    fileName: string;
    languageId: string;
    lineTexts: string[];
    sections: Section[];
    /** The file this was read from, so there is a way back to it. */
    source: vscode.Uri;
    /** Called when the reader asks for the portable copy. */
    onSave: () => void;
}

export function showReader(extensionUri: vscode.Uri, input: ReaderInput): void {
    if (!panel) {
        panel = vscode.window.createWebviewPanel(
            'vibeRead.reader',
            'Reading',
            // The active column, not beside it. This takes the screen, which is
            // the only arrangement that keeps the promise.
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
            },
        );

        panel.onDidDispose(() => { panel = undefined; });
        panel.webview.onDidReceiveMessage((message: { type: string }) => {
            if (message.type === 'save') { input.onSave(); }
            if (message.type === 'open') {
                void vscode.window.showTextDocument(input.source);
            }
        });
    }

    panel.title = `Reading ${input.fileName}`;
    panel.webview.html = pageFor(panel.webview, extensionUri, input);
    panel.reveal(panel.viewColumn);
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
    const whys = input.sections.length;
    const code = codeOf(input.sections);
    const comments = commentsOf(input.sections);

    // Each paragraph, and under it the code it was explaining — shut, one line
    // high. No number in front of it and no heading above it: those were what
    // turned a page into a filing cabinet.
    const prose = input.sections.map(section => {
        const paragraph = `<p>${escape(section.prose.join(' '))}</p>`;
        if (section.code.length === 0) { return paragraph; }

        const count = section.code.length;
        return paragraph +
            `<details class="inline"><summary>code · ${count} line${count === 1 ? '' : 's'}</summary>` +
            `<pre><code>${escape(section.code.join('\n'))}</code></pre></details>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
@font-face { font-family: 'vibe-read'; src: url('${font}') format('woff'); }

body {
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    padding: 0;
    margin: 0;
}

/*
 * A column, not a page.
 *
 * The tab is as wide as the window and a window can be very wide. Prose run
 * across all of it cannot be read: the eye loses its line on the way back to
 * the left margin. Around sixty characters is where books settled centuries
 * ago, and the empty space either side is doing as much work as the words.
 */
main {
    max-width: 36em;
    margin: 0 auto;
    padding: 0 1.6em 40vh 1.6em;
}

/*
 * The line at the top says whose page this is, what it came from and how much
 * there was to say. It was set at four fifths of the size and two thirds of
 * the ink, and it disappeared. A page needs a name.
 */
header {
    display: flex; align-items: baseline; gap: .6em;
    max-width: 36em; margin: 0 auto;
    padding: 2.2em 1.6em 1.4em 1.6em;
    font-size: 14px;
}
header .face { font-family: 'vibe-read'; font-size: 1.7em; opacity: .85; }
header .name {
    cursor: pointer; text-decoration: none;
    color: var(--vscode-foreground);
    font-weight: 600;
}
header .name:hover { text-decoration: underline; }
header .about { opacity: .6; }
header .grow { flex: 1; }
header button {
    font: inherit; cursor: pointer; white-space: nowrap;
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    background: var(--vscode-button-secondaryBackground, transparent);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px; padding: .3em .9em;
}
header button:hover { background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground)); }

/*
 * The reading itself.
 *
 * Set for somebody who finds reading hard, because a page that works for them
 * works for everybody. The advice is old and consistent, and none of it is
 * decoration:
 *
 *   Bigger than you think. Sixteen or seventeen pixels, not fourteen.
 *   Lines far apart — half again the size of the type at least.
 *   A short line, sixty to seventy characters, so the eye finds its way back.
 *   Ragged right, never justified: even word spacing matters more than a
 *     straight edge, and justification tears rivers of white through a
 *     paragraph.
 *   Letters and words given a little air, which stops them running together.
 *   No italics for anything long, and no walls: paragraphs kept short and
 *     clearly apart.
 */
p {
    font-size: 16.5px;
    line-height: 1.85;
    letter-spacing: .012em;
    word-spacing: .06em;
    margin: 0 0 1.7em 0;
    max-width: 32em;
    text-align: left;
    hyphens: none;
}

details { margin: 1.1em 0; }

/*
 * The folds are meant to be seen.
 *
 * They were set at three quarters of the size and half the ink, and they
 * vanished — a control nobody notices is a control that does not exist. A
 * fold is an offer, and an offer has to be legible before it can be refused.
 */
summary {
    cursor: pointer; list-style: none;
    font-family: var(--vscode-font-family);
    font-size: 13px;
    opacity: .75;
}
summary::-webkit-details-marker { display: none; }
summary::before { content: '▸ '; }
details[open] > summary::before { content: '▾ '; }
summary:hover { opacity: 1; }

/*
 * The blocks that hold the page together.
 *
 * They were the same grey whisper as everything else and read as a stray line
 * of the reasoning rather than as the lid of a box. A block needs to look like
 * a block: its own weight, its own outline, and — for the three at the bottom
 * — a rule and a stretch of empty page above them, so that the eye knows the
 * reading has ended and the shelf has begun.
 */
summary.block {
    display: inline-block;
    font-family: var(--vscode-font-family);
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: .01em;
    opacity: .85;
    padding: .35em .9em;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 5px;
}
summary.block:hover {
    opacity: 1;
    background: var(--vscode-list-hoverBackground);
}
details.reading > summary.block { margin-bottom: 2em; }

.more {
    margin-top: 3.5em;
    padding-top: 2em;
    border-top: 1px solid var(--vscode-panel-border);
}
.more > details { margin: 0 0 1em 0; }

/*
 * A paragraph's own code, stepped back under it and wearing a border so that
 * it reads as something to press rather than something to read.
 */
details.inline { margin: -.9em 0 1.7em 0; }
details.inline > summary {
    display: inline-block;
    padding: .2em .8em;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 999px;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    opacity: .7;
}
details.inline > summary:hover {
    opacity: 1;
    background: var(--vscode-list-hoverBackground);
}

pre {
    margin: .7em 0 0 0; padding: .85em 1.1em;
    background: var(--vscode-textCodeBlock-background, var(--vscode-editor-background));
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 5px;
    overflow-x: auto;
}
pre code {
    display: block; background: none; border: 0; padding: 0;
    white-space: pre; tab-size: 4;
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
    line-height: 1.55;
}
</style>
</head>
<body>
<header>
    <span class="face">&#xe002;</span>
    <a class="name" id="open" title="Back to the file">${escape(input.fileName)}</a>
    <span class="about">${today} · ${whys} why${whys === 1 ? '' : 's'}</span>
    <span class="grow"></span>
    <button id="save">Save as Markdown</button>
</header>
<main>
<details open class="reading">
<summary class="block">the whole file · reasoning</summary>
${prose}
</details>

<section class="more">
<details>
<summary class="block">the whole file · comments · ${comments.length} lines</summary>
<pre><code>${escape(comments.join('\n'))}</code></pre>
</details>

<details>
<summary class="block">the whole file · code · ${code.length} lines</summary>
<pre><code>${escape(code.join('\n'))}</code></pre>
</details>

<details>
<summary class="block">the whole file · as it is · ${input.lineTexts.length} lines</summary>
<pre><code>${escape(input.lineTexts.join('\n'))}</code></pre>
</details>
</section>
</main>
<script nonce="${nonce}">
const api = acquireVsCodeApi();
document.getElementById('save').addEventListener('click', () => api.postMessage({ type: 'save' }));
document.getElementById('open').addEventListener('click', () => api.postMessage({ type: 'open' }));
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
