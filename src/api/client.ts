// Typed API client with offline fallback.
// Every successful GET is cached in localStorage; if the network fails we
// return the last cached copy instead. `isOnline` lives in the app store.
import { useAppStore } from '../store/useAppStore'
import type { ApiResult, Health, Household } from './types'

const CACHE_PREFIX = 'northlink:cache:'

interface CacheEntry<T> {
  data: T
  cachedAt: string
}

function readCache<T>(path: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + path)
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null
  } catch {
    return null
  }
}

function writeCache<T>(path: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, cachedAt: new Date().toISOString() }
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify(entry))
  } catch {
    // storage full or unavailable — caching is best-effort
  }
}

async function get<T>(path: string): Promise<ApiResult<T>> {
  const { setOnline } = useAppStore.getState()
  try {
    const res = await fetch(`/api${path}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as T
    writeCache(path, data)
    setOnline(true)
    return { data, fromCache: false }
  } catch (err) {
    setOnline(false)
    const cached = readCache<T>(path)
    if (cached) return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt }
    throw err
  }
}

export const api = {
  health: () => get<Health>('/health'),
  households: () => get<Household[]>('/households'),
}
