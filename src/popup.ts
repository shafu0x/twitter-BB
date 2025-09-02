const authStatus = document.getElementById('auth-status')!;
const balanceEl = document.getElementById('balance')!;
const userEl = document.getElementById('user')!;
const signInBtn = document.getElementById('sign-in')!;
const signOutBtn = document.getElementById('sign-out')!;

const echoClientId = 'd0d350bd-3b3e-4509-9af8-15f20e61dcdc';
const echoBaseUrl = 'https://echo.merit.systems';

async function refresh() {
    const { isAuthenticated, user } = await chrome.runtime.sendMessage({ action: 'CHECK_AUTH' });
    authStatus.textContent = isAuthenticated ? 'Signed in' : 'Signed out';
    userEl.textContent = isAuthenticated ? JSON.stringify(user) : '—';

    if (isAuthenticated) {
        const bal = await chrome.runtime.sendMessage({ action: 'GET_BALANCE' });
        if (bal?.ok) balanceEl.textContent = String(bal.balance ?? '—');
        else balanceEl.textContent = '—';
    } else {
        balanceEl.textContent = '—';
    }
}

signInBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({
        action: 'AUTHENTICATE',
        params: { echoClientId, echoBaseUrl },
    });
    await refresh();
});

signOutBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'SIGN_OUT' });
    await refresh();
});

refresh();


