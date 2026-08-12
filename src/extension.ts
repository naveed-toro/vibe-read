// ---------------------------------------------------------------------------
// Vibe Read — Read My AI
//
// One idea, one key. Hide the code so the AI's own comments are all that is
// left on screen. Read the reasoning, then give a sharper instruction.
//
// The old extension had four modes and eight commands. Nobody wants to learn
// eight commands. Everything below exists to keep it down to: Alt+X, Alt+M,
// Ctrl+C, and a click.
// ---------------------------------------------------------------------------

import * as vscode from 'vscode';
import type { CommentSyntax, ScannedLine } from './comments';
import { countWhys, scanLines, syntaxFor, toProse } from './comments';
import { buildNotes } from './notes';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface DocState {
    /** Alt+X with no selection turns this on for the whole file. */
    wholeFile: boolean;
    /**
     * Lines that disagree with `wholeFile`. true = hidden, false = showing.
     * A selection-toggle or a click writes in here.
     */
    overrides: Map<number, boolean>;
}

const states = new Map<string, DocState>();

function stateFor(doc: vscode.TextDocument): DocState {
    const key = doc.uri.toString();
    let s = states.get(key);
    if (!s) {
        s = { wholeFile: false, overrides: new Map() };
        states.set(key, s);
    }
    return s;
}

/** Is anything at all hidden right now? Drives the status bar and Ctrl+C. */
function isEngaged(s: DocState): boolean {
    if (s.wholeFile) { return true; }
    for (const hidden of s.overrides.values()) { if (hidden) { return true; } }
    return false;
}

function isLineHidden(line: number, s: DocState): boolean {
    const override = s.overrides.get(line);
    return override === undefined ? s.wholeFile : override;
}

// ---------------------------------------------------------------------------
// Reading the document
// ---------------------------------------------------------------------------

/** One pass over the file. The scanner itself lives in comments.ts. */
function scan(doc: vscode.TextDocument, syntax: CommentSyntax): ScannedLine[] {
    return scanLines(textOf(doc), syntax);
}

function textOf(doc: vscode.TextDocument): string[] {
    const texts: string[] = [];
    for (let i = 0; i < doc.lineCount; i++) { texts.push(doc.lineAt(i).text); }
    return texts;
}

