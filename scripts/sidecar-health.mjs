const DEFAULT_TIMEOUT_MS = 3_000

export async function assertSidecarHealthy(origin, {
  fetchImpl = fetch,
  timeoutMs = Number.parseInt(process.env.MDE_DB_HEALTH_TIMEOUT_MS ?? '', 10) || DEFAULT_TIMEOUT_MS,
} = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(`${origin}/health`, { signal: controller.signal })
    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.status !== 'ready' || payload?.database !== 'ready') {
      throw new Error(`Database sidecar at ${origin} is not ready`)
    }
  } finally {
    clearTimeout(timeout)
  }
}
