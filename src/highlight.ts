// ---------------------------------------------------------------------------
// Colouring code on the reading page.
//
// The page is a webview, and a webview cannot borrow the editor's colours:
// VS Code keeps its token colours to itself. So this paints a small set of
// kinds — keywords, strings, numbers, comments, function names, types — and
// the page picks dark or light colours to match the theme.
//
// It is deliberately small. It is not a parser and does not try to be one;
// it only has to make code look like code instead of plain text. No library,
// because the package ships without node_modules.
// ---------------------------------------------------------------------------

import { syntaxFor } from './comments';

const C_LIKE = new Set((
    'abstract as async await break case catch class const continue debugger default delete do else enum ' +
    'export extends false final finally fn for from func function get go if impl implements import in ' +
    'instanceof interface let match mod mut namespace new null nil package private protected public ' +
    'readonly return self set static struct super switch this throw throws true try type typeof undefined ' +
    'use var void when where while with yield override val fun object sealed data trait loop unsafe ' +
    'pub crate dyn ref move defer chan select range map string number boolean any never unknown int ' +
    'long short float double char byte bool'
).split(' '));

const PYTHON = new Set((
    'False None True and as assert async await break class continue def del elif else except finally for ' +
    'from global if import in is lambda nonlocal not or pass raise return try while with yield self match case'
).split(' '));

const RUBY = new Set((
    'alias and begin break case class def defined do else elsif end ensure false for if in module next nil ' +
    'not or redo rescue retry return self super then true undef unless until when while yield require'
).split(' '));

const SHELL = new Set((
    'if then else elif fi for while until do done case esac in function return local export echo exit ' +
    'set unset readonly shift source alias cd'
).split(' '));

const SQL = new Set((
    'select from where and or not insert into values update set delete create table drop alter join left ' +
    'right inner outer on as group by order having limit offset union all distinct null is in like ' +
    'between case when then else end primary key foreign references index view begin commit rollback'
).split(' '));

function keywordsFor(languageId: string): { words: Set<string>; caseless: boolean } {
    if (languageId === 'python') { return { words: PYTHON, caseless: false }; }
    if (languageId === 'ruby') { return { words: RUBY, caseless: false }; }
    if (['shellscript', 'bash', 'zsh', 'powershell', 'dockerfile', 'makefile'].includes(languageId)) {
        return { words: SHELL, caseless: false };
    }
    if (languageId === 'sql') { return { words: SQL, caseless: true }; }
    return { words: C_LIKE, caseless: false };
}

const MARKUP = new Set(['html', 'xml', 'vue', 'svelte', 'markdown']);

