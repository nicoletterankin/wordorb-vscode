/**
 * Generates HTML for VS Code webview panels.
 * Handles word cards, lessons, and quizzes.
 */

import type { WordData, LessonData, QuizData } from './wordorb-api';

// ---------------------------------------------------------------------------
// Shared Styles
// ---------------------------------------------------------------------------

const STYLES = `
<style>
    :root {
        --bg: var(--vscode-editor-background);
        --fg: var(--vscode-editor-foreground);
        --accent: var(--vscode-textLink-foreground, #2563eb);
        --muted: var(--vscode-descriptionForeground, #888);
        --border: var(--vscode-panel-border, #333);
        --input-bg: var(--vscode-input-background, #1e1e1e);
        --badge-bg: var(--vscode-badge-background, #333);
        --badge-fg: var(--vscode-badge-foreground, #fff);
        --success: #16a34a;
        --error: #dc2626;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
        font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
        font-size: var(--vscode-font-size, 13px);
        color: var(--fg);
        background: var(--bg);
        padding: 1.5rem;
        line-height: 1.65;
    }

    h1, h2, h3 { margin-bottom: 0.5rem; }
    h1 { font-size: 1.6rem; }
    h2 { font-size: 1.2rem; }
    h3 { font-size: 1rem; }
    p { margin-bottom: 0.75rem; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }

    .ipa { color: var(--muted); font-style: italic; font-size: 1rem; }
    .pos {
        display: inline-block;
        font-size: 0.75rem;
        background: var(--badge-bg);
        color: var(--badge-fg);
        padding: 0.1em 0.5em;
        border-radius: 3px;
        font-weight: 600;
    }

    .section {
        margin-top: 1.25rem;
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: 6px;
    }

    .section-title {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--muted);
        margin-bottom: 0.5rem;
    }

    .lang-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.4rem;
    }
    .lang-item {
        font-size: 0.85rem;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        background: var(--input-bg);
    }
    .lang-code {
        font-weight: 700;
        color: var(--accent);
        text-transform: uppercase;
        font-size: 0.7rem;
        margin-right: 0.3rem;
    }

    /* Tabs */
    .tabs {
        display: flex;
        border-bottom: 2px solid var(--border);
        margin-top: 1rem;
    }
    .tab {
        flex: 1;
        padding: 0.6rem 0.25rem;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--muted);
        border-bottom: 3px solid transparent;
        margin-bottom: -2px;
        text-align: center;
        font-family: inherit;
    }
    .tab:hover { color: var(--accent); }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

    .tab-panel { display: none; padding: 1rem 0; }
    .tab-panel.active { display: block; }

    /* Quiz */
    .question { margin-bottom: 1.5rem; }
    .question-prompt { font-weight: 600; margin-bottom: 0.75rem; }

    .choice {
        display: block;
        width: 100%;
        padding: 0.6rem 0.75rem;
        margin-bottom: 0.4rem;
        border: 2px solid var(--border);
        border-radius: 5px;
        background: var(--input-bg);
        color: var(--fg);
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        font-size: 0.9rem;
        transition: border-color 0.15s;
    }
    .choice:hover { border-color: var(--accent); }
    .choice.correct { border-color: var(--success); background: rgba(22, 163, 74, 0.1); }
    .choice.incorrect { border-color: var(--error); background: rgba(220, 38, 38, 0.1); }
    .choice.disabled { pointer-events: none; opacity: 0.7; }

    .explanation {
        display: none;
        margin-top: 0.5rem;
        padding: 0.5rem 0.75rem;
        border-left: 3px solid var(--accent);
        font-size: 0.85rem;
        color: var(--muted);
    }
    .explanation.visible { display: block; }

    .score {
        text-align: center;
        padding: 1.5rem;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--accent);
    }

    .footer {
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border);
        font-size: 0.75rem;
        color: var(--muted);
        text-align: center;
    }

    .meta-badges {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
    }
    .meta-badge {
        font-size: 0.75rem;
        background: var(--input-bg);
        border: 1px solid var(--border);
        padding: 0.15em 0.5em;
        border-radius: 3px;
    }
</style>
`;

