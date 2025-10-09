import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    }),
    tailwindcss(),
  ],
  server: {
    port: 5200,
    host: true,
    allowedHosts: ['*.local'],
  },
  build: {
    minify: 'esbuild',
    sourcemap: false,
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          markdown: ['react-markdown', 'react-syntax-highlighter', 'remark-gfm', 'rehype-raw', 'rehype-slug']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-markdown']
  }
})
