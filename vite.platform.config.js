import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: 'dist-platform',
    rollupOptions: {
      input: 'platform.html',
    },
    assetsInlineLimit: 100_000_000, // инлайним всё включая картинки
  },
})
