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
import { codeOf, type Section } from './notes';

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

header {
    display: flex; align-items: baseline; gap: .7em;
    max-width: 36em; margin: 0 auto;
    padding: 2em 1.6em 1em 1.6em;
    font-size: .82em;
    opacity: .65;
}
header .face { font-family: 'vibe-read'; font-size: 1.6em; opacity: .9; }
header .grow { flex: 1; }
header .name { cursor: pointer; text-decoration: none; color: inherit; }
header .name:hover { text-decoration: underline; opacity: 1; }
header button {
    font: inherit; cursor: pointer; white-space: nowrap;
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    background: var(--vscode-button-secondaryBackground, transparent);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px; padding: .25em .8em;
}
header button:hover { background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground)); }

hr {
    max-width: 36em; margin: 0 auto 1.6em auto;
    border: 0; border-top: 1px solid var(--vscode-panel-border);
}

/*
 * The reading itself.
 *
 * Set smaller than the editor's own text rather than larger. Big type reads as
 * a headline and headlines are skimmed; this is meant to be read. The line
 * height is generous because the eye needs a rail to return along, and the
 * space between paragraphs does the work that a numbered heading was doing
 * badly.
 */
p {
    font-size: 14.5px;
    line-height: 1.75;
    margin: 0 0 1.5em 0;
    max-width: 34em;
}

details { margin: 1.1em 0; }
summary {
    cursor: pointer; list-style: none;
    font-family: var(--vscode-editor-font-family);
    font-size: .78em; opacity: .45;
}
summary::-webkit-details-marker { display: none; }
summary::before { content: '▸ '; }
details[open] > summary::before { content: '▾ '; }
summary:hover { opacity: .85; }

/* The three that hold the page together sit a little firmer than the rest. */
summary.block { font-size: .82em; opacity: .6; margin-bottom: 1.2em; }
details[open] > summary.block { margin-bottom: 1.6em; }

/* And a paragraph's own code steps back under it, out of the way. */
details.inline { margin: -.9em 0 1.5em 0; }

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
    <span>· ${today} · ${whys} why${whys === 1 ? '' : 's'}</span>
    <span class="grow"></span>
    <button id="save">Save as Markdown</button>
</header>
<hr>
<main>
<details open>
<summary class="block">the whole file · reasoning</summary>
${prose}
</details>

<details>
<summary class="block">the whole file · code · ${code.length} lines</summary>
<pre><code>${escape(code.join('\n'))}</code></pre>
</details>

<details>
<summary class="block">the whole file · as it is · ${input.lineTexts.length} lines</summary>
<pre><code>${escape(input.lineTexts.join('\n'))}</code></pre>
</details>
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
