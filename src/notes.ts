// ---------------------------------------------------------------------------
// Turning a file into notes.
//
// The shape is deliberate: the AI's reasoning is the document, and the code
// sits underneath it, folded away. Exactly the wrong way round from a source
// file, which is the whole idea.
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
    includeFullSource: boolean;
}

export interface Section {
    /** The reasoning, already stripped of comment markers. */
    prose: string[];
    /** The code it was explaining. */
    code: string[];
    /**
     * The line in the source file where this note begins.
     *
     * This is what ties the two panes together: scrolling the file finds the
     * last note whose line has gone past, and scrolling the notes reveals the
     * line they came from. Without it the reading pane is a separate document
     * that merely happens to sit alongside.
     */
    line: number;
}

/** Returns null when the file has no comments — there is nothing worth keeping. */
export function buildNotes(input: NotesInput): string | null {
    const sections = sectionsOf(input);
    if (sections.length === 0) { return null; }

    const fence = fenceFor(input.languageId);
    const today = new Date().toISOString().slice(0, 10);
    const out: string[] = [];

    out.push(`# ${input.fileName}`);
    out.push('');
    out.push(`> Read with ◎ ◎ **Vibe Read** · ${today} · ${sections.length} note${sections.length === 1 ? '' : 's'}`);
    out.push('');
    out.push('---');
    out.push('');

    sections.forEach((section, index) => {
        const [heading, ...rest] = section.prose;

        out.push(`### ${index + 1}. ${heading}`);
        out.push('');

        if (rest.length > 0) {
            out.push(rest.join('\n'));
            out.push('');
        }

        if (section.code.length > 0) {
            out.push('<details>');
            // No mark here. The triangle beside it already says this opens,
            // and a face repeated down the page is the noise the extension
            // exists to remove. The count is worth saying instead: it cannot
            // be seen while the fold is shut, and it decides whether opening
            // is worth it. The reading pane says exactly the same thing.
            out.push(`<summary>code · ${section.code.length} line${section.code.length === 1 ? '' : 's'}</summary>`);
            out.push('');
            out.push('```' + fence);
            out.push(trimIndent(section.code).join('\n'));
            out.push('```');
            out.push('');
            out.push('</details>');
            out.push('');
        }
    });

    if (input.includeFullSource) {
        out.push('---');
        out.push('');
        out.push('<details>');
        out.push(`<summary>the whole file · ${input.lineTexts.length} lines</summary>`);
        out.push('');
        out.push('```' + fence);
        out.push(input.lineTexts.join('\n'));
        out.push('```');
        out.push('');
        out.push('</details>');
        out.push('');
    }

    return out.join('\n');
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

/** Pulls a code block back to the left margin so it reads well on its own. */
function trimIndent(lines: string[]): string[] {
    const indents = lines
        .filter(l => l.trim() !== '')
        .map(l => l.length - l.trimStart().length);

    const smallest = indents.length > 0 ? Math.min(...indents) : 0;
    return smallest === 0 ? lines : lines.map(l => l.slice(smallest));
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
