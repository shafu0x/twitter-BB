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
                        model: 'gpt-4o-mini',
                        response_format: { type: 'json_object' },
                        messages: [
                            {
                                role: 'system',
                                content: 'You are a binary classifier. Return strict JSON: {"human_probability": number between 0 and 1}. Consider style, coherence, repetition, phrasing, and context.'
                            },
                            {
                                role: 'user',
                                content: `Tweet:\n"""${text}"""\nReturn only JSON.`
                            },
                        ],
                        temperature: 0,
                    });

                    const raw = completion.choices?.[0]?.message?.content ?? '{}';
                    let prob = 0.5;
                    try {
                        const parsed = JSON.parse(raw as string) as { human_probability?: unknown };
                        if (typeof parsed?.human_probability === 'number') {
                            prob = Math.max(0, Math.min(1, parsed.human_probability));
                        }
                    } catch {
                        const m = String(raw).match(/([01]?\.\d+|0|1)/);
                        if (m) prob = Math.max(0, Math.min(1, parseFloat(m[1])));
                    }

                    sendResponse({ ok: true, probability: prob });
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