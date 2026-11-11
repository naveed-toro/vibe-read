// ---------------------------------------------------------------------------
// Knowing what a comment looks like, in any language.
//
// Every line of a file is one of four things: blank, a comment, code, or code
// with a comment at the end. Getting that right is the whole extension — a
// line called a comment by mistake stays on screen while its code vanishes,
// and a comment called code disappears with the code.
//
// It is a small scanner rather than a regular expression, because the hard
// cases are all about context: a // inside a string, a /* inside a glob, a
// # inside ${#arr[@]}, a regex like /https?:\/\//, a string that runs over
// several lines. It remembers, from one line to the next, whether it is
// inside a block comment, a docstring or a multi-line string.
// ---------------------------------------------------------------------------

export interface CommentSyntax {
    /** Tokens that start a comment running to the end of the line. */
    line: string[];
    /** Block comment delimiters, if the language has them. */
    block?: { open: string; close: string };
    /** Python-style docstrings: a string at the start of a body is prose. */
    docQuotes?: string[];
    /** Strings that may run over several lines: ` in JavaScript, """ in Kotlin. */
    multiQuotes?: string[];
    /** Single-line quote marks. Defaults to " ' and `. */
    quotes?: string;
    /** JavaScript-style /regex/ literals, which can contain //. */
    regex?: boolean;
    /** Words that start a comment line, any case: REM in batch files. */
    words?: string[];
    /** Haskell: -- followed by a symbol is an operator, not a comment. */
    dashOperators?: boolean;
    /** PHP 8: #[Attribute] is code, not a comment. */
    hashBracketIsCode?: boolean;
    /** HTML, Vue, Svelte: <script> and <style> sections use their own syntax. */
    embedded?: boolean;
}

const C: CommentSyntax = { line: ['//'], block: { open: '/*', close: '*/' } };
const C_MULTI: CommentSyntax = { ...C, multiQuotes: ['"""'] };
const JS: CommentSyntax = { ...C, multiQuotes: ['`'], regex: true };
const HASH: CommentSyntax = { line: ['#'] };
const HASH_MULTI: CommentSyntax = { line: ['#'], multiQuotes: ['"""'] };
const DASH: CommentSyntax = { line: ['--'] };
const CSS: CommentSyntax = { line: [], block: { open: '/*', close: '*/' } };
const SCSS: CommentSyntax = { ...C };
const PYTHON: CommentSyntax = {
    line: ['#'], docQuotes: ['"""', "'''"], multiQuotes: ['"""', "'''"],
};
const HTML: CommentSyntax = { line: [], block: { open: '<!--', close: '-->' }, quotes: '"', embedded: true };
const LISP: CommentSyntax = { line: [';'], block: { open: '#|', close: '|#' }, quotes: '"' };

