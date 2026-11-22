import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Genera los íconos del PWA a partir de public/favicon.svg: npx pwa-assets-generator
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#FBF5EC' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#FBF5EC' } },
  },
  images: ['public/favicon.svg'],
})
