import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Terrapedia — Wiki 2.0 do Terraria',
        short_name: 'Terrapedia',
        description: 'Conteúdo da Terraria Wiki com uma interface moderna.',
        lang: 'pt-BR',
        theme_color: '#0f1420',
        background_color: '#0f1420',
        display: 'standalone',
        start_url: '/',
        // Abrir o app de novo (ex.: pelo atalho) traz a janela que já está aberta do lado do jogo, em vez de abrir outra
        launch_handler: { client_mode: 'focus-existing' },
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          // PNGs para o Android: o "maskable" tem fundo cheio e o desenho menor, pra caber no formato do ícone do celular
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // O service worker novo assume na hora e os arquivos de versões antigas saem do cache
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Guarda artigos e imagens já vistos para abrir mais rápido (e offline)
            urlPattern: /^https:\/\/terraria\.wiki\.gg\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'wiki-cache',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
