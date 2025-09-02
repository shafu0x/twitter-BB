import { authenticate } from "@/lib/echoAuth";
import OpenAI from 'openai';

const ECHO_ROUTER_BASE = 'https://echo.router.merit.systems';

// Echo message handlers
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
        switch (message.action) {
            case 'AUTHENTICATE': {
                authenticate(message, async (response) => {
                    if (response.success && response.echoUser && response.tokenData) {
                        // Store authentication data in chrome storage
                        await chrome.storage.local.set({
                            echo_user: response.echoUser,
                            echo_access_token: response.tokenData.accessToken,
                            echo_refresh_token: response.tokenData.refreshToken,
                            echo_access_token_expires_at: response.tokenData.accessTokenExpiresAt,
                            echo_refresh_token_expires_at: response.tokenData.refreshTokenExpiresAt,
                        });
                    }
                    sendResponse(response);
                });
                return;
            }
            case 'GET_USER': {
                const result = await chrome.storage.local.get(['echo_user']);
                sendResponse({ user: result.echo_user || null });
                return;
            }
            case 'GET_TOKEN': {
                const result = await chrome.storage.local.get(['echo_access_token']);
                sendResponse({ token: result.echo_access_token || null });
                return;
            }
            case 'CHECK_AUTH': {
                const result = await chrome.storage.local.get([
                    'echo_user',
                    'echo_access_token',
                    'echo_access_token_expires_at'
                ]);
                const now = Date.now();
                const isAuthenticated = result.echo_user &&
                    result.echo_access_token &&
                    result.echo_access_token_expires_at &&
                    now < result.echo_access_token_expires_at;

                sendResponse({
                    isAuthenticated,
                    user: isAuthenticated ? result.echo_user : null,
                    token: isAuthenticated ? result.echo_access_token : null
                });
                return;
            }
            case 'SIGN_OUT': {
                await chrome.storage.local.remove([
                    'echo_user',
                    'echo_access_token',
                    'echo_refresh_token',
                    'echo_access_token_expires_at',
                    'echo_refresh_token_expires_at'
                ]);
                sendResponse({ success: true });
                return;
            }
            case 'GET_BALANCE': {
                const { echo_access_token } = await chrome.storage.local.get(['echo_access_token']);
                if (!echo_access_token) {
                    sendResponse({ ok: false, error: 'No token', balance: null });
                    return;
                }
                try {
                    const resp = await fetch('https://echo.merit.systems/api/billing/balance', {
                        headers: { Authorization: `Bearer ${echo_access_token}` },
                    });
                    if (!resp.ok) throw new Error(`Balance fetch failed: ${resp.status}`);
                    const data = await resp.json();
                    sendResponse({ ok: true, balance: data.balance ?? null });
                } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : 'Balance fetch error';
                    sendResponse({ ok: false, error: message, balance: null });
                }
                return;
            }
            case 'SCORE_TWEET': {
                const { text, likes } = message as { text: string; likes?: number };
                try {
                    const { echo_access_token } = await chrome.storage.local.get(['echo_access_token']);
                    if (!echo_access_token) {
                        sendResponse({ ok: false, error: 'Not authenticated' });
                        return;
                    }
                    // Lightweight heuristic shim
                    function priorPenalty(input: string, likesCount?: number): number {
                        const t = input.trim().toLowerCase();
                        const len = t.length;

                        const genericList = [
                            'agreed', 'facts', 'well said', 'nice', 'great thread', 'this is gold',
                            'this is the way', 'thank you', 'thanks', 'amazing', 'gm', 'noted'
                        ];
                        const hasGeneric = genericList.some(p => {
                            const ps = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const re = new RegExp(`(^|\\b)${ps}(\\b|[\\s,.!?:;])`);
                            return re.test(t);
                        });

                        const slopPhrases = [
                            'level up',
                            'real way',
                            'this is how to',
                            'this is how you',
                            'must read',
                            'game changer'
                        ];
                        const hasSlop = slopPhrases.some(p => t.includes(p));

                        const hasOnlyLink = /^https?:\/\/\S+$/i.test(t) || (t.replace(/\s+/g,' ').split(' ').filter(w => w.startsWith('http')).length >= 1 && len < 30);
                        const lowEntropy = new Set(t).size / Math.max(1, len) < 0.2; // crude entropy proxy

                        let penalty = 0;
                        if (len < 25) penalty += 0.25;
                        if (hasGeneric) penalty += 0.35;
                        if (hasSlop) penalty += 0.2;
                        if (hasOnlyLink) penalty += 0.35;
                        if (lowEntropy) penalty += 0.15;

                        const lc = typeof likesCount === 'number' ? likesCount : undefined;
                        if (lc !== undefined) {
                            if (lc <= 0) penalty += 0.2;
                            else if (lc <= 2) penalty += 0.1;
                        }

                        return Math.min(0.7, penalty); // cap
                    }

                    function blend(llm: number, input: string, likesCount?: number): number {
                        const p = priorPenalty(input, likesCount);
                        const len = input.trim().length;
                        const wPrior = len < 50 ? 0.5 : 0.25;
                        const adjusted = (1 - wPrior) * llm + wPrior * (1 - p);
                        return Math.max(0, Math.min(1, adjusted));
                    }
                    const client = new OpenAI({
                        apiKey: echo_access_token,
                        baseURL: ECHO_ROUTER_BASE,
                        dangerouslyAllowBrowser: true,
                    });

                    const t = text.trim();
                    const hints = {
                        isReply: false,
                        hasLink: /https?:\/\/\S+/i.test(t) || t.includes('http'),
                        hasHashtags: /(^|\s)#\w+/.test(t),
                        hasMentions: /(^|\s)@\w+/.test(t),
                        length: t.length,
                        likesCount: typeof likes === 'number' ? likes : 0,
                    };

                    const completion = await client.chat.completions.create({
                        model: 'gpt-4',
                        messages: [
                            {
                                role: 'system',
                                content: `You are a tweet origin classifier. Output one JSON object only.

Goal
- humanProbability in [0,1], where 0 is certainly bot-like and 1 is certainly human-written.

Strict guidance
- Short, generic engagement like “Agreed”, “Facts”, “This is gold, thank you!”, “Great thread”, “Nice”, “Thanks..!!”, “gm”, or “This is the way” is bot-leaning unless it contains personal specifics or context.
- Replies that only echo the original post or restate it are bot-leaning.
- Link-only or hashtag-only replies are bot-leaning.
- Very short text without concrete detail should have low confidence and usually a low humanProbability.
- Human signals: concrete first-person details, specific times/places/numbers, mild typos, varied punctuation, context-dependent humor or nuance, code-switching/slang that fits content.
- Bot signals: templated praise or agreement, recycled advice, repetitive emoji or hashtag patterns, rigid grammar with low entropy, marketing cadence, obvious copypasta.

Output schema
{
  "humanProbability": number,
  "confidence": number,
  "reasons": string[<=4],
  "flags": {
    "shortText": boolean,
    "genericEngagement": boolean,
    "echoingOP": boolean,
    "linkOnlyOrHashtagsOnly": boolean
  }
}

Rules
- JSON only. No markdown or extra text.
- Keep reasons neutral and concise.`
                            },
                            {
                                role: 'user',
                                content: `Tweet:\n"""Agreed"""\nHints: {"isReply":true,"hasLink":false,"hasHashtags":false,"hasMentions":false,"length":6,"likesCount":0}\nExpected:\n{"humanProbability":0.1,"confidence":0.5,"reasons":["One-word generic agreement"],"flags":{"shortText":true,"genericEngagement":true,"echoingOP":false,"linkOnlyOrHashtagsOnly":false}}\n\nTweet:\n"""This is gold, thank you! 🙏"""\nHints: {"isReply":true,"hasLink":false,"hasHashtags":false,"hasMentions":false,"length":27,"likesCount":0}\nExpected:\n{"humanProbability":0.25,"confidence":0.5,"reasons":["Templated praise without specifics"],"flags":{"shortText":true,"genericEngagement":true,"echoingOP":false,"linkOnlyOrHashtagsOnly":false}}\n\nTweet:\n"""also http://evm.codes"""\nHints: {"isReply":true,"hasLink":true,"hasHashtags":false,"hasMentions":false,"length":16,"likesCount":0}\nExpected:\n{"humanProbability":0.2,"confidence":0.5,"reasons":["Link with minimal text","Echoes topic without detail"],"flags":{"shortText":true,"genericEngagement":false,"echoingOP":true,"linkOnlyOrHashtagsOnly":false}}\n\nTweet:\n"""${text}"""\n\nHints:\n${JSON.stringify(hints)}\n\nReturn the JSON object only.`
                            },
                        ],
                        temperature: 0,
                    });

                    const raw = completion.choices?.[0]?.message?.content ?? '{}';
                    let prob = 0.5;
                    let fullResponse: {
                        humanProbability?: number;
                        confidence?: number;
                        reasons?: string[];
                        flags?: Record<string, boolean>;
                    } | null = null;
                    try {
                        const parsed = JSON.parse(raw as string) as { 
                            humanProbability?: unknown;
                            confidence?: unknown;
                            reasons?: unknown;
                            flags?: unknown;
                        };
                        if (typeof parsed?.humanProbability === 'number') {
                            const original = Math.max(0, Math.min(1, parsed.humanProbability));
                            const adjusted = blend(original, text, likes);
                            prob = adjusted;
                            (parsed as { humanProbability?: number }).humanProbability = adjusted;
                            fullResponse = parsed as {
                                humanProbability?: number;
                                confidence?: number;
                                reasons?: string[];
                                flags?: Record<string, boolean>;
                            };
                        }
                    } catch {
                        const m = String(raw).match(/([01]?\.\d+|0|1)/);
                        if (m) {
                            const extracted = Math.max(0, Math.min(1, parseFloat(m[1])));
                            prob = blend(extracted, text, likes);
                        }
                    }

                    sendResponse({ ok: true, probability: prob, fullResponse });
                } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : 'Scoring error';
                    sendResponse({ ok: false, error: message });
                }
                return;
            }
        }
    })();
    return true; // Keep the message channel open for async responses
});