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
        container = document.createElement('div');
        container.id = id;
        container.style.display = 'flex';
        container.style.gap = '8px';
        container.style.marginTop = '4px';
        const textNode = article.querySelector('div[data-testid="tweetText"]');
        if (textNode?.parentElement) {
            textNode.parentElement.appendChild(container);
        } else {
            article.appendChild(container);
        }
    }
    return container;
}

function renderBadge(container: HTMLElement, prob: number) {
    const pct = Math.round(prob * 100);
    const label = `Human ${pct}%`;
    let badge = container.querySelector<HTMLElement>(`.${BADGE_CLASS}`);
    if (!badge) {
        badge = document.createElement('span');
        badge.className = BADGE_CLASS;
        container.appendChild(badge);
    }
    badge.textContent = label;
    badge.setAttribute('data-prob', String(prob));
}

async function scoreAndBadge(article: HTMLElement) {
    if (article.getAttribute(SEEN_ATTR)) return;
    article.setAttribute(SEEN_ATTR, '1');

    const text = getTweetText(article);
    if (!text || text.length < 5) return;

    const container = ensureBadgeContainer(article);
    renderBadge(container, 0.5);

    try {
        const resp: ScoreResp = await chrome.runtime.sendMessage({ action: 'SCORE_TWEET', text });
        if (resp?.ok && typeof resp.probability === 'number') {
            renderBadge(container, resp.probability);
        } else {
            renderBadge(container, 0.5);
        }
    } catch {
        renderBadge(container, 0.5);
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