/** Only code can be hidden. Comments are the whole point, blanks keep the shape. */
function isHideable(l: ScannedLine): boolean {
    return l.kind.kind === 'code' || l.kind.kind === 'mixed';
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

let decoration: vscode.TextEditorDecorationType | undefined;
let currentIcon = '';

/**
 * Set while someone is choosing a mark, so the editor behind the list shows
 * what they are pointing at before they commit to it.
 */
let previewMark: string | undefined;

function activeMark(): string {
    if (previewMark) { return previewMark; }
    return vscode.workspace.getConfiguration('vibeRead').get<string>('mark') || DEFAULT_MARK;
}

/**
 * Every place a mark is drawn — the editor, the status bar, the list — is
 * HTML underneath, and HTML throws away all but one of a run of spaces. So
 * somebody who spaces their emoji out on purpose gets 🤫🤫 🤫 back however
 * many spaces they put in, and it looks like the extension ate them.
 *
 * A no-break space is not collapsed, and is otherwise an ordinary space. Only
 * what is drawn is changed; what is saved stays the plain spaces they typed,
 * so the setting is readable and the count is honest.
 *
 * Only runs of two or more are swapped. A single space survives HTML on its
 * own, and leaving it a real one means typing a space still matches the row
 * when you filter the list — 🙈 hidden should stay findable by typing it.
 */
function asDrawn(mark: string): string {
    return mark.replace(/ {2,}/g, run => ' '.repeat(run.length));
}

function decorationType(): vscode.TextEditorDecorationType {
    const icon = asDrawn(activeMark());

    if (decoration && icon === currentIcon) { return decoration; }

    decoration?.dispose();
    currentIcon = icon;
    decoration = vscode.window.createTextEditorDecorationType({
        // Hiding the real text and putting the icon in its place.
        textDecoration: 'none; display: none;',
        before: {
            contentText: icon,
            color: new vscode.ThemeColor('editorCodeLens.foreground'),
            margin: '0 0 0 0',
        },
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
    return decoration;
}

function redraw(editor: vscode.TextEditor | undefined): void {
    if (!editor) { return; }

    const doc = editor.document;
    const s = stateFor(doc);

    // Nothing asked for means nothing to draw. Worth checking first: this runs
    // on every keystroke, and scanning a large file each time would be felt.
    if (!isEngaged(s)) {
        editor.setDecorations(decorationType(), []);
        updateStatusBar(editor, 0, 0);
        vscode.commands.executeCommand('setContext', 'vibeRead.active', false);
        return;
    }

    const lines = scan(doc, syntaxFor(doc.languageId));
    const ranges: vscode.Range[] = [];

    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (!isHideable(l) || !isLineHidden(i, s)) { continue; }

        // For a mixed line we hide only the code and leave the comment showing.
        const end = l.kind.kind === 'mixed' ? l.kind.commentAt : doc.lineAt(i).text.length;

        if (end > l.codeStart) {
            ranges.push(new vscode.Range(i, l.codeStart, i, end));
        }
    }

    editor.setDecorations(decorationType(), ranges);
    updateStatusBar(editor, countWhys(lines), ranges.length);

    // "On" means something is covered up at this moment — not that a flag is
    // set somewhere. If every line has been asked back, nothing is hidden, so
    // Ctrl+C has no reason to behave any differently from VS Code's own.
    vscode.commands.executeCommand('setContext', 'vibeRead.active', ranges.length > 0);
}

// ---------------------------------------------------------------------------
// Status bar — visible from the moment the extension loads.
//
// The old extension hid this in normal mode. So after installing it, a new
// user saw absolutely nothing and had no idea anything had happened. That is
// almost certainly why it never went anywhere.
// ---------------------------------------------------------------------------

/**
 * Two items, and they sit together because they share a priority.
 *
 * They were 100 and 99, and Go Live walked between them. I concluded from that
 * that adjacency was impossible and merged them into one — which was wrong,
 * and cost more than it saved. VS Code sorts the bar by priority, so anybody
 * at 99.5 fits between 100 and 99, but nobody at all fits between two items
 * holding the same number: equal priorities form one block. Only another
 * extension choosing exactly this number could get in.
 *
 * Merging was worse than the drift it fixed. The state is the main thing here
 * — that the code is hidden and there are eight explanations to read — and its
 * click had to become "choose an emoji", which is the smaller thing wearing
 * the bigger thing's clothes.
 */
const TOGETHER = 99;

/**
 * On, or off — and when on, how much there is to read.
 *
 * Every earlier version of this line counted the hidden code. That was exactly
 * backwards: nobody is reading the code, that is the whole point. So no wording
 * could ever be made to sound right, because the number itself was the wrong
 * number. It counts the whys now — the things the file explains.
 *
 * There is a second use for it, which may matter more than knowing where you
 * are. A low number means the AI barely explained itself, and that is worth
 * seeing, because the answer to it is to ask for better comments next time.
 *
 * The mark is not drawn here. It sits in the item next door, and one thing
 * shown twice in one bar reads as two things.
 */
let statusBar: vscode.StatusBarItem;

/**
 * The mark, and a word for what it is.
 *
 * Two pictures were tried and both left it half-said. A pencil is the
 * metaphor for editing text — the language of forms — and nothing is being
 * edited here; a list is being chosen from. A chevron is not a metaphor at
 * all: it says a list opens, and never says a list of what.
 *
 * Neither could, because a picture cannot name a noun, and "this changes the
 * mark" is a sentence with a noun in it. A third picture would have failed the
 * same way. VS Code's own guidance says as much — short text labels, icons
 * only where the metaphor is clear, and never a second icon beside the first.
 *
 * So: "Mark: ⋯". It is the shape the status bar already uses for a value you
 * can change — Spaces: 4, Ln 9, Col 12 — and everybody presses those without
 * being told to. And it teaches itself: the ⋯ down the file and the ⋯ in the
 * bar are the same character, so the pairing says what the word means without
 * anyone explaining it.
 *
 * No chevron with it. The colon already says a value lives here; saying it
 * twice is the same hedging that made the first two attempts feel unfinished.
 */
let markBar: vscode.StatusBarItem;

function updateStatusBar(editor: vscode.TextEditor | undefined, whys: number, hidden: number): void {
    if (!editor) { statusBar.hide(); markBar.hide(); return; }

    // Both tooltips end the same way, one word apart — hide only those, show
    // only those. Nowhere does either of them use the word toggle; reading the
    // pair a minute apart teaches it better than the word would.
    //
    // And both name the key. They used to read "Select some lines to hide only
    // those", which leaves out the half that does the work: a selection on its
    // own does nothing at all until Alt+X is pressed. Somebody who selects and
    // waits is left thinking it is broken — and an earlier version really did
    // act on the selection by itself, so the wording is a leftover from a
    // behaviour that no longer exists. The teaching tip had it right all
    // along: select a few lines AND press Alt+X. These now say the same.
    if (hidden === 0) {
        // Nothing is covered up, whatever the flags happen to say.
        //
        // No icon here, and that is the point. Nothing is being claimed while
        // the code is on screen — this is only the name of the thing waiting
        // to be used, and VS Code's own guidance is to use an icon only where
        // one is needed.
        statusBar.text = 'Vibe Read';
        statusBar.tooltip = new vscode.MarkdownString(
            '**Vibe Read**\n\n' +
            // A blank line, not a line break: the key is one thing and the
            // advice underneath it is another, and they were reading as one.
            '`Alt+X` hide the code, read the reasoning\n\n' +
            'Select some lines and press `Alt+X` to hide only those.'
        );
    } else {
        // The eye opens here, and it took being told to see why.
        //
        // It used to be the other way round — an open eye while the code was
        // showing, a shut one while reading — because I had the eye watching
        // the code. That is the exact inverse of what this extension believes.
        // While the code is on screen nobody is reading the reasoning; it is
        // only once the code goes that anybody actually sees anything. So the
        // eye watches the reader, not the code, and it opens at the moment
        // reading starts.
        statusBar.text = whys > 0
            ? `$(eye) Reading ${whys} why${whys === 1 ? '' : 's'}`
            : '$(eye) Reading';
        statusBar.tooltip = new vscode.MarkdownString(
            "**The code is hidden. You're reading the why.**\n\n" +
            '`Alt+X` show the code back  \n' +
            '`Alt+M` keep it as notes  \n' +
            '`Ctrl+C` copy only what you see\n\n' +
            'Select some lines and press `Alt+X` to show only those.'
        );
    }

    // Shown in this order on purpose. Among items sharing a priority the one
    // revealed first sits furthest left, so the state reads first and the mark
    // sits beside it — which is the order they are thought about in.
    statusBar.show();

    markBar.text = `Mark: ${currentIcon || DEFAULT_MARK}`;
    markBar.tooltip = new vscode.MarkdownString(
        '**What stands in for hidden code**\n\n' +
        'Click to change it. Emoji, text, or both.'
    );
    markBar.show();
}

// ---------------------------------------------------------------------------
// Teaching, without becoming a nag
//
// Two things are worth saying out loud, and nowhere on screen says them:
//
//   That Alt+X is a toggle. Someone presses it, their whole file vanishes, and
//   if they do not know how to undo that they will assume it broke something.
//   Panic first — everything else can wait.
//
//   That a selection narrows it. There is no way to discover this by looking.
//
// Shown once and it gets ignored; shown every time and it becomes an
// irritation. So it is shown until the person has actually learned it — which
// is something we can see rather than guess, because using Alt+X on a
// selection *is* the skill — or five times, whichever comes first. The limit
// matters: plenty of people will never want that move, and they should not be
// told about it forever.
//
// One reminder much later, for anyone who learned it and then stopped. Then
// silence, permanently.
//
// It is two messages, not a system, and it must stay that way. Alt+M and
// Ctrl+C will look like they deserve the same treatment. They do not.
// ---------------------------------------------------------------------------

interface Learning {
    /** How many times the whole file has been hidden. */
    hides: number;
    /** Has Alt+X ever been used on a selection? */
    usedSelection: boolean;
}

const LEARNING_KEY = 'vibeRead.learning';
const TIP_LIMIT = 5;
/** Hides after which someone who learned it and stopped gets one reminder. */
const REMIND_AT = 60;

let learningStore: vscode.Memento;

function learning(): Learning {
    return learningStore.get<Learning>(LEARNING_KEY) ?? { hides: 0, usedSelection: false };
}

/** Called when Alt+X hides the whole file. */
function noteWholeFileHide(): void {
    const state = learning();

    if (state.hides === 0) {
        say('Press Alt+X again to bring the code back.');
    } else if (!state.usedSelection && state.hides <= TIP_LIMIT) {
        say('Tip: select a few lines and press Alt+X to see just their code.');
    } else if (state.usedSelection && state.hides === REMIND_AT) {
        say('Remember: select a few lines and press Alt+X to see just their code.');
    }

    learningStore.update(LEARNING_KEY, { ...state, hides: state.hides + 1 });
}

/** Called when Alt+X is used on a selection — the moment the skill is learned. */
function noteSelectionUsed(): void {
    const state = learning();
    if (state.usedSelection) { return; }
    learningStore.update(LEARNING_KEY, { ...state, usedSelection: true });
    markLearned();
}

/**
 * The walkthrough's third step ticks itself off this.
 *
 * Deliberately the same signal that silences the tip. One fact about the
 * person, read in two places — so the walkthrough and the tip can never
 * disagree about whether they know this, and whichever one they happen to
 * meet first covers for the other.
 */
function markLearned(): void {
    vscode.commands.executeCommand('setContext', 'vibeRead.learnedSelection', true);
}

/**
 * A few seconds in the status bar. Not a popup — those have to be dismissed.
 *
 * Always 🙈, never the chosen mark. The two are different things: the mark is
 * what stands in for hidden code in this file, and 🙈 is who is talking. Every
 * other message here already signs itself 🙈, and so do the welcome, the
 * walkthrough and the notes — this one was the odd one out.
 *
 * It is also where the monkey belongs now. As a mark it was noise, because it
 * repeated forty times down a page. As a signature it is paid once, six times
 * in a lifetime, and it is the whole personality of the thing.
 */
function say(message: string): void {
    vscode.window.setStatusBarMessage(`🙈  ${message}`, 6000);
}

// ---------------------------------------------------------------------------
// Alt+X — the only key that matters
// ---------------------------------------------------------------------------

function toggle(editor: vscode.TextEditor): void {
    const doc = editor.document;
    const s = stateFor(doc);
    const lines = scan(doc, syntaxFor(doc.languageId));

    const selections = editor.selections.filter(sel => !sel.isEmpty);

    if (selections.length === 0) {
        // No selection: the whole file, and forget every peek.
        const turningOn = !s.wholeFile;

        if (turningOn && !warnIfNothingToRead(lines)) { return; }

        s.wholeFile = turningOn;
        s.overrides.clear();
        if (turningOn) { noteWholeFileHide(); }
    } else {
        // A selection: only those lines. If they are all hidden, show them.
        const targets: number[] = [];
        for (const sel of selections) {
            for (let i = sel.start.line; i <= sel.end.line; i++) {
                if (isHideable(lines[i])) { targets.push(i); }
            }
        }
        if (targets.length === 0) {
            vscode.window.setStatusBarMessage('🙈  Nothing to hide in that selection.', 3000);
            return;
        }

        const allHidden = targets.every(i => isLineHidden(i, s));
        for (const i of targets) { s.overrides.set(i, !allHidden); }
        noteSelectionUsed();
    }

    redraw(editor);
}

/**
 * A file with no comments has nothing to read. Saying so is far kinder than
 * hiding everything and leaving the user staring at a column of monkeys.
 */
function warnIfNothingToRead(lines: ScannedLine[]): boolean {
    const hasComment = lines.some(l => l.kind.kind === 'comment' || l.kind.kind === 'mixed');
    if (hasComment) { return true; }

    vscode.window.showInformationMessage(
        'There are no comments in this file, so there is nothing to read. ' +
        'Ask your AI to explain its reasoning in comments, then press Alt+X.',
        'Hide it anyway'
    ).then(choice => {
        if (choice === 'Hide it anyway') {
            const editor = vscode.window.activeTextEditor;
            if (!editor) { return; }
            const s = stateFor(editor.document);
            s.wholeFile = true;
            s.overrides.clear();
            redraw(editor);
        }
    });
    return false;
}

// ---------------------------------------------------------------------------
// A note on looking at a single hidden line
//
// There is deliberately no separate way to do this. Two were tried:
//
//   A click on the icon. VS Code gives an extension no click event, only "the
//   cursor moved", and the two are not the same thing. Pressing the mouse down
//   to begin a drag-selection puts an empty cursor on the line first, so simply
//   starting to select text uncovered code nobody asked to see. Worse, clicking
//   a line the cursor already sits on moves nothing and raises no event at all,
//   so a revealed line could never be put back.
//
//   A hover on the icon. This works, until GitLens is installed — and GitLens
//   is installed nearly everywhere. VS Code stacks every hover into one widget,
//   so the blame card arrives first and the code is buried underneath it. A
//   feature that most people will never see is not a feature.
//
// So Alt+X is the only answer, and it is enough: select the lines you want and
// press it. The same key, narrowed to what you picked.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Ctrl+C — copies what you can see, nothing more
//
// This keybinding only exists while something is hidden. The rest of the time
// VS Code's own copy runs, untouched. Changing the editor's default behaviour
// permanently would be unforgivable.
// ---------------------------------------------------------------------------

async function smartCopy(editor: vscode.TextEditor): Promise<void> {
    const doc = editor.document;
    const s = stateFor(doc);
    const lines = scan(doc, syntaxFor(doc.languageId));
    const pieces: string[] = [];

    for (const sel of editor.selections) {
        if (sel.isEmpty) {
            // VS Code copies the whole line, newline included. Match that
            // exactly — the old version dropped the newline, which quietly
            // glued lines together on paste.
            const line = sel.active.line;
            const visible = visibleTextOf(doc, lines[line], line, s);
            pieces.push(visible + '\n');
            continue;
        }

        const chunk: string[] = [];
        for (let i = sel.start.line; i <= sel.end.line; i++) {
            const scanned = lines[i];
            const covered = isOnScreenHidden(scanned, i, s);
            let text = visibleTextOf(doc, scanned, i, s);

            // Respect a partial selection on the first and last line, but only
            // when that line is showing in full.
            if (!covered) {
                if (i === sel.start.line && i === sel.end.line) {
                    text = text.slice(sel.start.character, sel.end.character);
                } else if (i === sel.start.line) {
                    text = text.slice(sel.start.character);
                } else if (i === sel.end.line) {
                    text = text.slice(0, sel.end.character);
                }
            }

            // Drop the line entirely only when the code was all there was on it.
            // A blank line is never hidden, so it must survive — losing those
            // would run the reasoning together into one wall of text.
            const nothingLeft = covered && scanned?.kind.kind === 'code';
            if (!nothingLeft) { chunk.push(text); }
        }
        pieces.push(chunk.join('\n'));
    }

    const result = pieces.join('\n');

    try {
        await vscode.env.clipboard.writeText(result);
        const copied = result.split('\n').length;
        vscode.window.setStatusBarMessage(`🙈  Copied ${copied} visible line${copied === 1 ? '' : 's'}.`, 2500);
    } catch (err) {
        // The old version swallowed this. If the clipboard refuses, the user
        // presses Ctrl+V, gets yesterday's text, and never knows why.
        vscode.window.showErrorMessage(
            `Vibe Read could not write to the clipboard: ${err instanceof Error ? err.message : String(err)}`
        );
    }
}

/** Is any part of this line actually covered up on screen right now? */
function isOnScreenHidden(scanned: ScannedLine | undefined, line: number, s: DocState): boolean {
    return !!scanned && isHideable(scanned) && isLineHidden(line, s);
}

/** What is actually on screen for one line. */
function visibleTextOf(
    doc: vscode.TextDocument,
    scanned: ScannedLine | undefined,
    line: number,
    s: DocState
): string {
    const text = doc.lineAt(line).text;
    if (!scanned || !isHideable(scanned) || !isLineHidden(line, s)) { return text; }

    if (scanned.kind.kind === 'mixed') {
        // The code is gone; the trailing comment stays, with its indentation.
        return text.slice(0, scanned.codeStart) + text.slice(scanned.kind.commentAt);
    }
    return '';
}

// ---------------------------------------------------------------------------
// Alt+M — keep it as notes
// ---------------------------------------------------------------------------

async function saveAsNotes(editor: vscode.TextEditor): Promise<void> {
    const doc = editor.document;
    const syntax = syntaxFor(doc.languageId);
    const lineTexts = textOf(doc);

    const markdown = buildNotes({
        fileName: doc.fileName.split(/[\\/]/).pop() || 'untitled',
        languageId: doc.languageId,
        lineTexts,
        scanned: scanLines(lineTexts, syntax),
        toProse: text => toProse(text, syntax),
        includeFullSource: vscode.workspace
            .getConfiguration('vibeRead')
            .get<boolean>('notesIncludeFullSource', true),
    });

    if (markdown === null) {
        vscode.window.showInformationMessage(
            'There are no comments in this file, so there are no notes to keep. ' +
            'Ask your AI to explain its reasoning in comments first.'
        );
        return;
    }

    // Opened, not written. Nothing lands on disk until the user says so.
    const notes = await vscode.workspace.openTextDocument({
        content: markdown,
        language: 'markdown',
    });
    await vscode.window.showTextDocument(notes, {
        viewColumn: vscode.ViewColumn.Beside,
        preview: false,
    });
}

// ---------------------------------------------------------------------------
// Choosing the mark
//
// The setting was always there and nobody was ever going to find it. Open
// Settings, search the extension, type an emoji — four steps too many for
// something you might change on a whim, and a mark you look at forty times a
// page is exactly the sort of thing you change on a whim.
//
// So the mark sits in the status bar and clicking it opens the slots below.
// They are only a starting point: every one of them has a pencil, and editing
// one replaces it. Ready-made choices, not a cage.
//
// The five that come filled in are chosen to demonstrate the shapes rather
// than to be five variations of the same idea — one emoji, one with a word
// after it, two emoji, and one with no emoji at all. Seeing them is what
// teaches; a sentence explaining that combinations are allowed would be read
// by nobody.
//
// The emoji keyboard behind the pencil belongs to the operating system.
// Shipping two thousand emoji with names and categories, to rebuild a picker
// every machine already has, would be a great deal of weight for a worse
// result.
// ---------------------------------------------------------------------------

/**
 * The quiet one, and it is the default on purpose.
 *
 * The whole promise is that the noise goes and the reasoning is left. An emoji
 * repeated forty times down a page is noise — we would have taken away the
 * code's and handed back our own. With ⋯ the page reads as prose, which is the
 * thing being sold.
 *
 * It is also the honest symbol. An ellipsis has meant "something has been left
 * out here" for as long as there has been typesetting, and that is exactly
 * what happened.
 *
 * 🙈 is the better joke — a monkey with its eyes covered explains the feature
 * without a word — but that is paid once, in the first five seconds, while the
 * noise is paid every day forever. The joke has other places to live: the
 * name, the marketplace page, the walkthrough, the notes. The teaching is
 * covered too, three times over — half the page vanishes, the status bar says
 * how many whys are left, and the welcome message spells it out.
 */
const DEFAULT_MARK = '⋯';

/**
 * Eight, and the number is not arbitrary.
 *
 * A mark is looked at; text is read. While it stays about the size of one
 * short word the eye takes it as a shape — a column running down the left of
 * the file. Past that it starts being read instead, and a thing you read
 * forty times down one page is the noise Alt+X was pressed to be rid of.
 *
 * Everything worth having fits: one emoji, four emoji, three monkeys, an
 * emoji and a word, [hidden], — code —. What it turns away is the loose
 * version of something that already has a tighter one — sleeping becomes zzz,
 * redacted becomes hidden — and the tighter one is the better mark anyway.
 * The limit removes flab, not choices.
 *
 * The longest thing on offer below is exactly eight, so the ceiling can be
 * seen without anybody being told a number.
 */
const MOST_CHARACTERS = 8;

// The default sits first and is therefore in the list — which it was not
// before. 🙈 was the default and was nowhere among these, so anybody who
// changed it once could never find their way back to it.
const FILLED_IN = ['⋯', '🤫', '🙈 hidden', '💤💤', '💻 code', ''];

/**
 * What each of the five says about itself. Only shown while the slot still
 * holds what we put there — once somebody replaces it, our word for it is no
 * longer true, so it goes.
 */
const NOTES = ['best for reading', 'quiet', 'emoji + text', 'sleepy',
    'there is code here', ''];

interface MarkRow extends vscode.QuickPickItem {
    slot: number;
    mark: string;
}

function savedMarks(): string[] {
    const saved = vscode.workspace.getConfiguration('vibeRead').get<string[]>('marks');
    if (!Array.isArray(saved) || saved.length !== FILLED_IN.length) { return [...FILLED_IN]; }
    return saved.map(m => (typeof m === 'string' ? m : ''));
}

async function keep(key: 'mark' | 'marks', value: string | string[]): Promise<void> {
    await vscode.workspace
        .getConfiguration('vibeRead')
        .update(key, value, vscode.ConfigurationTarget.Global);
}

async function pickMark(): Promise<void> {
    const answer = await showTheSlots();
    if (!answer) { return; }

    if (answer.use !== undefined) {
        await keep('mark', answer.use);
        return;
    }

    const slot = answer.edit as number;
    const marks = savedMarks();

    const typed = await askForMark(marks[slot]);
    if (typed === undefined) { return; }

    marks[slot] = typed;
    await keep('marks', marks);
    await keep('mark', typed);
}

function slotRows(): MarkRow[] {
    return savedMarks().map((mark, slot) => {
        if (mark === '') {
            return { label: '$(add) Set your own…', slot, mark };
        }
        return {
            // Drawn, not stored: the list is HTML too, and a row that shows
            // fewer spaces than the mark really has is the list telling a lie
            // about what picking it will do.
            label: asDrawn(mark),
            // Ours, or theirs — and the note only belongs to ours.
            description: mark === FILLED_IN[slot] ? NOTES[slot] : 'yours',
            slot,
            mark,
            buttons: [{
                iconPath: new vscode.ThemeIcon('edit'),
                tooltip: 'Change this one',
            }],
        };
    });
}

/** Resolves what to do: use a mark, edit a slot, or nothing. */
function showTheSlots(): Promise<{ use?: string; edit?: number } | undefined> {
    return new Promise(resolve => {
        const box = vscode.window.createQuickPick<MarkRow>();
        const showing = vscode.workspace
            .getConfiguration('vibeRead').get<string>('mark') || DEFAULT_MARK;

        box.title = 'What stands in for hidden code';
        box.placeholder = 'Pick one, or press the pencil to change it';
        box.buttons = [{
            iconPath: new vscode.ThemeIcon('discard'),
            tooltip: 'Back to the originals',
        }];
        box.items = slotRows();

        const inUse = box.items.find(row => row.mark === showing);
        if (inUse) { box.activeItems = [inUse]; }

        let answered = false;

        // Moving down the list changes the editor behind it, so a mark can be
        // seen on your own file before you commit to it.
        box.onDidChangeActive(rows => {
            previewMark = rows[0]?.mark || undefined;
            redraw(vscode.window.activeTextEditor);
        });

        // The list stays open — you see the originals come back rather than
        // being thrown out and left to wonder whether anything happened.
        box.onDidTriggerButton(async () => {
            await keep('marks', [...FILLED_IN]);
            box.items = slotRows();
        });

        box.onDidTriggerItemButton(event => {
            answered = true;
            box.hide();
            resolve({ edit: event.item.slot });
        });

        box.onDidAccept(() => {
            const row = box.activeItems[0];
            if (!row) { return; }
            answered = true;
            box.hide();
            // An empty slot has nothing to use, so accepting it means fill it.
            resolve(row.mark ? { use: row.mark } : { edit: row.slot });
        });

        box.onDidHide(() => {
            previewMark = undefined;
            redraw(vscode.window.activeTextEditor);
            box.dispose();
            if (!answered) { resolve(undefined); }
        });

        box.show();
    });
}

/**
 * The box where the operating system's emoji keyboard does the real work.
 *
 * There is one line of room under the field, and two things worth saying, so
 * they take turns rather than share. Before a key is pressed there is nothing
 * to count, and the only thing that is not obvious is where the emoji
 * keyboard lives — so the line says that. From the first keystroke it becomes
 * the countdown.
 *
 * `prompt` is not used at all. VS Code appends "(Press 'Enter' to confirm or
 * 'Escape' to cancel)" to it, which turns any hint into a long grey sentence,
 * and a long grey sentence is read by nobody. The validation line is short,
 * coloured, and sits in the same place — and Enter and Escape are not news.
 *
 * What is left of "emoji, text, or both" lives in the placeholder, inside the
 * empty field, where it answers the question at the moment it is asked and
 * disappears the moment it is answered.
 */
function askForMark(current: string): Promise<string | undefined> {
    return new Promise(resolve => {
        const box = vscode.window.createInputBox();
        box.title = 'Your own mark';
        box.value = current;
        box.placeholder = 'Emoji, text, or both';

        const hint = emojiKeyboardHint();
        const theHint = hint ? { message: hint, severity: Fine } : undefined;
        box.validationMessage = theHint;

        let answered = false;

        box.onDidChangeValue(value => {
            box.validationMessage = lineUnder(value) ?? theHint;
            previewMark = usable(value) ? value.trim() : undefined;
            redraw(vscode.window.activeTextEditor);
        });

        box.onDidAccept(() => {
            const value = box.value.trim();
            if (!usable(value)) { return; }
            answered = true;
            box.hide();
            resolve(value);
        });

        box.onDidHide(() => {
            previewMark = undefined;
            redraw(vscode.window.activeTextEditor);
            box.dispose();
            if (!answered) { resolve(undefined); }
        });

        box.show();
    });
}

/**
 * Every system has an emoji keyboard except, dependably, Linux — where the
 * shortcut belongs to the desktop rather than the system and differs on each
 * one. Naming a shortcut that does nothing is worse than naming none: they
 * press it, nothing happens, and the extension looks broken. So on Linux this
 * says nothing, and the placeholder inside the field carries the whole
 * message on its own.
 *
 * The Mac line uses ⌃ ⌘ rather than the words. Mac users read those symbols
 * faster than they read "Control" and "Command", and this branch only ever
 * runs on a Mac, so there is nothing to render them wrongly.
 */
function emojiKeyboardHint(): string | undefined {
    switch (process.platform) {
        case 'win32': return 'Win + .  opens the emoji keyboard';
        case 'darwin': return '⌃ ⌘ Space  opens the emoji keyboard';
        default: return undefined;
    }
}

const Fine = vscode.InputBoxValidationSeverity.Info;
const Edge = vscode.InputBoxValidationSeverity.Warning;
const Bad = vscode.InputBoxValidationSeverity.Error;

/** A mark you could actually keep: something is there, and it fits. */
function usable(value: string): boolean {
    const text = value.trim();
    return text !== '' && charactersIn(text) <= MOST_CHARACTERS;
}

/**
 * What the line under the box says while somebody is typing.
 *
 * Twitter counted down rather than up, and it was right to: the number you
 * act on is the room you have left, not the room you have spent. It also
 * never took the keyboard away from you — it changed colour and let you go on.
 *
 * Here the countdown earns its place twice over. Eight characters of emoji
 * cannot be counted by eye — 🙈🙉🙊 is three or six depending on how you
 * count, 👨‍👩‍👧‍👦 is one or four — so this is not a convenience, it is the only
 * way to know. And the limit is invisible everywhere else, so this is where
 * it gets said.
 *
 * Three rungs, and only the top one stops you:
 *
 *   room to spare   Info      7 left      blue    enter works
 *   right on eight  Warning   0 left      amber   enter works — eight is allowed
 *   over            Error     too long    red     enter refused
 *
 * The amber is not a complaint. Eight is a perfectly good mark; the colour
 * only says the wall is here.
 *
 * An empty box returns nothing at all, and the caller puts the emoji hint
 * back. Empty is not a mistake — it is where everybody starts, and a red bar
 * telling you off for not having typed yet is an insult with a colour on it.
 * Enter still does nothing, which is the whole of what needed saying.
 */
function lineUnder(value: string): vscode.InputBoxValidationMessage | undefined {
    const text = value.trim();
    if (text === '') { return undefined; }

    const length = charactersIn(text);
    const left = MOST_CHARACTERS - length;

    if (left < 0) {
        return {
            message: `A little shorter — ${MOST_CHARACTERS} at most, and that is ${length}.`,
            severity: Bad,
        };
    }
    return { message: `${left} left`, severity: left === 0 ? Edge : Fine };
}

/**
 * Counts what a person would call characters. A single emoji is often several
 * code units and sometimes several code points joined together, so neither
 * .length nor spreading gives a number anybody would agree with.
 */
function charactersIn(text: string): number {
    const segmenter = (Intl as unknown as {
        Segmenter?: new () => { segment(input: string): Iterable<{ segment: string }> };
    }).Segmenter;

    if (!segmenter) { return [...text].length; }
    return [...new segmenter().segment(text)].length;
}

// ---------------------------------------------------------------------------
// The guided introduction
// ---------------------------------------------------------------------------

const WALKTHROUGH = 'naveed-toro.vibe-read#readMyAI';

/**
 * Its own command, because the built-in "Welcome: Open Walkthrough" hides ours
 * in a list among every other extension's. Typing "walk" in the palette should
 * find it, the way it finds everybody else's.
 */
function openWalkthrough(): void {
    vscode.commands.executeCommand('workbench.action.openWalkthrough', WALKTHROUGH, false);
}

/**
 * The first step's button.
 *
 * A walkthrough panel can only hold pictures and text — no buttons of its own,
 * nothing that runs. So rather than animate what Alt+X does, this hands the
 * reader a real file and lets them press the key themselves. The editor is the
 * demonstration; the panel only has to point at it.
 *
 * Untitled, not a file on disk, so nothing they try can damage anything.
 */
async function openSample(): Promise<void> {
    const doc = await vscode.workspace.openTextDocument({
        language: 'python',
        content: SAMPLE,
    });
    await vscode.window.showTextDocument(doc, { preview: false });
}

const SAMPLE = `# A file to try Vibe Read on. Press Alt+X.


def apply_checkout(cart, tax_rate, coupon=None):
    """Work out what the customer actually pays."""

    # An empty cart has to be caught here. The maths below
    # divides by the item count and would crash on it.
    if not cart:
        return 0.0

    subtotal = sum(item.price for item in cart)

    # Discount before tax, never after. The other order
    # overcharges the customer, and in most places it is
    # also illegal.
    if coupon:
        subtotal *= (1 - coupon.rate)

    # Rounding once, at the very end. Rounding at each step
    # drifts by a few cents on large carts, and the accounts
    # team does notice.
    return round(subtotal * (1 + tax_rate), 2)  # validated above
`;

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext): void {
    learningStore = context.globalState;

    // Context keys do not survive a restart, so this has to be set again for
    // anyone who learned it in an earlier session.
    if (learning().usedSelection) { markLearned(); }

    // The same priority for both, so nothing can come between them. Created in
    // this order, so the state reads first and the mark sits to its right.
    statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, TOGETHER);
    statusBar.command = 'vibeRead.toggle';
    context.subscriptions.push(statusBar);

    markBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, TOGETHER);
    markBar.command = 'vibeRead.pickMark';
    context.subscriptions.push(markBar);

    // A key that quietly does nothing is worse than no key at all — the user
    // decides the extension is broken and never presses it again. So when there
    // is no file to work on, say so.
    const withEditor = (fn: (e: vscode.TextEditor) => void | Promise<void>) => () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) { return fn(editor); }
        vscode.window.setStatusBarMessage('🙈  Open a file first, then press Alt+X.', 4000);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('vibeRead.toggle', withEditor(toggle)),
        vscode.commands.registerCommand('vibeRead.saveAsNotes', withEditor(saveAsNotes)),
        vscode.commands.registerCommand('vibeRead.smartCopy', withEditor(smartCopy)),
        vscode.commands.registerCommand('vibeRead.pickMark', pickMark),
        vscode.commands.registerCommand('vibeRead.openWalkthrough', openWalkthrough),
        vscode.commands.registerCommand('vibeRead.openSample', openSample),

        vscode.window.onDidChangeActiveTextEditor(redraw),

        vscode.workspace.onDidChangeTextDocument(e => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || e.document !== editor.document) { return; }

            // Peeks are remembered by line number. Once an edit adds or removes
            // lines those numbers point at the wrong places, so they are dropped
            // rather than left to show the wrong thing.
            const s = stateFor(e.document);
            if (s.overrides.size > 0 && e.contentChanges.some(c => c.text.includes('\n') || !c.range.isSingleLine)) {
                s.overrides.clear();
            }

            redraw(editor);
        }),

        vscode.workspace.onDidCloseTextDocument(doc => states.delete(doc.uri.toString())),

        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('vibeRead.mark')) {
                redraw(vscode.window.activeTextEditor);
            }
        })
    );

    showWelcomeOnce(context);
    redraw(vscode.window.activeTextEditor);
}

/**
 * The first thing anyone ever sees from this extension.
 *
 * It used to be nothing but keys, which made the whole thing look like a
 * shortcut utility. Four short statements now: what happens, why it matters,
 * the key, and — the one that prevents panic — how to undo it.
 *
 * Nothing here asks the reader to work anything out. A sentence they have to
 * finish in their own head is a sentence they skip.
 */
function showWelcomeOnce(context: vscode.ExtensionContext): void {
    if (context.globalState.get<boolean>('vibeRead.welcomed')) { return; }
    context.globalState.update('vibeRead.welcomed', true);

    vscode.window.showInformationMessage(
        '🙈 AI writes the code. Its comments explain the why. Alt+X hides the code ' +
        'and leaves the why — press it again to bring the code back.',
        'Show me how'
    ).then(choice => {
        // The walkthrough, not the keyboard shortcuts list. Someone who has
        // just been told what this is for wants to see it work, not read a
        // table of key bindings.
        if (choice === 'Show me how') { openWalkthrough(); }
    });
}

export function deactivate(): void {
    decoration?.dispose();
    states.clear();
}
