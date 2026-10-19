import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logoPWAJL.jpg', 'logoPWAJL512.png'],
      manifest: {
        name: 'Metas JL - Distribuidora',
        short_name: 'Metas JL',
        description: 'Acompanhamento diário de metas e vendas',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'logoPWAJL.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'logoPWAJL512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'logoPWAJL512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})