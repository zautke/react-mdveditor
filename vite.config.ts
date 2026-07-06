import path from 'path'
import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mdeServerPlugin } from './src/lib/vite-plugin-mde-server'

function parsePort(value: string | undefined, fallback: number): number {
  const port = Number.parseInt(value ?? '', 10)
  return Number.isFinite(port) ? port : fallback
}

function loadDevHttpsConfig(env: Record<string, string | undefined>) {
  // Config SSoT: honor the cert/key paths declared in .env first. These resolve
  // identically on the host and inside the dev container (cwd === repo root),
  // so HTTPS works in both without duplicating certs into docker/dev-https.
  if (
    env.MDE_DEV_HTTPS === 'true' &&
    env.MDE_DEV_TLS_CERT_PATH &&
    env.MDE_DEV_TLS_KEY_PATH
  ) {
    const certFile = path.resolve(__dirname, env.MDE_DEV_TLS_CERT_PATH)
    const keyFile = path.resolve(__dirname, env.MDE_DEV_TLS_KEY_PATH)
    if (existsSync(certFile) && existsSync(keyFile)) {
      return {
        cert: readFileSync(certFile),
        key: readFileSync(keyFile),
      }
    }
  }

  const candidateDirs = [
    path.resolve(homedir(), '.local', 'state', 'mdeditor', 'dev-https'),
    path.resolve(__dirname, 'docker/dev-https'),
  ]

  for (const dir of candidateDirs) {
    const certFile = path.resolve(dir, 'server.crt')
    const keyFile = path.resolve(dir, 'server.key')

    if (!existsSync(certFile) || !existsSync(keyFile)) {
      continue
    }

    return {
      cert: readFileSync(certFile),
      key: readFileSync(keyFile),
    }
  }

  return undefined
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
      origin: env.MDE_DEV_ORIGIN,
      allowedHosts: [host, 'localhost', '127.0.0.1'],
      https: loadDevHttpsConfig(env),
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
