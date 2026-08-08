// ---------------------------------------------------------------------------
// Knowing what a comment looks like, in any language.
//
// The old extension only understood //, /* and *. That meant it worked on
// JavaScript and almost nothing else — while the AI people actually use it
// with writes mostly Python. This file fixes that.
// ---------------------------------------------------------------------------

export interface CommentSyntax {
    /** Tokens that start a comment running to the end of the line. */
    line: string[];
    /** Block comment delimiters, if the language has them. */
    block?: { open: string; close: string };
}

const C_STYLE: CommentSyntax = { line: ['//'], block: { open: '/*', close: '*/' } };
const HASH: CommentSyntax = { line: ['#'] };
const HTML: CommentSyntax = { line: [], block: { open: '<!--', close: '-->' } };

const BY_LANGUAGE: Record<string, CommentSyntax> = {
    // C family
    javascript: C_STYLE, javascriptreact: C_STYLE,
    typescript: C_STYLE, typescriptreact: C_STYLE,
    java: C_STYLE, c: C_STYLE, cpp: C_STYLE, csharp: C_STYLE,
    go: C_STYLE, rust: C_STYLE, swift: C_STYLE, kotlin: C_STYLE,
    scala: C_STYLE, dart: C_STYLE, php: { line: ['//', '#'], block: { open: '/*', close: '*/' } },
    json: C_STYLE, jsonc: C_STYLE, groovy: C_STYLE, objectivec: C_STYLE,

    // Hash family — this is the one that matters most
    python: HASH, ruby: HASH, shellscript: HASH, bash: HASH, zsh: HASH,
    yaml: HASH, toml: HASH, dockerfile: HASH, makefile: HASH,
    r: HASH, perl: HASH, elixir: HASH, powershell: { line: ['#'], block: { open: '<#', close: '#>' } },

    // Markup
    html: HTML, xml: HTML, markdown: HTML, vue: HTML, svelte: HTML,

    // Others
    css: { line: [], block: { open: '/*', close: '*/' } },
    scss: C_STYLE, less: C_STYLE,
    sql: { line: ['--'], block: { open: '/*', close: '*/' } },
    lua: { line: ['--'], block: { open: '--[[', close: ']]' } },
    haskell: { line: ['--'], block: { open: '{-', close: '-}' } },
    clojure: { line: [';'] }, lisp: { line: [';'] }, ini: { line: [';', '#'] },
    latex: { line: ['%'] }, matlab: { line: ['%'] }, erlang: { line: ['%'] },
    vb: { line: ["'"] },
};

/** Falls back to C-style, which is the most common shape. */
export function syntaxFor(languageId: string): CommentSyntax {
    return BY_LANGUAGE[languageId] ?? C_STYLE;
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
    /** Nothing but code on this line. */
    | { kind: 'code' }
    /** Code, then a trailing comment. `commentAt` is where the comment starts. */
    | { kind: 'mixed'; commentAt: number };

/**
 * Works out what a single line is made of.
 *
 * `insideBlock` tells us we are already inside a /* ... *\/ that opened on an
 * earlier line, so the whole line counts as comment.
 */
export function readLine(text: string, syntax: CommentSyntax, insideBlock: boolean): LineKind {
    if (text.trim() === '') { return { kind: 'blank' }; }
    if (insideBlock) { return { kind: 'comment' }; }

    const trimmed = text.trim();

    // A line that opens with a comment token is a comment line.
    for (const token of syntax.line) {
        if (trimmed.startsWith(token)) { return { kind: 'comment' }; }
    }
    if (syntax.block && trimmed.startsWith(syntax.block.open)) { return { kind: 'comment' }; }
    // Continuation of a JSDoc-style block: "  * some text"
    if (syntax.block?.open === '/*' && trimmed.startsWith('*')) { return { kind: 'comment' }; }

    // Otherwise: is there a comment further along the line? We have to walk the
    // characters so that a // inside a string doesn't fool us.
    const at = findTrailingComment(text, syntax);
    return at === -1 ? { kind: 'code' } : { kind: 'mixed', commentAt: at };
}

/** Index where a trailing comment begins, or -1. Ignores tokens inside strings. */
function findTrailingComment(text: string, syntax: CommentSyntax): number {
    let quote: string | null = null;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (quote) {
            if (ch === '\\') { i++; continue; }      // escaped character
            if (ch === quote) { quote = null; }
            continue;
        }

        if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }

        for (const token of syntax.line) {
            if (text.startsWith(token, i)) { return i; }
        }
        if (syntax.block && text.startsWith(syntax.block.open, i)) { return i; }
    }
    return -1;
}

/** Does a block comment open on this line and stay open? */
export function opensBlock(text: string, syntax: CommentSyntax, insideBlock: boolean): boolean {
    if (!syntax.block) { return false; }
    const { open, close } = syntax.block;

    if (insideBlock) { return !text.includes(close); }

    const openAt = text.lastIndexOf(open);
    if (openAt === -1) { return false; }
    return text.indexOf(close, openAt + open.length) === -1;
}

/** Strips comment markers so the text can be read as prose. */
export function toProse(text: string, syntax: CommentSyntax): string {
    let s = text.trim();

    for (const token of syntax.line) {
        if (s.startsWith(token)) { s = s.slice(token.length); break; }
    }
    if (syntax.block) {
        if (s.startsWith(syntax.block.open)) { s = s.slice(syntax.block.open.length); }
        if (s.endsWith(syntax.block.close)) { s = s.slice(0, -syntax.block.close.length); }
    }
    if (s.startsWith('*')) { s = s.slice(1); }        // JSDoc continuation

    return s.trim();
}
