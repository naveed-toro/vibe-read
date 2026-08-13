// ---------------------------------------------------------------------------
// Turning a file into something to read.
//
// Three blocks: the reasoning, the code, and the file as it stands. The first
// is open, and inside it each paragraph keeps its own code shut underneath.
//
// What made an earlier version unreadable was never those small folds. It was
// the numbering and the headings: every run of comments became "### 12." with
// a title lifted from its first line, and on a real file several of those
// titles were rows of equals signs. Thirty-eight headings where there should
// have been a page. The folds were doing honest work all along — a shut fold
// says "this was here" and offers to show it, which is this whole extension in
// miniature.
//
// <details> is used because it collapses in GitHub, VS Code's preview,
// Obsidian and Notion alike — no plugin, no special viewer.
// ---------------------------------------------------------------------------

import type { ScannedLine } from './comments';

export interface NotesInput {
    fileName: string;
    languageId: string;
    lineTexts: string[];
    scanned: ScannedLine[];
    toProse: (text: string) => string;
}

export interface Section {
    /** The reasoning, already stripped of comment markers. */
    prose: string[];
    /** The code it was explaining. */
    code: string[];
    /** Where in the file this run of comments began. */
    line: number;
}

/** Returns null when the file has no comments — there is nothing worth keeping. */
export function buildNotes(input: NotesInput): string | null {
    const sections = sectionsOf(input);
    if (sections.length === 0) { return null; }

    const fence = fenceFor(input.languageId);
    const today = new Date().toISOString().slice(0, 10);
    const whys = sections.length;
    const code = codeOf(sections);
    const comments = commentsOf(sections);
    const out: string[] = [];

    out.push(`# ${input.fileName}`);
    out.push('');
    out.push(`> Read with ◎ ◎ **Vibe Read** · ${today} · ${whys} why${whys === 1 ? '' : 's'}`);
    out.push('');
    out.push('---');
    out.push('');

    // Three blocks, and the reasoning is the one that is open. Inside it the
    // code still sits where it belongs — under the paragraph that explains it,
    // shut, one line high. Those small folds were taken out once and it was a
    // mistake: what made the page unreadable was the numbering and the great
    // headings, not the folds. A shut fold says "this was here" and offers to
    // show it. That is the shape of the whole idea, in miniature.
    out.push('<details open>');
    out.push('<summary>the whole file · reasoning</summary>');
    out.push('');

    for (const section of sections) {
        for (const paragraph of paragraphsOf(section.prose)) {
            out.push(paragraph.text);
            out.push('');
        }
        if (section.code.length > 0) {
            out.push(fold(`code · ${section.code.length} line${section.code.length === 1 ? '' : 's'}`, section.code, fence));
        }
    }

    out.push('</details>');
    out.push('');
    out.push(fold(`the whole file · comments · ${comments.length} lines`, comments, fence));
    out.push(fold(`the whole file · code · ${code.length} lines`, code, fence));
    out.push(fold(`the whole file · as it is · ${input.lineTexts.length} lines`, input.lineTexts, fence));

    return out.join('\n');
}

/** A run of comment lines, gathered into how it was meant to be read. */
export interface Paragraph {
    text: string;
    /** A line that was a list item, and has to stay on its own line. */
    list: boolean;
}

/** Anything that opens a line the way a list opens a line. */
const LIST = /^\s*([-*•+‣·]|\d+[.)]|[a-zA-Z][.)])\s+/;

/**
 * Lines into paragraphs.
 *
 * A comment does not break its lines where the thought ends; it breaks them
 * where the eightieth column arrives. That margin is the editor's rule, not
 * the writer's, and this page has no such margin — so the lines are run back
 * together into the sentences they were before somebody wrapped them.
 *
 * Two breaks are the writer's own and are kept. A bare comment marker with
 * nothing after it is a paragraph break, and a line that begins the way a list
 * item begins stays on its own line, because a list rolled into a paragraph
 * stops being a list.
 */
export function paragraphsOf(prose: string[]): Paragraph[] {
    const out: Paragraph[] = [];
    let current = '';

    const flush = () => {
        if (current !== '') { out.push({ text: current, list: false }); }
        current = '';
    };

    for (const line of prose) {
        if (line === '') { flush(); continue; }

        if (LIST.test(line)) {
            flush();
            out.push({ text: line, list: true });
            continue;
        }

        current = current === '' ? line : `${current} ${line}`;
    }

    flush();
    return out;
}

