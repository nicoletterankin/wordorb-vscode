import * as vscode from 'vscode';
import * as api from './wordorb-api';
import { getPanelHtml } from './webview-content';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let statusBarItem: vscode.StatusBarItem | undefined;
let currentPanel: vscode.WebviewPanel | undefined;

// ---------------------------------------------------------------------------
// Activate
// ---------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext): void {

    // -- Commands ----------------------------------------------------------

    context.subscriptions.push(
        vscode.commands.registerCommand('wordorb.lookupWord', cmdLookupWord),
        vscode.commands.registerCommand('wordorb.lookupSelection', cmdLookupSelection),
        vscode.commands.registerCommand('wordorb.dailyWord', cmdDailyWord),
        vscode.commands.registerCommand('wordorb.quiz', cmdQuiz),
    );

    // -- Hover Provider ----------------------------------------------------

    const config = vscode.workspace.getConfiguration('wordorb');
    if (config.get<boolean>('enableHover', true)) {
        const hoverProvider = vscode.languages.registerHoverProvider(
            { scheme: '*', language: '*' },
            new WordOrbHoverProvider()
        );
        context.subscriptions.push(hoverProvider);
    }

    // -- Status Bar --------------------------------------------------------

    if (config.get<boolean>('showStatusBar', true)) {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
        statusBarItem.command = 'wordorb.dailyWord';
        statusBarItem.tooltip = 'Click to see daily word details';
        context.subscriptions.push(statusBarItem);
        updateStatusBar();
    }

    // Refresh status bar daily
    const refreshInterval = setInterval(updateStatusBar, 60 * 60 * 1000);
    context.subscriptions.push({ dispose: () => clearInterval(refreshInterval) });
}

export function deactivate(): void {
    api.clearCache();
}

// ---------------------------------------------------------------------------
// Hover Provider
// ---------------------------------------------------------------------------

class WordOrbHoverProvider implements vscode.HoverProvider {
    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): Promise<vscode.Hover | undefined> {
        const apiKey = vscode.workspace.getConfiguration('wordorb').get<string>('apiKey', '');
        if (!apiKey) { return undefined; }

        const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z'-]{2,}/);
        if (!wordRange) { return undefined; }

        const word = document.getText(wordRange).toLowerCase();

        // Skip very short words and common programming keywords
        if (word.length < 3) { return undefined; }
        const skipWords = new Set([
            'var', 'let', 'const', 'function', 'return', 'import', 'export',
            'class', 'interface', 'type', 'enum', 'void', 'null', 'undefined',
            'true', 'false', 'new', 'this', 'super', 'extends', 'implements',
            'for', 'while', 'break', 'continue', 'switch', 'case', 'default',
            'try', 'catch', 'finally', 'throw', 'async', 'await', 'yield',
            'from', 'with', 'else', 'elif', 'def', 'self', 'cls', 'lambda',
            'int', 'str', 'bool', 'float', 'list', 'dict', 'set', 'tuple',
        ]);
        if (skipWords.has(word)) { return undefined; }

        try {
            const data = await api.lookupWordMinimal(word);
            if (!data || !data.definition) { return undefined; }

            const md = new vscode.MarkdownString();
            md.isTrusted = true;
            md.appendMarkdown(`**${data.word}**`);
            if (data.ipa) {
                md.appendMarkdown(` &nbsp;_${data.ipa}_`);
            }
            md.appendMarkdown(`\n\n${data.definition}`);
            md.appendMarkdown(`\n\n[View full details](command:wordorb.lookupWord?${encodeURIComponent(JSON.stringify(word))})`);

            return new vscode.Hover(md, wordRange);
        } catch {
            return undefined;
        }
    }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdLookupWord(wordArg?: string): Promise<void> {
    let word = typeof wordArg === 'string' ? wordArg : '';

    if (!word) {
        word = await vscode.window.showInputBox({
            prompt: 'Enter an English word to look up',
            placeHolder: 'courage',
        }) || '';
    }

    if (!word) { return; }
    word = word.trim().toLowerCase().replace(/[^a-z'-]/g, '');
    if (!word) { return; }

    const apiKey = vscode.workspace.getConfiguration('wordorb').get<string>('apiKey', '');
    if (!apiKey) {
        const action = await vscode.window.showWarningMessage(
            'WordOrb API key not configured.',
            'Open Settings'
        );
        if (action === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'wordorb.apiKey');
        }
        return;
    }

    try {
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: `Looking up "${word}"...` },
            async () => {
                const data = await api.lookupWord(word);
                showWordPanel(data);
            }
        );
    } catch (err: any) {
        vscode.window.showErrorMessage(`WordOrb: ${err.message}`);
    }
}