const BY_LANGUAGE: Record<string, CommentSyntax> = {
    javascript: JS, javascriptreact: JS, typescript: JS, typescriptreact: JS,
    coffeescript: { line: ['#'], block: { open: '###', close: '###' }, multiQuotes: ['"""', "'''"] },
    java: C_MULTI, kotlin: C_MULTI, scala: C_MULTI, swift: C_MULTI, csharp: C_MULTI,
    groovy: { ...C, multiQuotes: ['"""', "'''"] },
    dart: { ...C, multiQuotes: ['"""', "'''"] },
    go: { ...C, multiQuotes: ['`'] },
    c: C, cpp: C, 'objective-c': C, 'objective-cpp': C, objectivec: C, 'cuda-cpp': C,
    rust: C, zig: { line: ['//'] }, d: C, v: C, solidity: C, proto: C, proto3: C,
    hlsl: C, glsl: C, shaderlab: C, arduino: C, apex: C, verilog: C, systemverilog: C,
    json: C, jsonc: C, json5: C,
    php: { line: ['//', '#'], block: { open: '/*', close: '*/' }, hashBracketIsCode: true },
    fsharp: { line: ['//'], block: { open: '(*', close: '*)' }, multiQuotes: ['"""'] },
    ocaml: { line: [], block: { open: '(*', close: '*)' }, quotes: '"' },
    pascal: { line: ['//'], block: { open: '{', close: '}' } },

    python: PYTHON, mojo: PYTHON, gdscript: { ...PYTHON },
    julia: { line: ['#'], block: { open: '#=', close: '=#' }, multiQuotes: ['"""'] },
    ruby: { line: ['#'], block: { open: '=begin', close: '=end' } },
    crystal: HASH, elixir: HASH_MULTI, nim: { line: ['#'], block: { open: '#[', close: ']#' }, multiQuotes: ['"""'] },
    perl: { line: ['#'], block: { open: '=pod', close: '=cut' } }, raku: HASH,
    r: HASH, tcl: HASH, awk: HASH,
    shellscript: HASH, bash: HASH, sh: HASH, zsh: HASH, fish: HASH, nushell: HASH,
    powershell: { line: ['#'], block: { open: '<#', close: '#>' } },
    yaml: HASH, toml: HASH, dockerfile: HASH, makefile: HASH, cmake: HASH,
    properties: { line: ['#', '!'] }, dotenv: HASH, ignore: HASH, gitignore: HASH,
    graphql: HASH, nix: { line: ['#'], block: { open: '/*', close: '*/' } },
    terraform: { line: ['#', '//'], block: { open: '/*', close: '*/' } },
    hcl: { line: ['#', '//'], block: { open: '/*', close: '*/' } },
    ini: { line: [';', '#'] },
    bat: { line: ['::'], words: ['rem'] },

    html: HTML, xml: { ...HTML, embedded: false }, svg: { ...HTML, embedded: false },
    vue: HTML, svelte: HTML, astro: HTML, 'django-html': HTML, razor: HTML,
    markdown: { ...HTML, embedded: false },
    handlebars: { line: [], block: { open: '{{!--', close: '--}}' }, quotes: '"' },
    twig: { line: [], block: { open: '{#', close: '#}' }, quotes: '"' },
    jinja: { line: [], block: { open: '{#', close: '#}' }, quotes: '"' },
    css: CSS, scss: SCSS, less: SCSS, sass: { line: ['//'], block: { open: '/*', close: '*/' } },
    stylus: SCSS,

    sql: { line: ['--'], block: { open: '/*', close: '*/' } },
    lua: { line: ['--'], block: { open: '--[[', close: ']]' }, multiQuotes: ['[['] },
    haskell: { line: ['--'], block: { open: '{-', close: '-}' }, dashOperators: true },
    elm: { line: ['--'], block: { open: '{-', close: '-}' }, dashOperators: true },
    purescript: { line: ['--'], block: { open: '{-', close: '-}' }, dashOperators: true },
    ada: DASH, vhdl: DASH,
    clojure: LISP, lisp: LISP, scheme: LISP, racket: LISP,
    latex: { line: ['%'], quotes: '' }, tex: { line: ['%'], quotes: '' }, bibtex: { line: ['%'], quotes: '' },
    matlab: { line: ['%'], block: { open: '%{', close: '%}' } },
    erlang: { line: ['%'] }, prolog: { line: ['%'], block: { open: '/*', close: '*/' } },
    fortran: { line: ['!'] }, 'fortran-modern': { line: ['!'] }, FortranFreeForm: { line: ['!'] },
    vb: { line: ["'"], words: ['rem'], quotes: '"' },
};

export function syntaxFor(languageId: string): CommentSyntax {
    return BY_LANGUAGE[languageId] ?? C;
}

/** The syntax used inside <script> and <style> in HTML-like files. */
const SECTION: Record<string, CommentSyntax> = { script: JS, style: CSS };

/**
 * How many separate things the file explains — its "whys".
 *
 * A run of comment lines is one why; a blank line or a line of code ends it;
 * a trailing comment is a why of its own. This is the unit the status bar
 * counts and the reading page numbers, so both always agree.
 */
export function countWhys(lines: ScannedLine[]): number {
    let total = 0;
    let insideRun = false;
    for (const line of lines) {
        if (line.kind.kind === 'comment') {
            if (!insideRun) { total++; insideRun = true; }
            continue;
        }
        insideRun = false;
        if (line.kind.kind === 'mixed') { total++; }
    }
    return total;
}

/** One line of the file, after we have worked out what it is made of. */
export interface ScannedLine {
    kind: LineKind;
    /** Column where the code starts, past the indentation. */
    codeStart: number;
}

export type LineKind =
    | { kind: 'blank' }
    | { kind: 'comment' }
    | { kind: 'code' }
    /** Code, then a trailing comment. `commentAt` is where the comment starts. */
    | { kind: 'mixed'; commentAt: number };

/** What the scanner is in the middle of when a line ends. */
interface State {
    mode: 'code' | 'block' | 'doc' | 'string';
    close: string;
    section: 'html' | 'script' | 'style';
}

const WORDS_BEFORE_REGEX = new Set([
    'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'yield', 'await',
    'void', 'delete', 'throw', 'new',
]);

