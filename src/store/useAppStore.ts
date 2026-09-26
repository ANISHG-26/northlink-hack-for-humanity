import { create } from 'zustand'

export type Lang = 'en' | 'fr' | 'iu'
export type View = 'home' | 'resident' | 'driver' | 'dispatcher' | 'parts' | 'jobs'
export const APP_VIEWS: Exclude<View, 'home'>[] = ['resident', 'driver', 'dispatcher', 'parts', 'jobs']

/** The demo resident's house (Zone C). */
export const RESIDENT_HOUSEHOLD = 'C-12'
/** DEMO ONLY: staff PIN for issuing advisories. Real deployments need proper staff accounts. */
export const DEMO_STAFF_PIN = '1234'

interface AppState {
  isOnline: boolean
  lang: Lang
  view: View
  /** Demo switch: make every API call behave as if the network is down. */
  simulateOffline: boolean
  /** Bumped whenever the offline POST queue changes, so views can re-read it. */
  queueVersion: number
  /** Set once staff mode is unlocked (demo PIN); sent with staff-only calls. */
  staffPin: string | null
  setOnline: (v: boolean) => void
  setLang: (l: Lang) => void
  /** Navigate to a view (updates the URL). `anchor` scrolls to an element id after render. */
  navigate: (v: View, anchor?: string) => void
  setSimulateOffline: (v: boolean) => void
  bumpQueue: () => void
  unlockStaff: (pin: string) => boolean
  lockStaff: () => void
}

function loadLang(): Lang {
  try {
    const v = localStorage.getItem('northlink:lang')
    return v === 'fr' || v === 'iu' ? v : 'en'
  } catch {
    return 'en'
  }
}

export function viewFromPath(path: string): View {
  const seg = path.replace(/^\/+|\/+$/g, '').split('/')[0]
  return (APP_VIEWS as string[]).includes(seg) ? (seg as View) : 'home'
}

function scrollToAnchor(anchor?: string) {
  window.setTimeout(() => {
    const el = anchor ? document.getElementById(anchor) : null
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.focus({ preventScroll: true })
    } else {
      window.scrollTo({ top: 0 })
    }
  }, 150)
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  lang: loadLang(),
  view: typeof window === 'undefined' ? 'home' : viewFromPath(window.location.pathname),
  simulateOffline: false,
  queueVersion: 0,
  staffPin: null,
  setOnline: (isOnline) => set({ isOnline }),
  setLang: (lang) => {
    try {
      localStorage.setItem('northlink:lang', lang)
    } catch {
      /* ignore */
    }
    set({ lang })
  },
  navigate: (view, anchor) => {
    const path = view === 'home' ? '/' : `/${view}`
    const url = anchor ? `${path}#${anchor}` : path
    if (window.location.pathname + window.location.hash !== url) window.history.pushState({}, '', url)
    set({ view })
    scrollToAnchor(anchor)
  },
  setSimulateOffline: (simulateOffline) =>
    set({ simulateOffline, isOnline: simulateOffline ? false : typeof navigator === 'undefined' || navigator.onLine }),
  bumpQueue: () => set((s) => ({ queueVersion: s.queueVersion + 1 })),
  unlockStaff: (pin) => {
    if (pin !== DEMO_STAFF_PIN) return false
    set({ staffPin: pin })
    return true
  },
  lockStaff: () => set({ staffPin: null }),
}))

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (!useAppStore.getState().simulateOffline) useAppStore.getState().setOnline(true)
  })
  window.addEventListener('offline', () => useAppStore.getState().setOnline(false))
  window.addEventListener('popstate', () => {
    useAppStore.setState({ view: viewFromPath(window.location.pathname) })
    scrollToAnchor(window.location.hash.slice(1) || undefined)
  })
}
