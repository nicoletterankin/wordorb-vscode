import * as https from 'https';
import * as vscode from 'vscode';

const API_BASE = 'https://api.wordorb.ai';
const USER_AGENT = 'WordOrb-VSCode/1.0.0';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WordData {
    word: string;
    ipa: string;
    pos: string;
    def: string;
    etym: string;
    langs: LangEntry[];
    tones: Record<string, string>;
    image_url: string | null;
    _source?: string;
    _tier?: string;
}

export interface LangEntry {
    lang: string;
    translation: string;
}

export interface LessonData {
    day: number;
    track: string;
    title: string | null;
    theme: string | null;
    age_group: string;
    language: string;
    archetype: string | null;
    phases: Record<string, string>;
    archetypes_available: string[];
    languages_available: string[];
}

export interface QuizInteraction {
    day?: number;
    type: string;
    phase: string;
    prompt: string;
    choices: Array<string | { key?: string; text?: string; label?: string }> | null;
    answer: string;
    explanation: string;
}

export interface QuizData {
    track: string;
    count: number;
    interactions: QuizInteraction[];
}

// ---------------------------------------------------------------------------
// HTTP Client
// ---------------------------------------------------------------------------

function getApiKey(): string {
    const config = vscode.workspace.getConfiguration('wordorb');
    return config.get<string>('apiKey', '');
}

function request(path: string, params: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
        const apiKey = getApiKey();
        if (!apiKey && !path.includes('/health')) {
            reject(new Error('WordOrb API key not configured. Set it in Settings > WordOrb.'));
            return;
        }

        const queryString = Object.entries(params)
            .filter(([, v]) => v !== '')
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');

        const fullPath = queryString ? `${path}?${queryString}` : path;

        const options: https.RequestOptions = {
            hostname: 'api.wordorb.ai',
            port: 443,
            path: fullPath,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'User-Agent': USER_AGENT,
            },
            timeout: 15000,
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(data.error || `API error ${res.statusCode}`));
                    } else {
                        resolve(data);
                    }
                } catch {
                    reject(new Error('Invalid JSON response from API'));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('API request timed out'));
        });

        req.end();
    });
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function cachedRequest(path: string, params: Record<string, string> = {}): Promise<any> {
    const key = path + JSON.stringify(params);
    const entry = cache.get(key);
    if (entry && entry.expires > Date.now()) {
        return Promise.resolve(entry.data);
    }

    return request(path, params).then((data) => {
        cache.set(key, { data, expires: Date.now() + CACHE_TTL });
        return data;
    });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function lookupWord(word: string, lang?: string): Promise<WordData> {
    const params: Record<string, string> = {};
    if (lang) { params.lang = lang; }
    return cachedRequest(`/api/word/${encodeURIComponent(word.toLowerCase())}`, params);
}

export function lookupWordMinimal(word: string): Promise<{ word: string; definition: string; ipa: string }> {
    return cachedRequest(`/api/word/${encodeURIComponent(word.toLowerCase())}`, { format: 'minimal' });
}

export function getLesson(day: number, track: string = 'learn', age: string = 'adult'): Promise<LessonData> {
    return cachedRequest('/api/lesson', {
        day: String(day),
        track,
        age,
    });
}

export function getQuizRandom(count: number = 5, track: string = 'learn', type?: string): Promise<QuizData> {
    const params: Record<string, string> = {
        track,
        count: String(count),
    };
    if (type) { params.type = type; }
    return cachedRequest('/api/quiz/random', params);
}

export function healthCheck(): Promise<any> {
    return request('/api/health');
}

export function clearCache(): void {
    cache.clear();
}
