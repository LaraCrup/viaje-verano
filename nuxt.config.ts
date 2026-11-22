import tailwindcss from '@tailwindcss/vite'

const APP_NAME = 'Viaje Taglit'
const PAPER = '#FBF5EC'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  // Offline-first: todo pasa en el celular (Supabase, IndexedDB, service worker).
  // SSR no suma nada y complica el caché del PWA.
  ssr: false,

  modules: ['@vite-pwa/nuxt', '@nuxt/fonts'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    public: {
      supabaseUrl: '',
      supabaseKey: '',
      tripSlug: 'viaje-2026',
    },
  },

  // Fuentes de Google descargadas en el build: funcionan sin conexión.
  fonts: {
    defaults: { weights: [400, 600, 700, 800], styles: ['normal'], subsets: ['latin', 'latin-ext'] },
    families: [
      { name: 'Shantell Sans', provider: 'google', weights: [600, 700, 800] },
      { name: 'Montserrat', provider: 'google' },
    ],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'es-AR' },
      title: APP_NAME,
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: PAPER },
        { name: 'description', content: 'Itinerario, traslados, alojamientos y gastos compartidos del viaje.' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: APP_NAME },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ],
    },
  },

  nitro: {
    prerender: { routes: ['/'] },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: APP_NAME,
      short_name: APP_NAME,
      description: 'Itinerario, traslados, alojamientos y gastos compartidos del viaje.',
      lang: 'es-AR',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: PAPER,
      theme_color: PAPER,
      icons: [
        { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    generateSW: {
      // Toda la app (pantallas, fuentes, íconos) queda guardada: abre sin señal.
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,webmanifest}'],
      // Los datos NO pasan por acá: viven en IndexedDB (app/sync).
      runtimeCaching: [],
      cleanupOutdatedCaches: true,
    },
    client: {
      installPrompt: true,
    },
    devOptions: { enabled: false },
  },

  typescript: {
    strict: true,
  },
})
