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

function decorationType(): vscode.TextEditorDecorationType {
    const icon = vscode.workspace.getConfiguration('vibeRead').get<string>('hiddenIcon') || '🙈';

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

let statusBar: vscode.StatusBarItem;

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
 */
function updateStatusBar(editor: vscode.TextEditor | undefined, whys: number, hidden: number): void {
    if (!editor) { statusBar.hide(); return; }

    if (hidden === 0) {
        // Nothing is covered up, whatever the flags happen to say.
        statusBar.text = '$(eye) Vibe Read';
        statusBar.tooltip = new vscode.MarkdownString(
            '**Vibe Read**\n\n' +
            '`Alt+X` hide the code, read the reasoning  \n' +
            'Select some lines first to hide only those.'
        );
    } else {
        const icon = currentIcon || '🙈';
        statusBar.text = whys > 0
            ? `${icon} Reading ${whys} why${whys === 1 ? '' : 's'}`
            : `${icon} Reading`;
        statusBar.tooltip = new vscode.MarkdownString(
            "**The code is hidden. You're reading the why.**\n\n" +
            '`Alt+X` show the code back  \n' +
            '`Alt+M` keep it as notes  \n' +
            '`Ctrl+C` copies only what you can see'
        );
    }

    statusBar.show();
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

/** A few seconds in the status bar. Not a popup — those have to be dismissed. */
function say(message: string): void {
    vscode.window.setStatusBarMessage(`${currentIcon || '🙈'}  ${message}`, 6000);
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
// Wiring
// ---------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext): void {
    learningStore = context.globalState;

    // Context keys do not survive a restart, so this has to be set again for
    // anyone who learned it in an earlier session.
    if (learning().usedSelection) { markLearned(); }

    statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBar.command = 'vibeRead.toggle';
    context.subscriptions.push(statusBar);

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
            if (e.affectsConfiguration('vibeRead.hiddenIcon')) {
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
        if (choice !== 'Show me how') { return; }
        // The walkthrough, not the keyboard shortcuts list. Someone who has
        // just been told what this is for wants to see it work, not read a
        // table of key bindings.
        vscode.commands.executeCommand(
            'workbench.action.openWalkthrough',
            'naveed-toro.vibe-read#readMyAI',
            false
        );
    });
}

export function deactivate(): void {
    decoration?.dispose();
    states.clear();
}
