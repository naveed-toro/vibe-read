// ---------------------------------------------------------------------------
// Turning a file into something to read.
//
// Three pieces, not a hundred. The reasoning, whole and unbroken; then the
// code; then the file as it stands. Everything the extension promised is in
// the first of those, and the other two are there so that nothing has been
// taken away.
//
// It was a hundred pieces for a while — every run of comments a numbered
// heading with its own fold underneath. On the file it was built against that
// looked tidy. On a real one it made thirty-eight headings, several of them a
// row of equals signs, and the page became the very thing this extension
// exists to remove. Fragments are noise, whoever wrote them.
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
    const out: string[] = [];

    out.push(`# ${input.fileName}`);
    out.push('');
    out.push(`> Read with ◎ ◎ **Vibe Read** · ${today} · ${whys} why${whys === 1 ? '' : 's'}`);
    out.push('');
    out.push('---');
    out.push('');

    for (const paragraph of reasoning(sections)) {
        out.push(paragraph);
        out.push('');
    }

    out.push('---');
    out.push('');
    out.push(fold(`the code · ${codeOf(sections).length} lines`, codeOf(sections), fence));
    out.push(fold(`the whole file · ${input.lineTexts.length} lines`, input.lineTexts, fence));

    return out.join('\n');
}

/**
 * The reasoning, in the order it was written, with the code taken out.
 *
 * Where code was passed over, a `⋯` stands in its place — the same mark that
 * stands in for it in the editor. It is not decoration: without it the page
 * reads as one unbroken argument, and the pauses in the file's thinking are
 * exactly where a reader needs to breathe.
 */
export function reasoning(sections: Section[]): string[] {
    const out: string[] = [];

    for (const section of sections) {
        out.push(section.prose.join(' '));
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
            const prose = input.toProse(text);
            if (prose !== '') { current.prose.push(prose); }
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
        .filter(s => s.prose.length > 0)
        .map(s => ({ prose: s.prose, code: trimTrailingBlanks(s.code), line: s.line }));
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