export function scanLines(texts: string[], syntax: CommentSyntax): ScannedLine[] {
    const out: ScannedLine[] = [];
    let state: State = { mode: 'code', close: '', section: 'html' };
    let previous: string | null = null;   // last line that was not blank

    texts.forEach((text, index) => {
        const active = syntax.embedded && state.section !== 'html' ? SECTION[state.section] : syntax;
        // A docstring only opens a body: the first line of the file, or right
        // after a line that ends with a colon.
        const docAllowed = previous === null || previous.trimEnd().endsWith(':');
        const result = scanLine(text, active, state, docAllowed, index === 0);
        out.push({ kind: result.kind, codeStart: text.length - text.trimStart().length });
        state = result.state;
        if (syntax.embedded) { state = { ...state, section: nextSection(text, state.section) }; }
        if (text.trim() !== '') { previous = text; }
    });
    return out;
}

function nextSection(text: string, section: State['section']): State['section'] {
    const lower = text.toLowerCase();
    if (section === 'html') {
        for (const tag of ['script', 'style'] as const) {
            const open = lower.lastIndexOf(`<${tag}`);
            if (open !== -1 && lower.indexOf(`</${tag}`, open) === -1) { return tag; }
        }
        return 'html';
    }
    return lower.includes(`</${section}`) ? 'html' : section;
}

function scanLine(
    text: string,
    syntax: CommentSyntax,
    state: State,
    docAllowed: boolean,
    firstLine: boolean,
): { kind: LineKind; state: State } {
    const keep = { ...state };

    // Inside a block comment or a docstring: the whole line is prose.
    if (state.mode === 'block' || state.mode === 'doc') {
        if (text.includes(state.close)) { keep.mode = 'code'; }
        return { kind: { kind: 'comment' }, state: keep };
    }

    let from = 0;
    let kind: LineKind = { kind: 'code' };

    // Inside a string that started on an earlier line: this line is code
    // until the string closes, and only after that can a comment begin.
    if (state.mode === 'string') {
        const end = findClose(text, 0, state.close);
        if (end === -1) { return { kind: { kind: 'code' }, state: keep }; }
        keep.mode = 'code';
        from = end;
    } else {
        const trimmed = text.trim();
        if (trimmed === '') { return { kind: { kind: 'blank' }, state: keep }; }
        const start = text.length - text.trimStart().length;

        // #!/usr/bin/env python is how the file is run, not an explanation.
        if (firstLine && trimmed.startsWith('#!')) { return { kind: { kind: 'code' }, state: keep }; }

        for (const word of syntax.words ?? []) {
            const head = trimmed.slice(0, word.length + 1).toLowerCase();
            if (head === word || head === word + ' ' || head === word + '\t') {
                return { kind: { kind: 'comment' }, state: keep };
            }
        }

        // A block that opens at the start of the line. Checked before line
        // tokens because Lua's --[[ also starts with --.
        if (syntax.block && trimmed.startsWith(syntax.block.open)) {
            const close = text.indexOf(syntax.block.close, start + syntax.block.open.length);
            if (close === -1) { keep.mode = 'block'; keep.close = syntax.block.close; }
            return { kind: { kind: 'comment' }, state: keep };
        }
        for (const token of syntax.line) {
            if (trimmed.startsWith(token) && tokenCounts(text, start, token, syntax)) {
                return { kind: { kind: 'comment' }, state: keep };
            }
        }
        if (docAllowed) {
            for (const quote of syntax.docQuotes ?? []) {
                if (trimmed.startsWith(quote)) {
                    if (text.indexOf(quote, start + quote.length) === -1) {
                        keep.mode = 'doc'; keep.close = quote;
                    }
                    return { kind: { kind: 'comment' }, state: keep };
                }
            }
        }
        from = start;
    }

    // Walk the code, skipping strings and regexes, looking for a comment.
    const quotes = syntax.quotes ?? '"\'`';
    let lastSignificant = '';
    let lastWord = '';
    let i = from;
    while (i < text.length) {
        const ch = text[i];

        const multi = (syntax.multiQuotes ?? []).find(q => text.startsWith(q, i));
        if (multi) {
            const end = findClose(text, i + multi.length, multi === '[[' ? ']]' : multi);
            if (end === -1) {
                keep.mode = 'string'; keep.close = multi === '[[' ? ']]' : multi;
                return { kind, state: keep };
            }
            i = end; lastSignificant = '"'; lastWord = '';
            continue;
        }

        if (quotes.includes(ch)) {
            const end = findClose(text, i + 1, ch);
            if (end !== -1) { i = end; lastSignificant = '"'; lastWord = ''; continue; }
            // A quote that never closes is an apostrophe or a Rust lifetime.
            i++;
            continue;
        }

        if (syntax.block && text.startsWith(syntax.block.open, i)) {
            kind = { kind: 'mixed', commentAt: i };
            if (text.indexOf(syntax.block.close, i + syntax.block.open.length) === -1) {
                keep.mode = 'block'; keep.close = syntax.block.close;
            }
            return { kind, state: keep };
        }

        const token = syntax.line.find(t => text.startsWith(t, i) && tokenCounts(text, i, t, syntax));
        if (token) { return { kind: { kind: 'mixed', commentAt: i }, state: keep }; }

        if (syntax.regex && ch === '/' && regexCanStart(lastSignificant, lastWord)) {
            const end = regexEnd(text, i);
            if (end !== -1) { i = end; lastSignificant = '/'; lastWord = ''; continue; }
        }

        if (/[A-Za-z0-9_$]/.test(ch)) {
            lastWord = /[A-Za-z0-9_$]/.test(text[i - 1] ?? '') ? lastWord + ch : ch;
        } else if (!/\s/.test(ch)) {
            lastWord = '';
        }
        if (!/\s/.test(ch)) { lastSignificant = ch; }
        i++;
    }
    return { kind, state: keep };
}

