import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { cpSync } from 'node:fs';
import { resolve } from 'node:path';

// Los scripts clásicos de js/ y los recursos de assets/ no pasan por el empaquetador:
// se copian tal cual a dist/ al terminar la compilación.
const copyLegacy = () => ({
    name: 'copiar-js-y-assets',
    apply: 'build',
    closeBundle() {
        for (const dir of ['js', 'assets', 'css']) cpSync(resolve(dir), resolve('dist', dir), { recursive: true });
    }
});

export default defineConfig({
    base: './', // funciona también publicado en una subcarpeta (p. ej. GitHub Pages)
    server: { port: 8766, strictPort: true },
    build: {
        target: 'es2020',
        rollupOptions: { input: { index: resolve('index.html'), simulador: resolve('simulador.html') } }
    },
    plugins: [
        copyLegacy(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/*.png'],
            manifest: {
                name: 'Event Horizon',
                short_name: 'Event Horizon',
                description: 'Simulador del espacio: viaja, aterriza y salta en otros mundos con física real.',
                lang: 'es',
                start_url: './simulador.html',
                display: 'standalone',
                orientation: 'any',
                background_color: '#010103',
                theme_color: '#010103',
                icons: [
                    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{html,js,css,wasm}'],
                maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
                runtimeCaching: [
                    { urlPattern: ({ url }) => url.pathname.includes('/js/') || url.pathname.includes('/css/'), handler: 'StaleWhileRevalidate', options: { cacheName: 'codigo' } },
                    { urlPattern: ({ url }) => url.pathname.includes('/assets/'), handler: 'CacheFirst', options: { cacheName: 'recursos', expiration: { maxEntries: 300 } } },
                    { urlPattern: ({ url }) => /cdn\.tailwindcss\.com|unpkg\.com|fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(url.host), handler: 'CacheFirst', options: { cacheName: 'cdn', expiration: { maxEntries: 60 } } },
                    { urlPattern: ({ url }) => /nasa\.gov|images-api/.test(url.host), handler: 'NetworkFirst', options: { cacheName: 'nasa', expiration: { maxEntries: 80 } } }
                ]
            }
        })
    ]
});
