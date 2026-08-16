/**
 * React Preview — CDN Resolution
 *
 * Dynamically loads any npm package from esm.sh at runtime.
 * Used by both Shared mode (dynamic import into scope) and
 * Isolated mode (import map + ESM script URLs).
 */

export const CDN_BASE = 'https://esm.sh'
export const REACT_VERSION = '18.3.1'

/** Packages that CDN modules should NOT bundle (externalized via ?external=). */
const EXTERNAL_PEERS = ['react', 'react-dom']

/**
 * Builds an esm.sh URL for a given npm package.
 *
 * @param pkg       - Package name, e.g. 'lucide-react' or '@radix-ui/react-icons'
 * @param options.external - Peer deps to externalize (default: react, react-dom).
 *                           Externalized deps emit bare specifiers — requires an
 *                           import map (Isolated mode).
 * @param options.deps     - Pin peer dependency versions (e.g. ['react@18.3.1']).
 *                           Used in Shared mode to ensure CDN modules build against
 *                           the same React version as the app.
 */
export function cdnUrl(
  pkg: string,
  options?: { external?: string[]; deps?: string[] },
): string {
  const ext = options?.external ?? EXTERNAL_PEERS
  const deps = options?.deps ?? []
  const base = `${CDN_BASE}/${pkg}`
  const params: string[] = []
  if (ext.length > 0) params.push(`external=${ext.join(',')}`)
  if (deps.length > 0) params.push(`deps=${deps.join(',')}`)
  return params.length > 0 ? `${base}?${params.join('&')}` : base
}

/**
 * esm.sh URL that resolves standalone — no import map required.
 *
 * Nothing is externalized, so the module emits no bare specifiers, and React
 * is pinned via `?deps` so the CDN builds against the same version the host
 * uses. That keeps `$$typeof` symbols (created with `Symbol.for`) compatible
 * across React instances, so elements from CDN packages render correctly.
 *
 * Shared mode and the isolated-mode iframe both resolve packages this way.
 */
export function pinnedCdnUrl(pkg: string): string {
  return cdnUrl(pkg, {
    external: [],
    deps: [`react@${REACT_VERSION}`, `react-dom@${REACT_VERSION}`],
  })
}

/**
 * Marks a module namespace so CommonJS-style interop unwraps it correctly.
 *
 * The preview transpiles user code to CJS, so `import x from 'pkg'` becomes
 * `_interopRequireDefault(require('pkg')).default`. That helper only reads
 * `.default` when the value is flagged `__esModule`; otherwise it assumes a
 * CJS module and wraps the whole thing as `{ default: value }`.
 *
 * A namespace object from a real `import()` has no `__esModule` property, so
 * without this every default import resolved to the namespace instead of the
 * export — `import clsx from 'clsx'` yielded an object, and calling it threw
 * "_clsx2.default.call is not a function".
 *
 * Spreading copies the named exports and `default`; namespaces are frozen, so
 * a copy is required rather than assigning the flag in place.
 */
export function withEsModuleInterop(mod: unknown): unknown {
  if (mod === null || typeof mod !== 'object') return mod
  return { __esModule: true, ...(mod as Record<string, unknown>) }
}

/** In-memory cache keyed by package name — avoids redundant network fetches. */
const moduleCache = new Map<string, unknown>()

/** Packages currently being fetched — deduplicates concurrent requests. */
const inflightRequests = new Map<string, Promise<unknown>>()

/**
 * Dynamically imports a package from esm.sh for Shared mode scope injection.
 *
 * Results are cached so repeated calls for the same package are instant.
 * Concurrent requests for the same package share a single fetch.
 *
 * @throws Error with user-friendly message if the package can't be loaded.
 */
export async function loadFromCdn(pkg: string): Promise<unknown> {
  const cached = moduleCache.get(pkg)
  if (cached !== undefined) return cached

  const inflight = inflightRequests.get(pkg)
  if (inflight) return inflight

  const request = fetchModule(pinnedCdnUrl(pkg), pkg)

  inflightRequests.set(pkg, request)
  try {
    const mod = await request
    moduleCache.set(pkg, mod)
    return mod
  } finally {
    inflightRequests.delete(pkg)
  }
}

/** Dynamically imports a module from esm.sh with descriptive error messages. */
async function fetchModule(url: string, pkg: string): Promise<unknown> {
  try {
    return withEsModuleInterop(await import(/* @vite-ignore */ url))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Failed to load '${pkg}' from CDN (${CDN_BASE}). ` +
        `Verify the package name is correct and published on npm.\n` +
        `Original error: ${message}`,
    )
  }
}