/** Returns HTML: the code escaped, with each recognised piece wrapped in a span. */
export function highlight(code: string, languageId: string): string {
    const syntax = syntaxFor(languageId);
    const { words, caseless } = keywordsFor(languageId);
    const markup = MARKUP.has(languageId);
    const backtick = !['python', 'sql', 'rust'].includes(languageId);
    const tripleQuotes = syntax.docQuotes ?? [];
    const hashComments = syntax.line.includes('#');

    let out = '';
    let i = 0;
    const n = code.length;

    const take = (cls: string, end: number) => {
        out += `<span class="tk-${cls}">${escape(code.slice(i, end))}</span>`;
        i = end;
    };

    while (i < n) {
        const ch = code[i];

        // Comments: a whole line comment, or a block up to its close.
        const lineToken = syntax.line.find(t => code.startsWith(t, i) && commentCanStart(t));
        if (lineToken) {
            const end = code.indexOf('\n', i);
            take('c', end === -1 ? n : end);
            continue;
        }
        if (syntax.block && code.startsWith(syntax.block.open, i)) {
            const close = code.indexOf(syntax.block.close, i + syntax.block.open.length);
            take('c', close === -1 ? n : close + syntax.block.close.length);
            continue;
        }

        // Strings. Python's triple quotes run across lines; so do backticks.
        const triple = tripleQuotes.find(q => code.startsWith(q, i));
        if (triple) {
            const close = code.indexOf(triple, i + 3);
            take('s', close === -1 ? n : close + 3);
            continue;
        }
        if (ch === '"' || (ch === '`' && backtick) || (ch === "'" && closesOnLine(i))) {
            take('s', stringEnd(i, ch));
            continue;
        }

        // Markup: a tag name, and an attribute before its "=".
        if (markup && ch === '<') {
            const m = /^<\/?[A-Za-z][\w:-]*/.exec(code.slice(i));
            if (m) { take('k', i + m[0].length); continue; }
        }

        // Numbers, but not the digits at the end of a name like item2.
        if (/[0-9]/.test(ch) && !/[\w$]/.test(code[i - 1] ?? '')) {
            const m = /^(0x[0-9a-fA-F_]+|\d[\d_]*(\.\d+)?([eE][+-]?\d+)?)/.exec(code.slice(i));
            if (m) { take('n', i + m[0].length); continue; }
        }

        // Words: keywords, then function names (a word followed by "("),
        // then types (a capitalised word).
        if (/[A-Za-z_$@]/.test(ch)) {
            const m = /^[@$]?[A-Za-z_$][\w$]*/.exec(code.slice(i));
            if (m) {
                const word = m[0];
                const end = i + word.length;
                const key = caseless ? word.toLowerCase() : word;
                if (word.startsWith('@')) { take('k', end); continue; }
                if (markup && code[end] === '=') { take('f', end); continue; }
                if (words.has(key)) { take('k', end); continue; }
                if (/^\s*\(/.test(code.slice(end, end + 40))) { take('f', end); continue; }
                if (!markup && /^[A-Z]/.test(word) && /[a-z]/.test(word)) { take('t', end); continue; }
                out += escape(word);
                i = end;
                continue;
            }
        }

        out += escape(ch);
        i++;
    }
    return out;

    // A "#" only starts a comment at the start of a line or after a space,
    // which keeps ${#items[@]} and colour codes out of it.
    function commentCanStart(token: string): boolean {
        if (token !== '#' || !hashComments) { return true; }
        const before = code[i - 1];
        return before === undefined || before === '\n' || /\s/.test(before);
    }

    // A single quote that never closes on its line is not a string: Rust's
    // lifetimes ('a) and English apostrophes in templates look like this.
    function closesOnLine(start: number): boolean {
        const lineEnd = code.indexOf('\n', start);
        const rest = code.slice(start + 1, lineEnd === -1 ? n : lineEnd);
        return /^(\\.|[^'\\])*'/.test(rest);
    }

    function stringEnd(start: number, quote: string): number {
        let j = start + 1;
        while (j < n) {
            if (code[j] === '\\') { j += 2; continue; }
            if (code[j] === quote) { return j + 1; }
            if (code[j] === '\n' && quote !== '`') { return j; }
            j++;
        }
        return n;
    }
}

function escape(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Colours for the page. VS Code puts vscode-light, vscode-dark or
 * vscode-high-contrast on the webview's body, so each gets its own set —
 * the Light+ and Dark+ colours most people already know.
 */
export const HIGHLIGHT_CSS = `
body.vscode-light .tk-k { color: #0000ff; }
body.vscode-light .tk-s { color: #a31515; }
body.vscode-light .tk-n { color: #098658; }
body.vscode-light .tk-c { color: #008000; font-style: italic; }
body.vscode-light .tk-f { color: #795e26; }
body.vscode-light .tk-t { color: #267f99; }
body.vscode-dark .tk-k, body.vscode-high-contrast .tk-k { color: #569cd6; }
body.vscode-dark .tk-s, body.vscode-high-contrast .tk-s { color: #ce9178; }
body.vscode-dark .tk-n, body.vscode-high-contrast .tk-n { color: #b5cea8; }
body.vscode-dark .tk-c, body.vscode-high-contrast .tk-c { color: #6a9955; font-style: italic; }
body.vscode-dark .tk-f, body.vscode-high-contrast .tk-f { color: #dcdcaa; }
body.vscode-dark .tk-t, body.vscode-high-contrast .tk-t { color: #4ec9b0; }
body.vscode-high-contrast-light .tk-k { color: #0f4a85; }
body.vscode-high-contrast-light .tk-s { color: #a31515; }
body.vscode-high-contrast-light .tk-c { color: #515151; }
`;
