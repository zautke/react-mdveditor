export declare function assertSidecarHealthy(
  origin: string,
  options?: {
    fetchImpl?: typeof fetch
    timeoutMs?: number
  },
): Promise<void>
