import { useEffect } from 'react'
import { flushQueue, pendingPosts } from './api/client'
import { Footer } from './components/Footer'
import { SiteNav } from './components/SiteNav'
import { LANGUAGES, useT } from './i18n'
import { useAppStore } from './store/useAppStore'
import { DispatcherView } from './views/DispatcherView'
import { DriverView } from './views/DriverView'
import { HomeView } from './views/HomeView'
import { JobsView } from './views/JobsView'
import { PartsView } from './views/PartsView'
import { ResidentView } from './views/ResidentView'

const VIEWS = {
  resident: ResidentView,
  driver: DriverView,
  dispatcher: DispatcherView,
  parts: PartsView,
  jobs: JobsView,
}

export default function App() {
  const t = useT()
  const view = useAppStore((s) => s.view)
  const lang = useAppStore((s) => s.lang)

  useEffect(() => {
    document.documentElement.lang = LANGUAGES.find((l) => l.code === lang)?.htmlLang ?? 'en'
  }, [lang])

  useEffect(() => {
    document.title = view === 'home' ? `Northlink — ${t.tagline}` : `${t.tabs[view]} · Northlink`
  }, [view, t])

  // Replay queued offline actions automatically whenever we might be back online.
  useEffect(() => {
    const tick = () => {
      const s = useAppStore.getState()
      if (!s.simulateOffline && pendingPosts().length) void flushQueue()
    }
    tick()
    const id = window.setInterval(tick, 5000)
    return () => window.clearInterval(id)
  }, [])

  if (view === 'home') {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav variant="hero" />
        <HomeView />
        <Footer />
      </div>
    )
  }

  const View = VIEWS[view]
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav variant="app" />
      <main id="main" tabIndex={-1} className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 outline-none">
        <h1 className="sr-only">{t.tabs[view]}</h1>
        <View />
      </main>
      <Footer />
    </div>
  )
}
