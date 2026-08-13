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
import { codeOf, reasoning, SKIPPED, type Section } from './notes';

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

    const prose = reasoning(input.sections)
        .map(paragraph => paragraph === SKIPPED
            ? `<p class="skipped">${SKIPPED}</p>`
            : `<p>${escape(paragraph)}</p>`)
        .join('');

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
 * The tab is as wide as the window and the window can be very wide. Text run
 * across all of it cannot be read: the eye loses the line it was on every time
 * it comes back to the left. Somewhere around sixty characters is where prose
 * has always been set, and the empty space either side is doing as much work
 * as the words.
 */
main {
    max-width: 34em;
    margin: 0 auto;
    padding: 0 1.5em 40vh 1.5em;
}

header {
    display: flex; align-items: baseline; gap: .7em;
    max-width: 34em; margin: 0 auto;
    padding: 2em 1.5em 1em 1.5em;
    font-size: .85em;
    opacity: .7;
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
    max-width: 34em; margin: 0 auto 2em auto;
    border: 0; border-top: 1px solid var(--vscode-panel-border);
}

p {
    font-size: 1.05em;
    line-height: 1.75;
    margin: 0 0 1.4em 0;
}

/*
 * Where code was passed over. The same mark the editor leaves behind, doing
 * the same job: it says something was here, without saying it loudly.
 */
p.skipped {
    text-align: center;
    opacity: .3;
    letter-spacing: .3em;
    margin: 1.8em 0 2.2em 0;
    user-select: none;
}

details { margin: 1.2em 0; }
summary {
    cursor: pointer; list-style: none;
    font-size: .85em; opacity: .5;
    font-family: var(--vscode-editor-font-family);
}
summary::-webkit-details-marker { display: none; }
summary::before { content: '▸ '; }
details[open] summary::before { content: '▾ '; }
summary:hover { opacity: .9; }

pre {
    margin: .8em 0 0 0; padding: .9em 1.1em;
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
${prose}
<details>
<summary>the code · ${code.length} lines</summary>
<pre><code>${escape(code.join('\n'))}</code></pre>
</details>
<details>
<summary>the whole file · ${input.lineTexts.length} lines</summary>
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
