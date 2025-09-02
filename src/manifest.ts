import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
    manifest_version: 3,
    name: 'Tweet Human Checker',
    version: '0.1.0',
    description: 'Scores tweets for human-likeness using Echo',
    action: { default_popup: 'public/popup.html' },
    permissions: ['storage', 'scripting', 'activeTab', 'identity'],
    host_permissions: ['https://x.com/*', 'https://twitter.com/*', 'https://echo.merit.systems/*'],
    background: { service_worker: 'src/background.ts', type: 'module' },
    content_scripts: [
        {
            matches: ['https://x.com/*', 'https://twitter.com/*'],
            js: ['src/content.ts'],
            css: ['src/styles.css'],
            run_at: 'document_idle'
        }
    ],
    web_accessible_resources: [
        { resources: ['src/styles.css'], matches: ['<all_urls>'] }
    ]
});