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
    /**
     * Quote marks that, when a line begins with them, open a block of prose
     * rather than a value. Python's docstrings, essentially.
     *
     * Every other language documents itself in real comments — JSDoc, Javadoc,
     * `///`, `<!-- -->`, `/* *\/` are all comments already. Python is the one
     * that puts its explanation in a string, and it is also the language most
     * AI-written code arrives in, so it cannot be left out.
     */
    docQuotes?: string[];
}

const C_STYLE: CommentSyntax = { line: ['//'], block: { open: '/*', close: '*/' } };
const HASH: CommentSyntax = { line: ['#'] };
const PYTHON: CommentSyntax = { line: ['#'], docQuotes: ['"""', "'''"] };
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
    python: PYTHON, ruby: HASH, shellscript: HASH, bash: HASH, zsh: HASH,
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

/**
 * How many separate things the file explains — its "whys".
 *
 * Not the number of comment lines. A four-line paragraph is one reason told
 * over four lines, not four reasons, and counting lines would say otherwise.
 * A run of comment lines is one why; a blank line or a line of code ends it;
 * a trailing comment is a why of its own, belonging to the line it sits on.
 *
 * This is the unit the status bar counts and the unit Alt+M turns into a
 * numbered section, so both always agree.
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
export function readLine(
    text: string,
    syntax: CommentSyntax,
    insideBlock: boolean,
    docAllowed = false
): LineKind {
    // Inside a block, even an empty line belongs to it. This is checked first:
    // treating it as blank would cut one long explanation into two.
    if (insideBlock) { return { kind: 'comment' }; }
    if (text.trim() === '') { return { kind: 'blank' }; }

    const trimmed = text.trim();

    // A line that opens with a comment token is a comment line.
    for (const token of syntax.line) {
        if (trimmed.startsWith(token)) { return { kind: 'comment' }; }
    }
    if (syntax.block && trimmed.startsWith(syntax.block.open)) { return { kind: 'comment' }; }
    // A docstring: prose, so far as anyone reading is concerned.
    if (docAllowed && openingDoc(trimmed, syntax) !== null) { return { kind: 'comment' }; }
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

/**
 * Which docstring quote this line begins with, or null.
 *
 * The line has to *start* with it. That single condition is what keeps a
 * multi-line string being used as data out of the way:
 *
 *     query = """SELECT * FROM carts"""    <- starts with `query =`, so: code
 *     """Why this function exists."""      <- starts with the quotes, so: prose
 *
 * A string only stands alone at the start of a line when it is being used as
 * documentation. Anything else has a name or an operator in front of it.
 */
function openingDoc(trimmed: string, syntax: CommentSyntax): string | null {
    for (const quote of syntax.docQuotes ?? []) {
        if (trimmed.startsWith(quote)) { return quote; }
    }
    return null;
}

/** Does a block comment or docstring open on this line and stay open? */
export function opensBlock(
    text: string,
    syntax: CommentSyntax,
    insideBlock: boolean,
    docAllowed = false
): boolean {
    const trimmed = text.trim();

    if (insideBlock) {
        // Whichever kind we are inside, a closing token on this line ends it.
        // Both are checked because only one of them can have been open, and no
        // language here has both.
        if (syntax.block && text.includes(syntax.block.close)) { return false; }
        for (const quote of syntax.docQuotes ?? []) {
            if (text.includes(quote)) { return false; }
        }
        return !!(syntax.block || syntax.docQuotes);
    }

    if (docAllowed) {
        const quote = openingDoc(trimmed, syntax);
        if (quote !== null) {
            // The tokens are the same at both ends, so a one-liner needs a
            // second one: `"""Short."""` opens and closes on this line.
            return trimmed.indexOf(quote, quote.length) === -1;
        }
    }

    if (!syntax.block) { return false; }
    const { open, close } = syntax.block;
    const openAt = text.lastIndexOf(open);
    if (openAt === -1) { return false; }
    return text.indexOf(close, openAt + open.length) === -1;
}

/**
 * Reads a whole file, keeping the state that single lines cannot carry.
 *
 * The docstring rule lives here because it needs the line before. Python only
 * calls a string a docstring when it is the first thing in a module, a class
 * or a function — so it has to open the file, or follow a line ending in a
 * colon. Anywhere else a string is just a value:
 *
 *     query = """            <- a value; the closing """ below is not prose
 *         SELECT * FROM carts
 *     """
 *
 * Without that condition the closing quotes of an ordinary multi-line string
 * look exactly like the start of a docstring, and every line after it in the
 * file is misread as explanation.
 */
export function scanLines(texts: string[], syntax: CommentSyntax): ScannedLine[] {
    const out: ScannedLine[] = [];
    let insideBlock = false;
    let previous: string | null = null;   // last line that was not blank

    for (const text of texts) {
        const docAllowed = previous === null || previous.trimEnd().endsWith(':');

        out.push({
            kind: readLine(text, syntax, insideBlock, docAllowed),
            codeStart: text.length - text.trimStart().length,
        });

        insideBlock = opensBlock(text, syntax, insideBlock, docAllowed);
        if (text.trim() !== '') { previous = text; }
    }
    return out;
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
    for (const quote of syntax.docQuotes ?? []) {
        if (s.startsWith(quote)) { s = s.slice(quote.length); }
        if (s.endsWith(quote)) { s = s.slice(0, -quote.length); }
    }
    if (s.startsWith('*')) { s = s.slice(1); }        // JSDoc continuation

    return s.trim();
}
