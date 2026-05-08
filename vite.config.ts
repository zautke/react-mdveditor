import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mdeServerPlugin } from './src/lib/vite-plugin-mde-server'

function parsePort(value: string | undefined, fallback: number): number {
  const port = Number.parseInt(value ?? '', 10)
  return Number.isFinite(port) ? port : fallback
}

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
  const appPort = parsePort(env.MDE_APP_PORT, 5200)
  const devPort = parsePort(env.MDE_DEV_PORT, 5250)
  const sidecarPort = parsePort(
    env.MDE_SIDECAR_INTERNAL_PORT ?? env.MDE_URL_SIDECAR_PORT,
    5280,
  )
  const host = env.MDE_HOST ?? 'localhost'
  const sidecarOrigin =
    env.MDE_EXTRACT_PROXY_ORIGIN ?? `http://localhost:${sidecarPort}`

  return {
    plugins: [
      react({
        jsxRuntime: 'automatic'
      }),
      tailwindcss(),
      mdeServerPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: devPort,
      host: true,
      allowedHosts: [host, 'localhost', '127.0.0.1'],
      proxy: {
        '/api/extract': {
          target: sidecarOrigin,
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api/, ''),
        },
      },
    },
    preview: {
      port: appPort,
      host: true,
      allowedHosts: [host, 'localhost', '127.0.0.1'],
    },
    build: {
      minify: 'esbuild',
      sourcemap: false,
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            markdown: ['react-markdown', 'react-syntax-highlighter', 'remark-gfm', 'rehype-raw', 'rehype-slug'],
            'react-preview': ['react-runner']
          }
        }
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-markdown']
    }
  }
})
