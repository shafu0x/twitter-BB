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
                const { text } = message as { text: string };
                try {
                    const { echo_access_token } = await chrome.storage.local.get(['echo_access_token']);
                    if (!echo_access_token) {
                        sendResponse({ ok: false, error: 'Not authenticated' });
                        return;
                    }
                    const client = new OpenAI({
                        apiKey: echo_access_token,
                        baseURL: ECHO_ROUTER_BASE,
                        dangerouslyAllowBrowser: true,
                    });

                    const completion = await client.chat.completions.create({
                        model: 'gpt-4',
                        messages: [
                            {
                                role: 'system',
                                content: `You are a tweet origin classifier. Output one JSON object only.

Goal
- humanProbability in [0,1], where 0 is certainly bot-like and 1 is certainly human-written.

Strict guidance
- Short, generic engagement like "Agreed", "Facts", "This is gold, thank you!", "Great thread", "Nice", "Thanks..!!", "gm", or "This is the way" is bot-leaning unless it contains personal specifics or context.
- Replies that only echo the original post or restate it are bot-leaning.
- Link-only or hashtag-only replies are bot-leaning.
- Very short text without concrete detail should have low confidence and usually a low humanProbability.
- Human signals: concrete first-person details, specific times/places/numbers, mild typos, varied punctuation, context-dependent humor or nuance, code-switching/slang that fits content.
- Bot signals: templated praise or agreement, recycled advice, repetitive emoji or hashtag patterns, rigid grammar with low entropy, marketing cadence, obvious copypasta.

Output schema
{
  "humanProbability": number,
  "confidence": number,
  "reasons": string[],
  "flags": {
    "shortText": boolean,
    "genericEngagement": boolean,
    "echoingOP": boolean,
    "linkOnlyOrHashtagsOnly": boolean
  }
}

Rules
- Output ONLY valid JSON. No markdown, no backticks, no extra text before or after.
- Start your response with { and end with }
- Keep reasons neutral and concise.`
                            },
                            {
                                role: 'user',
                                content: `Tweet to classify:\n"""${text}"""`
                            },
                        ],
                        temperature: 0,
                    });

                    const raw = completion.choices?.[0]?.message?.content ?? '{}';
                    let prob = 0.5;
                    let fullResponse = null;
                    try {
                        const parsed = JSON.parse(raw as string) as { 
                            humanProbability?: unknown;
                            confidence?: unknown;
                            reasons?: unknown;
                            flags?: unknown;
                        };
                        if (typeof parsed?.humanProbability === 'number') {
                            prob = Math.max(0, Math.min(1, parsed.humanProbability));
                            fullResponse = parsed;
                        }
                    } catch {
                        const m = String(raw).match(/([01]?\.\d+|0|1)/);
                        if (m) prob = Math.max(0, Math.min(1, parseFloat(m[1])));
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