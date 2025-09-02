type ScoreResp = { 
    ok: boolean; 
    probability?: number; 
    error?: string; 
    fullResponse?: {
        humanProbability?: number;
        confidence?: number;
        reasons?: string[];
        flags?: {
            shortText?: boolean;
            genericEngagement?: boolean;
            echoingOP?: boolean;
            linkOnlyOrHashtagsOnly?: boolean;
        };
    };
};

const BADGE_CLASS = 'tweet-human-badge';
const SEEN_ATTR = 'data-human-score-attached';

function getTweetText(article: HTMLElement): string | null {
    const textNode = article.querySelector('div[data-testid="tweetText"]');
    if (textNode) return (textNode as HTMLElement).innerText.trim();
    const alt = article.querySelector('[data-testid="tweet"]') || article.querySelector('article');
    return alt ? (alt as HTMLElement).innerText.trim() : null;
}

function ensureBadgeContainer(article: HTMLElement): HTMLElement {
    const id = 'tweet-human-badge-container';
    let container = article.querySelector<HTMLElement>(`#${id}`);
    if (!container) {
        // Ensure the article is a positioning context
        const computed = window.getComputedStyle(article);
        if (!computed.position || computed.position === 'static') {
            article.style.position = 'relative';
        }

        container = document.createElement('div');
        container.id = id;
        container.style.position = 'absolute';
        container.style.top = '8px';
        container.style.right = '8px';
        container.style.display = 'flex';
        container.style.gap = '8px';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '10';
        article.appendChild(container);
    }
    return container;
}

function applyBadgeBaseStyles(badge: HTMLElement) {
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.padding = '2px 8px';
    badge.style.borderRadius = '9999px';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = '600';
    badge.style.lineHeight = '1';
    badge.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
}

function setBadgeColorByProb(badge: HTMLElement, prob: number) {
    let bg = '#ca8a04'; // yellow-600
    if (prob > 0.6) bg = '#16a34a'; // green-600
    else if (prob < 0.4) bg = '#dc2626'; // red-600
    badge.style.backgroundColor = bg;
    badge.style.color = '#fff';
}

function renderBadge(container: HTMLElement, prob: number) {
    const pct = Math.round(prob * 100);
    const label = `${pct}%`;
    let badge = container.querySelector<HTMLElement>(`.${BADGE_CLASS}`);
    if (!badge) {
        badge = document.createElement('span');
        badge.className = BADGE_CLASS;
        container.appendChild(badge);
    }
    applyBadgeBaseStyles(badge);
    setBadgeColorByProb(badge, prob);
    badge.textContent = label;
    badge.setAttribute('data-prob', String(prob));
}

async function scoreAndBadge(article: HTMLElement) {
    if (article.getAttribute(SEEN_ATTR)) return;
    article.setAttribute(SEEN_ATTR, '1');

    const text = getTweetText(article);
    if (!text || text.length < 5) return;

    const container = ensureBadgeContainer(article);

    try {
        const resp: ScoreResp = await chrome.runtime.sendMessage({ action: 'SCORE_TWEET', text });
        if (resp?.ok && typeof resp.probability === 'number') {
            renderBadge(container, resp.probability);
        } else {
            // No badge shown on error per requirement
        }
    } catch {
        // No badge shown on error per requirement
    }
}

function scan() {
    const tweets = document.querySelectorAll<HTMLElement>('article[data-testid="tweet"], article[role="article"]');
    tweets.forEach(scoreAndBadge);
}

const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
        for (const n of m.addedNodes) {
            if (n instanceof HTMLElement) {
                if (n.matches?.('article[data-testid="tweet"], article[role="article"]')) {
                    scoreAndBadge(n);
                } else {
                    n.querySelectorAll?.('article[data-testid="tweet"], article[role="article"]').forEach((el) =>
                        scoreAndBadge(el as HTMLElement),
                    );
                }
            }
        }
    }
});

scan();
observer.observe(document.documentElement, { childList: true, subtree: true });