/** Whether a line-comment token at position i really starts a comment. */
function tokenCounts(text: string, i: number, token: string, syntax: CommentSyntax): boolean {
    const before = text[i - 1];
    const after = text[i + token.length];
    if (token === '#') {
        // A # in the middle of code is part of it: ${#arr[@]}, $#, color#1.
        if (before !== undefined && !/\s/.test(before)) { return false; }
        if (syntax.hashBracketIsCode && after === '[') { return false; }
    }
    // http:// in unquoted text — a URL, not a comment.
    if (token === '//' && before === ':' && /[A-Za-z]/.test(text[i - 2] ?? '')) { return false; }
    // \% in LaTeX is a percent sign.
    if (token === '%' && before === '\\') { return false; }
    // Haskell's --> and --| are operators.
    if (token === '--' && syntax.dashOperators) {
        let j = i;
        while (text[j] === '-') { j++; }
        if (j < text.length && /[!#$%&*+./<=>?@\\^|~:]/.test(text[j])) { return false; }
    }
    return true;
}

/** Index just past the closing quote, or -1 if it does not close on this line. */
function findClose(text: string, from: number, quote: string): number {
    for (let j = from; j < text.length; j++) {
        if (text[j] === '\\' && quote !== '[[' && quote !== ']]') { j++; continue; }
        if (text.startsWith(quote, j)) { return j + quote.length; }
    }
    return -1;
}

function regexCanStart(lastSignificant: string, lastWord: string): boolean {
    if (lastWord && WORDS_BEFORE_REGEX.has(lastWord)) { return true; }
    if (lastWord) { return false; }
    return lastSignificant === '' || '(,=:[!&|?{};+-*%<>~^'.includes(lastSignificant);
}

function regexEnd(text: string, start: number): number {
    if (text[start + 1] === '/' || text[start + 1] === '*') { return -1; }
    let inClass = false;
    for (let j = start + 1; j < text.length; j++) {
        const ch = text[j];
        if (ch === '\\') { j++; continue; }
        if (ch === '[') { inClass = true; continue; }
        if (ch === ']') { inClass = false; continue; }
        if (ch === '/' && !inClass) { return j + 1; }
    }
    return -1;
}

/**
 * The comment's words, without the markers around them.
 */
export function toProse(text: string, syntax: CommentSyntax): string {
    let s = text.trim();
    const all = syntax.embedded ? [syntax, JS, CSS] : [syntax];
    for (const syn of all) {
        // The block first: Lua's --[[ and MATLAB's %{ begin with a line token.
        if (syn.block && s.startsWith(syn.block.open)) { s = s.slice(syn.block.open.length); }
        else {
            for (const token of syn.line) {
                if (s.startsWith(token)) { s = s.slice(token.length); break; }
            }
        }
        if (syn.block && s.endsWith(syn.block.close)) { s = s.slice(0, -syn.block.close.length); }
    }
    for (const word of syntax.words ?? []) {
        if (s.toLowerCase().startsWith(word + ' ') || s.toLowerCase() === word) { s = s.slice(word.length); }
    }
    for (const quote of syntax.docQuotes ?? []) {
        if (s.startsWith(quote)) { s = s.slice(quote.length); }
        if (s.endsWith(quote)) { s = s.slice(0, -quote.length); }
    }
    if (s.startsWith('*')) { s = s.slice(1); }        // JSDoc continuation
    return s.trim();
}