// ---------------------------------------------------------------------------
// Word Panel
// ---------------------------------------------------------------------------

function renderWord(data: WordData): string {
    let langsHtml = '';
    if (data.langs && Array.isArray(data.langs) && data.langs.length > 0) {
        const items = data.langs
            .slice(0, 12)
            .map(l => `<div class="lang-item"><span class="lang-code">${esc(l.lang)}</span>${esc(l.translation)}</div>`)
            .join('');
        langsHtml = `
            <div class="section">
                <div class="section-title">Translations</div>
                <div class="lang-grid">${items}</div>
            </div>
        `;
    }

    return `
        <h1>${esc(data.word)}</h1>
        <span class="ipa">${esc(data.ipa || '')}</span>
        ${data.pos ? `<span class="pos">${esc(data.pos)}</span>` : ''}
        <p style="margin-top: 0.75rem; font-size: 1.05rem;">${esc(data.def || '')}</p>
        ${data.etym ? `
            <div class="section">
                <div class="section-title">Etymology</div>
                <p>${esc(data.etym)}</p>
            </div>
        ` : ''}
        ${langsHtml}
        <div class="footer">
            <a href="https://wordorb.ai?ref=vscode">wordorb.ai</a> &mdash; 162K words, 47 languages
        </div>
    `;
}

// ---------------------------------------------------------------------------
// Lesson Panel
// ---------------------------------------------------------------------------

function renderLesson(data: LessonData): string {
    const phases = ['hook', 'story', 'wonder', 'action', 'wisdom'] as const;
    const phaseLabels: Record<string, string> = {
        hook: 'Hook', story: 'Story', wonder: 'Wonder', action: 'Action', wisdom: 'Wisdom',
    };

    const tabsHtml = phases
        .filter(p => data.phases[p])
        .map((p, i) => `<button class="tab${i === 0 ? ' active' : ''}" data-tab="${p}">${phaseLabels[p]}</button>`)
        .join('');

    const panelsHtml = phases
        .filter(p => data.phases[p])
        .map((p, i) => `<div class="tab-panel${i === 0 ? ' active' : ''}" data-tab="${p}">${esc(data.phases[p])}</div>`)
        .join('');

    return `
        <h1>${esc(data.title || `Day ${data.day}`)}</h1>
        <div class="meta-badges">
            <span class="meta-badge">Day ${data.day}</span>
            <span class="meta-badge">${esc(data.track)}</span>
            <span class="meta-badge">${esc(data.age_group)}</span>
            ${data.theme ? `<span class="meta-badge">${esc(data.theme)}</span>` : ''}
        </div>
        <div class="tabs">${tabsHtml}</div>
        ${panelsHtml}
        <div class="footer">
            <a href="https://wordorb.ai?ref=vscode">wordorb.ai</a> &mdash; 226K lessons
        </div>
        <script>
            (function() {
                var tabs = document.querySelectorAll('.tab');
                var panels = document.querySelectorAll('.tab-panel');
                tabs.forEach(function(tab) {
                    tab.addEventListener('click', function() {
                        var target = tab.getAttribute('data-tab');
                        tabs.forEach(function(t) { t.classList.remove('active'); });
                        panels.forEach(function(p) { p.classList.remove('active'); });
                        tab.classList.add('active');
                        var panel = document.querySelector('.tab-panel[data-tab="' + target + '"]');
                        if (panel) panel.classList.add('active');
                    });
                });
            })();
        </script>
    `;
}

// ---------------------------------------------------------------------------
// Quiz Panel
// ---------------------------------------------------------------------------

