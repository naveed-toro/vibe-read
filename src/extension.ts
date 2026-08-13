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
import { buildNotes, sectionsOf } from './notes';
import { showReader } from './reader';

/** Where the extension lives on disk. The reader needs it for its font. */
let extensionUri: vscode.Uri;

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

/**
 * Did an edit reach any line that is currently covered?
 *
 * The whole range counts, not just where the cursor was. Deleting a selection
 * that starts on a visible comment and ends four hidden lines below arrives as
 * one change spanning all five, and the four are exactly what nobody saw go.
 */
function touchesHidden(range: vscode.Range, s: DocState, lines: ScannedLine[]): boolean {
    for (let line = range.start.line; line <= range.end.line; line++) {
        // Off the end of the file: the edit removed lines that were there when
        // it began, which is the very case this exists to catch.
        if (!lines[line]) { return true; }

        // A comment is never covered, whatever the state says. Somebody fixing
        // a typo in the reasoning is reading, not writing over anything.
        if (isHideable(lines[line]) && isLineHidden(line, s)) { return true; }
    }
    return false;
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
 * The vibe, and a word for what it is.
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
 * So a word, with the vibe in front of it — the shape every other item down
 * there already has. Python, Sign In, Go Live, Prettier: the picture first,
 * the name after. "Vibe: ⋯" put the value last and trailing, which is the one
 * arrangement the corner never uses.
 *
 * It also puts the thing worth seeing where the eye lands first, and leaves
 * the word holding the right-hand side, so there is always something solid to
 * aim at however faint the vibe happens to be.
 *
 * And it teaches itself: the ⋯ down the file and the ⋯ in the bar are the same
 * character, so the pairing says what the word means with nobody explaining
 * it.
 *
 * The word is "Vibe", not "Mark". Mark was accurate and dead. It read as
 * Spaces: 4 reads — a value being reported — and a thing that looks like a
 * setting is a thing nobody touches. This one has to be touched or the whole
 * feature never happens.
 *
 * Vibe is the word this was built out of. Stickers on a laptop, charms in a
 * shoe, four emoji on a profile: none of it does anything, all of it is why
 * people stay attached to their things. Nobody calls that a setting. And it
 * costs nothing in accuracy that matters here — the emoji is the vibe.
 *
 * It shows the vibe, and it has to. I replaced it once with a fixed face,
 * reasoning that ⋯ is chosen precisely because it disappears and so makes a
 * disappearing button. That solved the wrong half. A button you can see but
 * that will not tell you what is set is worse than a faint one that will —
 * the whole point of choosing is seeing what you chose.
 *
 * The word carries the visibility instead. "Vibe:" is there whatever is beside
 * it, so there is always something to aim at; only the value is quiet, and a
 * quiet value is the value working as intended.
 *
 * And a chevron after all, which I argued against twice and was wrong about
 * the second time.
 *
 * The first two attempts put a picture there alone — a pencil, then a chevron
 * — and both failed because a picture cannot name a noun, and "this changes
 * the vibe" is a sentence with a noun in it. I took the right lesson and then
 * over-applied it: having found the word, I decided the picture was the
 * mistake, when the mistake was only ever asking the picture to do the naming.
 *
 * The word says what. The chevron says a list opens. Those are two different
 * jobs and neither one does the other's. Together they are the whole sentence;
 * apart, each is half of it.
 *
 * Colouring it is not on the table, for the record. VS Code allows exactly two
 * backgrounds — errorBackground and warningBackground — so the only way to
 * make this loud is to make it look permanently broken. And the hover trick
 * other extensions get is free but not ours to have here: it works by tinting
 * a single-colour glyph, and an emoji brings its own colours from the system
 * font. Nothing in the API can touch them.
 */
let markBar: vscode.StatusBarItem;

/** Reading. First in the bar, because it is the first thing to do. */
let readBar: vscode.StatusBarItem;

function updateStatusBar(editor: vscode.TextEditor | undefined, whys: number, hidden: number): void {
    if (!editor) { readBar.hide(); statusBar.hide(); markBar.hide(); return; }

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
    // Reading has its own chip now, and it comes first.
    //
    // Everything in this bar used to belong to Alt+X — the state, and a vibe
    // that is a setting of hiding. Alt+M had nothing anywhere, so the design
    // said what it did not mean: that reading is something you do afterwards,
    // once the code is already hidden. It never was; Alt+M has always worked
    // on its own.
    //
    // The room it needed was already there, held by the vibe. A vibe does
    // nothing at all while the code is on screen, and it was sitting in the
    // bar regardless. So it now appears only while something is hidden — which
    // is our own rule, applied to ourselves — and reading takes the place it
    // was keeping warm.
    readBar.text = whys > 0
        ? `$(vibe-read-notes) Read ${whys} why${whys === 1 ? '' : 's'}`
        : '$(vibe-read-notes) Read';
    readBar.tooltip = new vscode.MarkdownString(
        '**Read the reasoning**\n\n' +
        '`Alt+M` the why beside the code, scrolling together'
    );
    readBar.text += '\u00a0\u00a0|';
    readBar.show();

    if (hidden === 0) {
        // Nothing is covered up, whatever the flags happen to say.
        //
        // Our own face, and it had to be ours. 🙈 was borrowed — half the
        // marketplace has it — and worse, it sat one item away from a vibe
        // that is very often an emoji too, so the two ran together into one
        // row of little pictures with no way to tell which was the extension
        // and which was the choice.
        //
        // The monkey was also saying the wrong thing. Hands over the eyes
        // reads as refusing to look, and nobody here is refusing anything.
        // What is true of this state is duller and more useful: the code and
        // the reasoning are still mixed together, and none of it has been read
        // yet. So the eyes are open here and simply not focused on anything.
        //
        // They were three dots for a day, which was an ellipsis stuck on a
        // square rather than a face — three of anything is not a pair of eyes,
        // so the two states read as two different objects instead of one thing
        // with two expressions. Two eyes in both, and only the expression
        // changes, which is the whole of how a face works.
        statusBar.text = '$(vibe-read-resting) Hide';
        statusBar.tooltip = new vscode.MarkdownString(
            '**Hide the code**\n\n' +
            // A blank line, not a line break: the key is one thing and the
            // advice underneath it is another, and they were reading as one.
            '`Alt+X` hide the code, read the reasoning\n\n' +
            'Select some lines and press `Alt+X` to hide only those.'
        );
    } else {
        // The same face, with its eyes open.
        //
        // One character in two states is read instantly, because that is how a
        // face works. The dots become eyes; nothing else about it moves, and
        // nothing needs explaining.
        //
        // The direction matters and I had it backwards once. An open eye used
        // to sit on the resting state, because I had the eye watching the
        // code. This extension believes the opposite: while the code is on
        // screen nobody is reading the reasoning, and it is only once the code
        // goes that anybody sees anything. The eyes belong to the reader.
        statusBar.text = whys > 0
            ? `$(vibe-read-reading) Reading ${whys} why${whys === 1 ? '' : 's'}`
            : '$(vibe-read-reading) Reading';
        statusBar.tooltip = new vscode.MarkdownString(
            "**The code is hidden. You're reading the why.**\n\n" +
            '`Alt+X` show the code back  \n' +
            '`Ctrl+C` copy only what you see\n\n' +
            'Select some lines and press `Alt+X` to show only those.'
        );
    }

    // Shown in this order on purpose. Among items sharing a priority the one
    // revealed first sits furthest left, so the state reads first and the vibe
    // sits beside it — which is the order they are thought about in.
    //
    // The bar between them is here because side by side they read as one
    // sentence. VS Code separates its own — Spaces: 4, UTF-8, LF — with a gap
    // and nothing else, and that works because nobody expects UTF-8 and LF to
    // be related. Ours are related, which is exactly why they need telling
    // apart. It hangs off this item rather than the next one so that the vibe,
    // the one meant to be pressed, stays clean.
    // No-break spaces: plain ones would collapse to a single space here for
    // the same reason they collapse in a vibe, and the bar would end up
    // hugging the words instead of standing between the two items.
    // The bar only when there is something on its right.
    if (hidden > 0) { statusBar.text += '\u00a0\u00a0|'; }
    statusBar.show();

    // Nothing is hidden, so there is nothing for a vibe to stand in for. A
    // control that cannot do anything should not be occupying the bar.
    if (hidden === 0) { markBar.hide(); return; }

    // activeMark, not currentIcon: currentIcon holds the drawn form, whose
    // spaces have been swapped for no-break ones, and that will not match
    // anything in the saved list. The name has to be looked up by what was
    // actually saved.
    const vibe = activeMark();
    markBar.text = `${asDrawn(vibe)} ${nameFor(vibe)} $(chevron-down)`;
    markBar.tooltip = new vscode.MarkdownString(
        // Two words and what to do with them. It opened with "What stands in
        // for hidden code" — an idiom on an abstraction — and I replaced that
        // with a plainer version of the same sentence, which was still a
        // sentence explaining a thing that is already on screen. Anybody
        // hovering this can see their vibe down the whole file behind it.
        // Hovering and clicking now say the same two words.
        '**Your vibe**\n\n' +
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

async function read(editor: vscode.TextEditor): Promise<void> {
    const doc = editor.document;
    const syntax = syntaxFor(doc.languageId);
    const lineTexts = textOf(doc);

    const input = {
        fileName: doc.fileName.split(/[\\/]/).pop() || 'untitled',
        languageId: doc.languageId,
        lineTexts,
        scanned: scanLines(lineTexts, syntax),
        toProse: (text: string) => toProse(text, syntax),
    };

    const markdown = buildNotes(input);

    if (markdown === null) {
        vscode.window.showInformationMessage(
            'There are no comments in this file, so there are no notes to keep. ' +
            'Ask your AI to explain its reasoning in comments first.'
        );
        return;
    }

    // Its own tab, the width of the window. The markdown is built either way,
    // but it is only handed over when the reader asks for it — reading is the
    // common case, keeping is not.
    showReader(extensionUri, {
        fileName: input.fileName,
        languageId: doc.languageId,
        lineTexts,
        sections: sectionsOf(input),
        source: doc.uri,
        onSave: () => { void keepAsMarkdown(markdown); },
    });
}

/**
 * Opened, not written. Nothing lands on disk until the user says so.
 *
 * And opened rendered, not as markdown source. Somebody who has just spent
 * five minutes reading a page does not want the next thing they see to be
 * angle brackets and backticks — that is the syntax this extension exists to
 * take away, handed back at the last moment. The source is a click behind the
 * preview's own Show Source button for anybody who wants to edit it.
 */
async function keepAsMarkdown(markdown: string): Promise<void> {
    const notes = await vscode.workspace.openTextDocument({
        content: markdown,
        language: 'markdown',
    });

    try {
        await vscode.commands.executeCommand('markdown.showPreviewToSide', notes.uri);
    } catch {
        // The built-in markdown extension can be turned off. Plain notes beat
        // no notes.
        await vscode.window.showTextDocument(notes, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: false,
        });
    }
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
const FILLED_IN = ['⋯', '🤫', '🙈 🙉 🙊', '🌚', '💻', '🦆 ☕'];

/**
 * A name for each slot, and it is not decoration — this is the word that goes
 * up in the status bar beside whatever the slot holds. Pick Shh and the corner
 * reads "🤫 Shh"; pick Hide and it reads "🙈 🙉 🙊 Hide".
 *
 * They are moods rather than descriptions, and they belong to the slot rather
 * than to the character in it. Put something else in the Mute slot and it is
 * still your mute — the name says what the slot is for, and the character says
 * what you felt like using for it. Anything set in the last slot is just
 * yours, so it goes up as Vibe.
 *
 * The last one is Yours rather than Vibe, because Vibe is now a slot of its
 * own and two things cannot share a name. Anything not in the list at all —
 * typed straight into the setting, say — goes up as Yours too, which is true
 * of it.
 *
 * That slot used to be empty, offering "Set your own…", and an empty slot is a
 * blank canvas — which is the surest way to make somebody close a list without
 * touching anything. It holds a duck and a coffee now.
 *
 * The duck is not a random pick. Explaining your reasoning out loud to a
 * rubber duck is the oldest joke in the trade and the closest thing it has to
 * this extension's whole argument: you understand a thing at the moment you
 * hear yourself explain it. The coffee beside it is there to say that this is
 * somebody's taste rather than a rule — two things that do not belong together
 * read as a choice, and a choice invites another one.
 *
 * Losing the "Set your own…" row costs nothing that was not already covered.
 * The line above the list has always said "Pick one, or press the pencil to
 * change it", and now every row behaves the same way: Enter uses it, the
 * pencil changes it. The odd one out was the old empty row.
 *
 * The three monkeys are spaced rather than set solid. Emoji have almost no
 * side bearing, so 🙈🙉🙊 run into one dark blob at editor size, which is the
 * opposite of what a thing meant to be recognised at a glance should do. A dot
 * between them was the other option and it separates something that the gap
 * has already separated, so it only adds a mark that means nothing.
 */
const NAMES = ['Mute', 'Shh', 'Hide', 'Vibe', 'Code', 'Yours'];
const YOURS = NAMES[NAMES.length - 1];

/** The word that goes beside the vibe. Falls back to Vibe for anything ours. */
function nameFor(vibe: string): string {
    const slot = savedMarks().indexOf(vibe);
    return slot === -1 ? YOURS : NAMES[slot];
}

interface MarkRow extends vscode.QuickPickItem {
    /** Which of the six, or RESET for the row at the bottom. */
    slot: number;
    mark: string;
}

const RESET = -1;
const UNDO = -2;

/**
 * What a reset threw away, and when — so it can be handed back.
 *
 * A reset is the one move in here that destroys work: six vibes somebody
 * chose, gone on a keystroke, with nothing to catch them. It is also the move
 * most likely to be pressed by somebody poking about rather than deciding,
 * which is the worst combination there is.
 *
 * So the row does not vanish the moment it is pressed. It becomes the way back
 * for a few seconds, in the same place, wearing the same arrow.
 *
 * The offer outlives the list on purpose. Regret arrives after the list has
 * closed and the file behind it looks wrong — that is when somebody reaches
 * for this, and if it only lived while the list was open they would reach for
 * nothing.
 */
let thrownAway: { marks: string[]; using: string; at: number } | undefined;
const LONG_ENOUGH_TO_REGRET_IT = 10_000;

function canBeUndone(): boolean {
    return thrownAway !== undefined
        && Date.now() - thrownAway.at < LONG_ENOUGH_TO_REGRET_IT;
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

/** What the box behind the pencil can come back with, besides a vibe. */
const BACK = Symbol('back to the list');

/**
 * The list and the box behind the pencil, as two steps of one thing.
 *
 * It loops, because the box has a way back. Without one, changing your mind in
 * there means dismissing the whole thing, going back down to the status bar,
 * clicking it, and finding your row again — four moves to undo one wrong click
 * on a pencil. Every multi-step quick input in VS Code carries this arrow for
 * the same reason, and the one it hands out is the standard one, so it looks
 * and sits where people already expect to find it.
 */
async function pickMark(): Promise<void> {
    for (;;) {
        const answer = await showTheSlots();
        if (!answer) { return; }

        if (answer.use !== undefined) {
            await keep('mark', answer.use);
            return;
        }

        const slot = answer.edit as number;
        const marks = savedMarks();

        const typed = await askForMark(marks[slot]);
        if (typed === BACK) { continue; }
        if (typed === undefined) { return; }

        marks[slot] = typed;
        // Whatever the reset threw away, it is not coming back now. The offer
        // was to undo one particular reset, and the six it would restore are
        // no longer the six that were there a moment ago — pressing it would
        // quietly throw away the change just made instead of the reset.
        thrownAway = undefined;
        await keep('marks', marks);
        await keep('mark', typed);
        return;
    }
}

/**
 * The six, and — only once something has been changed — a way back.
 *
 * The way back was a button in the title-bar corner for a while, and it could
 * not be made to work. A title-bar button takes an icon and no words, so the
 * word had to be drawn into the icon; and the highlight and the click both
 * belong to the action item's box, which is sixteen pixels wide. Everything
 * hanging outside it was paint. The word was there, and it could not be
 * pressed — and a label that asks to be clicked and does nothing is worse than
 * no label, because the first one teaches somebody the button is broken.
 *
 * A row is one thing: the icon, the word, the highlight and the hit area, all
 * of it lighting up together and all of it clickable. Under a line, so it does
 * not read as a seventh vibe.
 *
 * And it exists only when it can do something. Nobody who has never changed a
 * slot needs a way back to slots they never left — for them the list is six
 * rows, as it always was. VS Code marks a changed setting the same way in its
 * own settings editor, and it pays twice over: the row appearing is the news,
 * and the row vanishing afterwards is the only confirmation this reset has
 * ever had.
 */
function slotRows(): MarkRow[] {
    const rows = plainRows();
    const untouched = savedMarks().every((mark, slot) => mark === FILLED_IN[slot]);

    // No description on this row, unlike the six above it. That column means
    // one thing up there — the name the slot goes by, the word that ends up in
    // the status bar — and an explanation in the same column is a second thing
    // wearing the first one's clothes.
    //
    // It was also the longest text in the list, sitting on the row that
    // matters least. The eye goes to whatever has the most written on it.
    //
    // Nothing is lost. The row is below the line and has no vibe of its own,
    // so it reads as belonging to none of them and therefore to all of them.
    const last = canBeUndone()
        ? { label: '$(vibe-read-reset) Undo that', slot: UNDO }
        : untouched ? undefined
            : { label: '$(vibe-read-reset) Reset', slot: RESET };
    if (!last) { return rows; }

    return [...rows,
        { label: '', kind: vscode.QuickPickItemKind.Separator, slot: RESET, mark: '' },
        { ...last, mark: '' }];
}

function plainRows(): MarkRow[] {
    return savedMarks().map((mark, slot) => {
        if (mark === '') {
            return { label: '$(add) Set your own…', slot, mark };
        }
        return {
            // Drawn, not stored: the list is HTML too, and a row that shows
            // fewer spaces than the mark really has is the list telling a lie
            // about what picking it will do.
            label: asDrawn(mark),
            description: NAMES[slot],
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


        // A heading that names the thing, and an instruction in the box.
        //
        // VS Code will not let an extension hide the filter box — an open
        // request since 2020 — and an empty one looks like something failed to
        // load, so it keeps the line telling you what to do. The heading names
        // the screen instead, which is a heading's job.
        //
        // It used to read "What stands in for hidden code": accurate, and an
        // idiom, and an abstraction on top of the idiom. Two words that need
        // no working out say as much, because anybody reading them just
        // clicked their vibe in the status bar to get here.
        box.title = 'Your vibe';
        box.placeholder = 'Pick one, or press the pencil to change it';

        // And since the box is there whether we like it or not, it may as well
        // work. Filtering matches the label by default, and every label here
        // is an emoji that nobody can type — so anybody who tried typing got
        // "No matching results" and a dead end. Matching the name too means
        // "sh" finds Shh.
        box.matchOnDescription = true;
        /**
         * Show the rows, and leave the highlight on the one being worn.
         *
         * Rebuilding the rows throws the highlight back to the top, and the
         * live preview follows the highlight — so pressing Reset made the file
         * behind flash into Mute, a vibe nobody had chosen. It came right on
         * closing the list, which is worse rather than better: for as long as
         * anybody was looking, the screen was showing them something untrue.
         *
         * Putting the highlight back where it belongs fixes the preview by
         * fixing the thing the preview is reporting on.
         */
        const showRows = () => {
            box.items = slotRows();
            const worn = vscode.workspace
                .getConfiguration('vibeRead').get<string>('mark') || DEFAULT_MARK;
            const inUse = box.items.find(row => row.mark === worn);
            if (inUse) { box.activeItems = [inUse]; }
        };

        showRows();

        let answered = false;

        // Moving down the list changes the editor behind it, so a mark can be
        // seen on your own file before you commit to it.
        box.onDidChangeActive(rows => {
            previewMark = rows[0]?.mark || undefined;
            redraw(vscode.window.activeTextEditor);
        });

        // The list stays open — you see the originals come back rather than
        // being thrown out and left to wonder whether anything happened.
        // The list stays open — you watch them come back rather than being
        // thrown out and left wondering whether anything happened. And the row
        // that did it goes, because there is nothing left to undo.
        let closed = false;

        const putThemAllBack = async () => {
            const using = activeMark();
            thrownAway = { marks: savedMarks(), using, at: Date.now() };

            // The one in use goes back to its slot's original too.
            //
            // It used to be left alone, on the reasoning that a reset should
            // not change what is on screen under somebody. That was wrong in a
            // way that only showed up in use: the vibe stayed, and its name
            // changed. Somebody sitting in Hide with a Hide of their own
            // pressed Reset and found themselves in "Yours", because the thing
            // they were using was no longer in the list and a name is looked
            // up by asking the list.
            //
            // A silent renaming is worse than a visible change, and the
            // visible change is the one they asked for: "puts them all back"
            // means all of them, the one you are wearing included. Stay in the
            // same slot, wearing what that slot came with.
            const slot = savedMarks().indexOf(using);
            await keep('marks', [...FILLED_IN]);
            if (slot !== -1) { await keep('mark', FILLED_IN[slot]); }
            showRows();
            // If the list is still open when the offer runs out, take it off
            // the screen. An offer that has quietly expired is a worse lie
            // than no offer at all.
            setTimeout(() => {
                if (!closed) { showRows(); }
            }, LONG_ENOUGH_TO_REGRET_IT + 100);
        };

        const bringYoursBack = async () => {
            const yours = thrownAway;
            thrownAway = undefined;
            if (yours) {
                await keep('marks', yours.marks);
                await keep('mark', yours.using);
            }
            showRows();
        };

        box.onDidTriggerItemButton(event => {
            answered = true;
            box.hide();
            resolve({ edit: event.item.slot });
        });

        box.onDidAccept(() => {
            const row = box.activeItems[0];
            if (!row) { return; }
            if (row.slot === RESET) { void putThemAllBack(); return; }
            if (row.slot === UNDO) { void bringYoursBack(); return; }
            answered = true;
            box.hide();
            // An empty slot has nothing to use, so accepting it means fill it.
            resolve(row.mark ? { use: row.mark } : { edit: row.slot });
        });

        box.onDidHide(() => {
            closed = true;
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
 * Nothing sits in the field but what you put there. The field has to be able
 * to look empty, and every sentence that could go in it has a better home.
 */
function askForMark(current: string): Promise<string | typeof BACK | undefined> {
    return new Promise(resolve => {
        const box = vscode.window.createInputBox();

        // VS Code's own back arrow, in VS Code's own corner. A way back that
        // looks like everybody else's is one nobody has to be shown.
        box.buttons = [vscode.QuickInputButtons.Back];
        // "vibe", not "mark". The word changed everywhere else weeks ago and
        // this one was left behind, which is how a product ends up with two
        // names for one thing.
        box.title = 'Your own vibe';
        box.value = current;

        // No placeholder, and the ghost had to be given up for the same reason
        // the hover tint had to be: VS Code dims a placeholder by setting a
        // foreground colour, and a colour emoji brings its own colours and
        // ignores it. So 🤫 sitting there as a ghost looked exactly like 🤫
        // sitting there as the value — somebody presses backspace, sees it
        // unchanged, and concludes the key did nothing.
        //
        // A ghost that cannot be faint is worse than no ghost at all, because
        // it lies about what the field contains. The offer moves to the line
        // underneath, which is blue, carries an icon, and could not be mistaken
        // for something you typed. The field is empty because it is empty.

        const hint = emojiKeyboardHint();
        const theHint = hint ? { message: hint, severity: Fine } : undefined;
        box.validationMessage = theHint;

        // Space brings the ghost back, and space is the only key that can.
        // Tab would be the web habit, but an InputBox hands an extension
        // nothing but value changes — no key events at all — so a key that
        // types nothing is a key we never hear about. Space types something,
        // which is exactly why it reaches us.
        //
        // Only a lone space in an empty field counts, so spacing emoji out
        // inside a mark goes on working.
        const putItBack = current
            ? { message: `Space puts ${current} back`, severity: Fine }
            : theHint;

        let answered = false;

        box.onDidChangeValue(typed => {
            // No early return here. Writing to box.value fires this again in
            // VS Code but not in every host, and leaving the line saying "space
            // puts it back" underneath a field that now holds it would be a
            // small lie. Working out the value first and carrying on is right
            // either way, and the second pass changes nothing.
            const value = typed === ' ' && current ? current : typed;
            if (value !== typed) { box.value = value; }

            box.validationMessage = lineUnder(value) ?? putItBack;
            previewMark = usable(value) ? value : undefined;
            redraw(vscode.window.activeTextEditor);
        });

        box.onDidAccept(() => {
            const value = box.value;
            if (!usable(value)) { return; }
            answered = true;
            box.hide();
            resolve(value);
        });

        box.onDidTriggerButton(() => {
            answered = true;
            box.hide();
            resolve(BACK);
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
 * Windows says it in a different order from the other two, and only because
 * its shortcut ends in a full stop.
 *
 * "For emoji, press Win + ." lets that dot double as the sentence's
 * punctuation, so the key disappears into it. Brackets fixed that — "[Win + .]"
 * — but crushed the dot against the bracket, and a dot is the least visible
 * character there is. Both problems come from the same place: a full stop at
 * the end of a line has nowhere to be a key.
 *
 * Put it in the middle and neither problem exists. A full stop never has a
 * space in front of it and is never followed by a lowercase word, so " . for"
 * cannot be read as punctuation, and the dot has air on both sides instead of
 * a bracket pressed against it. The brackets were only ever fixing something
 * the word order was causing.
 *
 * Mac and Linux keep the other order, because neither of them has a dot to go
 * wrong — and "Press ⌃ ⌘ Space for emoji" would hand a reader the phrase
 * "space for emoji", which is a real thing to say and the wrong one. Fix the
 * problem where the problem is.
 *
 * It does not mention that words are allowed too, and that is the whole of the
 * rule this line follows: say the thing that cannot be found by looking.
 * Win + . cannot be found by looking. That you may type in a text box, with
 * the cursor already blinking in it, can. Anybody who wants a word will type
 * one; everybody else would have read a longer line forever, with the one
 * unguessable fact diluted in it.
 *
 * Linux is the awkward one. The shortcut there belongs to the desktop rather
 * than the system and differs on every one of them, and naming a shortcut
 * that does nothing is worse than naming none: they press it, nothing
 * happens, and the extension looks broken.
 *
 * But saying nothing was the wrong answer to that. The reason for the line is
 * not only which keys to press — it is that a picker exists and emoji are
 * what belongs here. That part is true everywhere, so Linux keeps the
 * sentence and gives up only the half we cannot know. All three read as the
 * same sentence with a different ending, which is what they are.
 *
 * The Mac line uses ⌃ ⌘ rather than the words. Mac users read those symbols
 * faster than they read "Control" and "Command", and this branch only ever
 * runs on a Mac, so there is nothing to render them wrongly.
 */
function emojiKeyboardHint(): string | undefined {
    switch (process.platform) {
        case 'win32': return 'Press Win + . for emoji';
        case 'darwin': return 'For emoji, press ⌃ ⌘ Space';
        // "picker" rather than "emoji keyboard", which would say emoji twice
        // in one short line; "system" rather than "desktop", which reads as
        // the thing with the wallpaper on it.
        default: return "For emoji, open your system's picker";
    }
}

const Fine = vscode.InputBoxValidationSeverity.Info;
const Edge = vscode.InputBoxValidationSeverity.Warning;
const Bad = vscode.InputBoxValidationSeverity.Error;

/**
 * A mark you could actually keep: something is there, and it fits.
 *
 * Counted as typed, spaces and all. It used to be trimmed first, which was
 * quietly wrong and looked like a broken counter: 🙈 🙉 🙊 counts its two
 * inner spaces, so somebody adding a space at the end watched the number sit
 * still and reasonably concluded the thing had stopped working. A space is a
 * character wherever it happens to be standing.
 *
 * Trailing ones do nothing on screen, but they cost a character and the count
 * now says so, which is the only promise worth making here: what you see in
 * the field is what you are spending. Leading ones are not even useless —
 * they shift the mark to the right, which is a perfectly good arrangement.
 *
 * Nothing but spaces is still not a mark. A file where the code turned
 * invisible with nothing in its place looks like a file where nothing
 * happened.
 */
function usable(value: string): boolean {
    return value.trim() !== '' && charactersIn(value) <= MOST_CHARACTERS;
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
    if (value.trim() === '') { return undefined; }

    const length = charactersIn(value);
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
    extensionUri = context.extensionUri;

    // Context keys do not survive a restart, so this has to be set again for
    // anyone who learned it in an earlier session.
    if (learning().usedSelection) { markLearned(); }

    // The same priority for all three, so nothing can come between them.
    // Created and shown in this order, which is the order they read in:
    // reading, then hiding, then the vibe that belongs to hiding.
    readBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, TOGETHER);
    readBar.command = 'vibeRead.read';
    context.subscriptions.push(readBar);

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
        vscode.commands.registerCommand('vibeRead.read', withEditor(read)),
        vscode.commands.registerCommand('vibeRead.smartCopy', withEditor(smartCopy)),
        vscode.commands.registerCommand('vibeRead.pickMark', pickMark),
        vscode.commands.registerCommand('vibeRead.openWalkthrough', openWalkthrough),
        vscode.commands.registerCommand('vibeRead.openSample', openSample),

        vscode.window.onDidChangeActiveTextEditor(redraw),

        vscode.workspace.onDidChangeTextDocument(e => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || e.document !== editor.document) { return; }

            const s = stateFor(e.document);

            // An edit that reached hidden code puts the code back, at once.
            //
            // Hidden is not gone. Those lines are still in the file, still
            // inside any selection drawn across them, and still deleted by the
            // next keystroke — except the user cannot see what they lost,
            // because the thing they lost was invisible before it went. That
            // happened here on the first day of use, and it will happen to
            // anybody who selects a paragraph of reasoning and types.
            //
            // There is no way to refuse a keystroke, and refusing would be the
            // wrong answer anyway: this is the user's own file. So the answer
            // is honesty instead of prevention. The moment an edit touches
            // covered ground the covering comes off, the file is shown exactly
            // as it now stands, and Ctrl+Z is one key away with everything in
            // plain sight. Reading is for reading; the instant somebody writes,
            // they are not reading any more.
            //
            // An edit that stays inside the reasoning — fixing a typo in a
            // comment — touches nothing hidden and is left alone. Nobody wants
            // the file re-shuffled for that.
            const lines = scan(e.document, syntaxFor(e.document.languageId));
            if (isEngaged(s) && e.contentChanges.some(c => touchesHidden(c.range, s, lines))) {
                s.wholeFile = false;
                s.overrides.clear();
                say('The code is back — you were editing under it.');
                redraw(editor);
                return;
            }

            // Peeks are remembered by line number. Once an edit adds or removes
            // lines those numbers point at the wrong places, so they are dropped
            // rather than left to show the wrong thing.
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
