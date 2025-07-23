import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
    manifest_version: 3,
    name: 'Web Cmd+K',
    version: '1.0',
    description: 'Navigate the web with ease',
    side_panel: {
        default_path: 'index.html'
    },
    permissions: ['sidePanel'],
    background: {
        service_worker: 'src/background.ts',
        type: 'module'
    },
});