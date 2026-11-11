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
import { highlight, HIGHLIGHT_CSS } from './highlight';
import { codeOf, commentsOf, paragraphsOf, type Section } from './notes';

let panel: vscode.WebviewPanel | undefined;
// The page now showing. The message handler is attached once, so it must read
// this, not the input it was created with, or Save keeps the first file.
let current: ReaderInput | undefined;

export interface ReaderInput {
    fileName: string;
    languageId: string;
    lineTexts: string[];
    sections: Section[];
    /** The same count the status bar shows, so the two never disagree. */
    whys: number;
    /** The file this was read from, so there is a way back to it. */
    source: vscode.Uri;
    /** Called when the reader asks for the portable copy. */
    /** Resolves to the saved file's name, or undefined if the reader cancelled. */
    onSave: () => Thenable<string | undefined>;
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
            if (message.type === 'save' && current) {
                void current.onSave().then(name => {
                    if (name) { void panel?.webview.postMessage({ type: 'saved', name }); }
                });
            }
            if (message.type === 'open') {
                if (current) { void vscode.window.showTextDocument(current.source); }
            }
        });
    }

    current = input;
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
    const whys = input.whys;
    const code = codeOf(input.sections);
    const comments = commentsOf(input.sections);

    // Each why is numbered and has a rule down its left, so a reader who is
    // scrolling always knows how many there are and which one they are on.
    // The code under it is a small grey pill: there if wanted, never in the way.
    const prose = input.sections.map((section, i) => {
        const paragraphs = paragraphsOf(section.prose)
            .map(p => `<p${p.list ? ' class="item"' : ''}>${escape(p.text)}</p>`)
            .join('');
        const count = section.code.length;
        const code = count === 0 ? '' :
            `<details class="inline"><summary>code · ${count} line${count === 1 ? '' : 's'}</summary>` +
            `<pre><code>${highlight(section.code.join('\n'), input.languageId)}</code></pre></details>`;
        return `<article class="why"><span class="num">${i + 1}</span><div class="body">${paragraphs}${code}</div></article>`;
    }).join('');

    const glance = input.sections.map(section => {
        const paragraphs = paragraphsOf(section.prose)
            .map(p => `<p${p.list ? ' class="item"' : ''}>${escape(p.text)}</p>`)
            .join('');
        return section.code.length > 0
            ? paragraphs + '<div class="gap" aria-label="code">⋯</div>'
            : paragraphs;
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
    background: var(--vscode-editor-background);
    padding: 0; margin: 0;
}
.col { max-width: 40em; margin: 0 auto; padding: 0 1.6em; }

/*
 * The bar. It stays at the top while the page scrolls, so the file's name and
 * the one thing worth pressing are always in sight. It is the only tinted
 * strip on the page and the button is the only filled colour, so those are
 * the first two places the eye lands.
 */
.bar {
    position: sticky; top: 0; z-index: 5;
    background: var(--vscode-sideBar-background, var(--vscode-textBlockQuote-background, rgba(128,128,128,.08)));
    border-bottom: 1px solid var(--vscode-panel-border);
    backdrop-filter: blur(6px);
}
.bar .col { display: flex; align-items: center; gap: .9em; padding-top: 1em; padding-bottom: 1em; }
.bar .face {
    font-family: 'vibe-read'; font-size: 26px; line-height: 1;
    display: inline-flex; align-items: center; justify-content: center;
    width: 42px; height: 42px; border-radius: 10px;
    background: #f59e0b; color: #1f1f1f; flex: none;
}
.bar .who { display: flex; flex-direction: column; min-width: 0; }
.bar .name {
    cursor: pointer; color: var(--vscode-foreground); text-decoration: none;
    font-size: 19px; font-weight: 700; letter-spacing: -.01em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bar .name:hover { text-decoration: underline; }
.bar .about { font-size: 13px; color: var(--vscode-descriptionForeground); margin-top: .15em; }
.bar .about b { color: var(--vscode-foreground); font-weight: 600; }
.bar .grow { flex: 1; }
.save {
    font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap;
    color: var(--vscode-button-foreground, #fff);
    background: var(--vscode-button-background, #0078d4);
    border: 0; border-radius: 8px; padding: .65em 1.2em;
    box-shadow: 0 1px 2px rgba(0,0,0,.18), 0 4px 14px rgba(0,120,212,.28);
    transition: transform .08s ease, background .15s ease;
}
.save:hover { background: var(--vscode-button-hoverBackground, #026ec1); }
.save:active { transform: translateY(1px); }
.save.done { background: #2e7d32; }
.save .hint { display: block; font-size: 11px; font-weight: 400; opacity: .85; margin-top: .1em; }

/* Section titles: small, spaced capitals, so the page has two clear parts. */
.label {
    font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    color: var(--vscode-descriptionForeground);
    margin: 2.6em 0 1.4em 0;
}

/*
 * The reading. Set for somebody who finds reading hard: big type, lines far
 * apart, a short measure, ragged right.
 */
p {
    font-size: 16.5px; line-height: 1.8; letter-spacing: .012em; word-spacing: .06em;
    margin: 0 0 .9em 0; text-align: left; hyphens: none;
}
p.item { margin: 0 0 .4em 1.4em; text-indent: -1.4em; }

.why {
    display: grid; grid-template-columns: 2.2em 1fr; gap: 0 1em;
    padding: .2em 0 .2em 0; margin: 0 0 1.9em 0;
}
.why .num {
    font-size: 13px; font-weight: 700; color: var(--vscode-textLink-foreground, #0078d4);
    border: 1.5px solid currentColor; border-radius: 999px;
    width: 1.9em; height: 1.9em; display: inline-flex; align-items: center; justify-content: center;
    margin-top: .25em;
}
.why .body { border-left: 2px solid var(--vscode-panel-border); padding-left: 1.1em; }

details > summary { cursor: pointer; list-style: none; }
summary::-webkit-details-marker { display: none; }

/* A paragraph's own code: quiet, small, close under it. */
details.inline { margin: -.2em 0 0 0; }
details.inline > summary {
    display: inline-block; font-family: var(--vscode-editor-font-family); font-size: 11.5px;
    color: var(--vscode-descriptionForeground); opacity: .8;
    padding: .15em .7em; border-radius: 999px; border: 1px solid var(--vscode-panel-border);
}
details.inline > summary::before { content: '▸ '; }
details.inline[open] > summary::before { content: '▾ '; }
details.inline > summary:hover { opacity: 1; background: var(--vscode-list-hoverBackground); }

pre {
    margin: .6em 0 0 0; padding: .85em 1.1em;
    background: var(--vscode-textCodeBlock-background, var(--vscode-editor-background));
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 6px; overflow-x: auto;
}
pre code {
    display: block; background: none; border: 0; padding: 0;
    white-space: pre; tab-size: 4; color: var(--vscode-editor-foreground);
    font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); line-height: 1.55;
}
${HIGHLIGHT_CSS}

/*
 * The shelf. Three tiles side by side, all shut: the comments, the code and
 * the file as it is. Left open, the comments repeated the reading word for
 * word, and the same text twice reads as a mistake.
 */
.shelf { border-top: 1px solid var(--vscode-panel-border); margin-top: 1em; padding-bottom: 40vh; }
.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: .8em; }
.tile {
    font: inherit; text-align: left; cursor: pointer;
    color: var(--vscode-foreground);
    background: var(--vscode-textBlockQuote-background, rgba(128,128,128,.08));
    border: 1px solid var(--vscode-panel-border); border-radius: 10px;
    padding: .9em 1em;
}
.tile b { display: block; font-size: 14.5px; }
.tile small { color: var(--vscode-descriptionForeground); font-size: 12.5px; }
.tile:hover { border-color: var(--vscode-focusBorder, #0078d4); }
.tile[aria-pressed="true"] { border-color: var(--vscode-focusBorder, #0078d4); box-shadow: inset 0 0 0 1px var(--vscode-focusBorder, #0078d4); }
.panel { margin-top: 1.1em; }
.panel.glance {
    background: var(--vscode-textBlockQuote-background, rgba(128,128,128,.08));
    border: 1px solid var(--vscode-panel-border); border-radius: 10px;
    padding: 1.2em 1.5em .5em 1.5em;
}
.panel.glance p { font-size: 15.5px; line-height: 1.75; }
.panel.glance .gap { text-align: center; opacity: .45; letter-spacing: .3em; margin: .1em 0 .9em 0; user-select: none; }
@media (max-width: 560px) { .tiles { grid-template-columns: 1fr; } .save .hint { display: none; } }
</style>
</head>
<body>
<header class="bar"><div class="col">
    <span class="face">&#xe002;</span>
    <div class="who">
        <a class="name" id="open" title="Back to the file">${escape(input.fileName)}</a>
        <span class="about"><b>${whys} why${whys === 1 ? '' : 's'}</b> · ${today}</span>
    </div>
    <span class="grow"></span>
    <button class="save" id="save" title="Save as a Markdown file next to the code">⬇&nbsp; Save as notes</button>
</div></header>
<main class="col">
<div class="label">Reasoning</div>
${prose}
<section class="shelf">
<div class="label">More</div>
<div class="tiles">
    <button class="tile" data-panel="p-comments" aria-pressed="false"><b>Comments</b><small>${comments.length} lines</small></button>
    <button class="tile" data-panel="p-code" aria-pressed="false"><b>Code</b><small>${code.length} lines</small></button>
    <button class="tile" data-panel="p-file" aria-pressed="false"><b>As it is</b><small>${input.lineTexts.length} lines</small></button>
</div>
<div class="panel glance" id="p-comments" hidden>${glance}</div>
<div class="panel" id="p-code" hidden><pre><code>${highlight(code.join('\n'), input.languageId)}</code></pre></div>
<div class="panel" id="p-file" hidden><pre><code>${highlight(input.lineTexts.join('\n'), input.languageId)}</code></pre></div>
</section>
</main>
<script nonce="${nonce}">
const api = acquireVsCodeApi();
window.scrollTo(0, 0);
const save = document.getElementById('save');
save.addEventListener('click', () => api.postMessage({ type: 'save' }));
// After a save the button says so for a few seconds, then is ready again.
window.addEventListener('message', e => {
    if (e.data && e.data.type === 'saved') {
        save.textContent = '✓  Saved';
        save.classList.add('done');
        setTimeout(() => { save.innerHTML = '⬇&nbsp; Save as notes'; save.classList.remove('done'); }, 3000);
    }
});
document.getElementById('open').addEventListener('click', () => api.postMessage({ type: 'open' }));
// One tile open at a time; pressing the open one shuts it.
const tiles = [...document.querySelectorAll('.tile')];
tiles.forEach(t => t.addEventListener('click', () => {
    const open = t.getAttribute('aria-pressed') === 'true';
    tiles.forEach(o => { o.setAttribute('aria-pressed', 'false'); document.getElementById(o.dataset.panel).hidden = true; });
    if (!open) { t.setAttribute('aria-pressed', 'true'); const p = document.getElementById(t.dataset.panel); p.hidden = false; p.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
}));
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