function renderQuiz(data: QuizData): string {
    if (!data.interactions || data.interactions.length === 0) {
        return '<p>No quiz questions available.</p>';
    }

    const questionsHtml = data.interactions.map((q, i) => {
        let choicesHtml = '';
        if (q.choices && Array.isArray(q.choices)) {
            choicesHtml = q.choices.map((c, ci) => {
                const label = typeof c === 'string' ? c : (c.text || c.label || '');
                const value = typeof c === 'string' ? String.fromCharCode(65 + ci) : (c.key || String.fromCharCode(65 + ci));
                return `<button class="choice" data-value="${esc(value)}">${esc(value)}. ${esc(label)}</button>`;
            }).join('');
        }

        return `
            <div class="question" data-index="${i}" data-answer="${esc(q.answer || '')}" style="${i > 0 ? 'display:none' : ''}">
                <div class="question-prompt">${i + 1}. ${esc(q.prompt || '')}</div>
                ${choicesHtml}
                <div class="explanation">${esc(q.explanation || '')}</div>
            </div>
        `;
    }).join('');

    return `
        <h1>Vocabulary Quiz</h1>
        <p style="color: var(--muted);">Question <span id="qnum">1</span> of ${data.interactions.length}</p>
        ${questionsHtml}
        <div id="quiz-nav" style="margin-top: 1rem;">
            <button class="choice" id="prev-btn" disabled style="width:auto; display:inline-block; margin-right:0.5rem;">Previous</button>
            <button class="choice" id="next-btn" style="width:auto; display:inline-block;">Next</button>
        </div>
        <div id="quiz-score" class="score" style="display:none;"></div>
        <div class="footer">
            <a href="https://wordorb.ai?ref=vscode">wordorb.ai</a> &mdash; 21K assessments
        </div>
        <script>
            (function() {
                var questions = document.querySelectorAll('.question');
                var total = questions.length;
                var current = 0;
                var score = 0;
                var answered = {};

                function show(idx) {
                    questions.forEach(function(q) { q.style.display = 'none'; });
                    if (questions[idx]) questions[idx].style.display = 'block';
                    document.getElementById('qnum').textContent = String(idx + 1);
                    document.getElementById('prev-btn').disabled = (idx === 0);
                    document.getElementById('next-btn').textContent = (idx === total - 1) ? 'Finish' : 'Next';
                }

                document.addEventListener('click', function(e) {
                    var btn = e.target.closest('.question .choice');
                    if (!btn) return;
                    var q = btn.closest('.question');
                    var idx = parseInt(q.getAttribute('data-index'));
                    if (answered[idx]) return;
                    answered[idx] = true;
                    var correct = (q.getAttribute('data-answer') || '').toUpperCase();
                    var selected = (btn.getAttribute('data-value') || '').toUpperCase();
                    q.querySelectorAll('.choice').forEach(function(c) {
                        c.classList.add('disabled');
                        if ((c.getAttribute('data-value') || '').toUpperCase() === correct) c.classList.add('correct');
                    });
                    if (selected === correct) { score++; } else { btn.classList.add('incorrect'); }
                    var expl = q.querySelector('.explanation');
                    if (expl) expl.classList.add('visible');
                });

                document.getElementById('prev-btn').addEventListener('click', function() {
                    if (current > 0) { current--; show(current); }
                });
                document.getElementById('next-btn').addEventListener('click', function() {
                    if (current < total - 1) { current++; show(current); }
                    else {
                        document.getElementById('quiz-nav').style.display = 'none';
                        questions.forEach(function(q) { q.style.display = 'none'; });
                        var el = document.getElementById('quiz-score');
                        el.style.display = 'block';
                        el.textContent = score + ' / ' + Object.keys(answered).length + ' correct';
                    }
                });

                show(0);
            })();
        </script>
    `;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export function getPanelHtml(type: 'word' | 'lesson' | 'quiz', data: any): string {
    let body = '';
    switch (type) {
        case 'word':   body = renderWord(data as WordData); break;
        case 'lesson': body = renderLesson(data as LessonData); break;
        case 'quiz':   body = renderQuiz(data as QuizData); break;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
    ${STYLES}
</head>
<body>
    ${body}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Escape helper
// ---------------------------------------------------------------------------

function esc(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
