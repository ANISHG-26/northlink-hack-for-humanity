import { useEffect } from 'react'
import { Header } from './components/Header'
import { Tabs } from './components/Tabs'
import { Footer } from './components/Footer'
import { LANGUAGES } from './i18n'
import { useAppStore } from './store/useAppStore'
import { ResidentView } from './views/ResidentView'
import { DriverView } from './views/DriverView'
import { DispatcherView } from './views/DispatcherView'
import { PartsView } from './views/PartsView'

const VIEWS = {
  resident: ResidentView,
  driver: DriverView,
  dispatcher: DispatcherView,
  parts: PartsView,
}

export default function App() {
  const view = useAppStore((s) => s.view)
  const lang = useAppStore((s) => s.lang)
  const View = VIEWS[view]

  useEffect(() => {
    document.documentElement.lang = LANGUAGES.find((l) => l.code === lang)?.htmlLang ?? 'en'
  }, [lang])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Tabs />
      <main
        id={`panel-${view}`}
        role="tabpanel"
        aria-labelledby={`tab-${view}`}
        className="flex-1 w-full max-w-5xl mx-auto px-4 py-6"
      >
        <View />
      </main>
      <Footer />
    </div>
  )
}