async function cmdLookupSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    const selection = editor.document.getText(editor.selection).trim();
    if (!selection) {
        vscode.window.showInformationMessage('Select a word first, then run this command.');
        return;
    }

    await cmdLookupWord(selection);
}

async function cmdDailyWord(): Promise<void> {
    const apiKey = vscode.workspace.getConfiguration('wordorb').get<string>('apiKey', '');
    if (!apiKey) {
        const action = await vscode.window.showWarningMessage(
            'WordOrb API key not configured.',
            'Open Settings'
        );
        if (action === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'wordorb.apiKey');
        }
        return;
    }

    try {
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loading daily lesson...' },
            async () => {
                const dayOfYear = getDayOfYear();
                const lesson = await api.getLesson(dayOfYear, 'learn', 'adult');
                showLessonPanel(lesson);
            }
        );
    } catch (err: any) {
        vscode.window.showErrorMessage(`WordOrb: ${err.message}`);
    }
}

async function cmdQuiz(): Promise<void> {
    const apiKey = vscode.workspace.getConfiguration('wordorb').get<string>('apiKey', '');
    if (!apiKey) {
        const action = await vscode.window.showWarningMessage(
            'WordOrb API key not configured.',
            'Open Settings'
        );
        if (action === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'wordorb.apiKey');
        }
        return;
    }

    try {
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loading quiz...' },
            async () => {
                const quiz = await api.getQuizRandom(5, 'learn', 'mc');
                showQuizPanel(quiz);
            }
        );
    } catch (err: any) {
        vscode.window.showErrorMessage(`WordOrb: ${err.message}`);
    }
}

// ---------------------------------------------------------------------------
// Status Bar
// ---------------------------------------------------------------------------

async function updateStatusBar(): Promise<void> {
    if (!statusBarItem) { return; }

    const apiKey = vscode.workspace.getConfiguration('wordorb').get<string>('apiKey', '');
    if (!apiKey) {
        statusBarItem.text = '$(book) WordOrb';
        statusBarItem.show();
        return;
    }

    try {
        const dayOfYear = getDayOfYear();
        const lesson = await api.getLesson(dayOfYear, 'learn', 'adult');
        if (lesson && lesson.title) {
            statusBarItem.text = `$(book) ${lesson.title}`;
        } else {
            statusBarItem.text = '$(book) WordOrb';
        }
    } catch {
        statusBarItem.text = '$(book) WordOrb';
    }
    statusBarItem.show();
}

// ---------------------------------------------------------------------------
// Webview Panels
// ---------------------------------------------------------------------------

function getOrCreatePanel(title: string): vscode.WebviewPanel {
    if (currentPanel) {
        currentPanel.title = title;
        currentPanel.reveal(vscode.ViewColumn.Beside);
        return currentPanel;
    }

    currentPanel = vscode.window.createWebviewPanel(
        'wordorb',
        title,
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        }
    );

    currentPanel.onDidDispose(() => {
        currentPanel = undefined;
    });

    return currentPanel;
}

function showWordPanel(data: api.WordData): void {
    const panel = getOrCreatePanel(`WordOrb: ${data.word}`);
    panel.webview.html = getPanelHtml('word', data);
}

function showLessonPanel(data: api.LessonData): void {
    const panel = getOrCreatePanel(`Lesson: Day ${data.day}`);
    panel.webview.html = getPanelHtml('lesson', data);
}

function showQuizPanel(data: api.QuizData): void {
    const panel = getOrCreatePanel('WordOrb Quiz');
    panel.webview.html = getPanelHtml('quiz', data);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDayOfYear(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.min(Math.floor(diff / oneDay), 365);
}
