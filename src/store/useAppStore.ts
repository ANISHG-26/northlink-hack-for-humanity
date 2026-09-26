import { create } from 'zustand'

export type Lang = 'en' | 'fr' | 'iu'
export type View = 'resident' | 'driver' | 'dispatcher' | 'parts'

interface AppState {
  isOnline: boolean
  lang: Lang
  view: View
  setOnline: (v: boolean) => void
  setLang: (l: Lang) => void
  setView: (v: View) => void
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
}))

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useAppStore.getState().setOnline(true))
  window.addEventListener('offline', () => useAppStore.getState().setOnline(false))
}
