import { create } from 'zustand'

export type Lang = 'en' | 'fr' | 'iu'
export type View = 'resident' | 'driver' | 'dispatcher' | 'parts'

/** The demo resident's house (Zone C). */
export const RESIDENT_HOUSEHOLD = 'C-12'

interface AppState {
  isOnline: boolean
  lang: Lang
  view: View
  /** Demo switch: make every API call behave as if the network is down. */
  simulateOffline: boolean
  /** Bumped whenever the offline POST queue changes, so views can re-read it. */
  queueVersion: number
  setOnline: (v: boolean) => void
  setLang: (l: Lang) => void
  setView: (v: View) => void
  setSimulateOffline: (v: boolean) => void
  bumpQueue: () => void
}

function loadLang(): Lang {
  try {
    const v = localStorage.getItem('northlink:lang')
    return v === 'fr' || v === 'iu' ? v : 'en'
  } catch {
    return 'en'
  }
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  lang: loadLang(),
  view: 'resident',
  setOnline: (isOnline) => set({ isOnline }),
  setLang: (lang) => {
    try {
      localStorage.setItem('northlink:lang', lang)
    } catch {
      /* ignore */
    }
    set({ lang })
  },
  setView: (view) => set({ view }),
  simulateOffline: false,
  queueVersion: 0,
  bumpQueue: () => set((s) => ({ queueVersion: s.queueVersion + 1 })),
  setSimulateOffline: (simulateOffline) =>
    set({ simulateOffline, isOnline: simulateOffline ? false : typeof navigator === 'undefined' || navigator.onLine }),
}))

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (!useAppStore.getState().simulateOffline) useAppStore.getState().setOnline(true)
  })
  window.addEventListener('offline', () => useAppStore.getState().setOnline(false))
}