/**
 * The file with the code taken out — the comments as they are written, and a
 * single `⋯` wherever code was passed over.
 *
 * One mark per stretch, not one per line. In the editor the mark repeats down
 * the margin because each hidden line still has to hold its place; here
 * nothing is holding a place, so forty of them would be forty pieces of noise
 * standing for one idea: something was here.
 */
export function commentsOf(sections: Section[]): string[] {
    const out: string[] = [];
    for (const section of sections) {
        // The words, not the markers. A `#` at the head of every line is the
        // language talking to its compiler, and this block is the file talking
        // to a person. The editor has to keep the markers because the file is
        // still a file; here there is nothing to compile.
        out.push(...section.prose);
        if (section.code.length > 0) { out.push(SKIPPED); }
    }
    return out;
}

/** What stands where code was passed over. */
export const SKIPPED = '⋯';

/** Every line of code in the file, in order, with the reasoning taken out. */
export function codeOf(sections: Section[]): string[] {
    const out: string[] = [];
    for (const section of sections) {
        if (section.code.length === 0) { continue; }
        if (out.length > 0) { out.push(''); }
        out.push(...section.code);
    }
    return out;
}

function fold(summary: string, lines: string[], fence: string): string {
    return [
        '<details>',
        `<summary>${summary}</summary>`,
        '',
        '```' + fence,
        lines.join('\n'),
        '```',
        '',
        '</details>',
        '',
    ].join('\n');
}

/**
 * Walks the file gathering "a run of comments, then the code it introduced".
 * A new run of comments starts a new section.
 */
export function sectionsOf(input: NotesInput): Section[] {
    const sections: Section[] = [];
    let current: Section | null = null;
    let lastWasCode = false;
    /** A blank line has ended a run of comments, so the next one starts fresh. */
    let runBroken = false;

    for (let i = 0; i < input.scanned.length; i++) {
        const { kind } = input.scanned[i];
        const text = input.lineTexts[i];

        if (kind.kind === 'blank') {
            if (current && current.code.length > 0) { current.code.push(''); }
            else if (current) { runBroken = true; }
            continue;
        }

        if (kind.kind === 'comment') {
            // Same rule as countWhys, so the number in the status bar and the
            // number of sections here can never disagree.
            if (!current || lastWasCode || runBroken) {
                current = { prose: [], code: [], line: i };
                sections.push(current);
            }
            // Empty ones are kept, not dropped. A bare `#` between two runs of
            // comment is the writer's own paragraph break, and throwing it away
            // welds two thoughts into one.
            current.prose.push(input.toProse(text));
            lastWasCode = false;
            runBroken = false;
            continue;
        }

        runBroken = false;

        // 'code' or 'mixed' — a trailing comment is kept with its own line,
        // since separating it from the statement would lose the point.
        if (!current) {
            current = { prose: [], code: [], line: i };
            sections.push(current);
        }
        current.code.push(text);
        lastWasCode = true;
    }

    // Sections that never got any prose are just code with no explanation.
    // They belong to the file, not to the notes.
    return sections
        .filter(s => s.prose.some(line => line !== ''))
        .map(s => ({
            prose: trimBlankEnds(s.prose),
            code: trimTrailingBlanks(s.code),
            line: s.line,
        }));
}

function trimBlankEnds(lines: string[]): string[] {
    const out = [...lines];
    while (out.length > 0 && out[0] === '') { out.shift(); }
    while (out.length > 0 && out[out.length - 1] === '') { out.pop(); }
    return out;
}

function trimTrailingBlanks(lines: string[]): string[] {
    const out = [...lines];
    while (out.length > 0 && out[out.length - 1].trim() === '') { out.pop(); }
    return out;
}

/** Language tag for the markdown fence. */
function fenceFor(languageId: string): string {
    const special: Record<string, string> = {
        javascriptreact: 'jsx',
        typescriptreact: 'tsx',
        shellscript: 'bash',
        objectivec: 'objc',
        csharp: 'csharp',
        plaintext: '',
    };
    return special[languageId] ?? languageId;
}
