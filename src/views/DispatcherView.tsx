import { useEffect, useState } from 'react'
import { Database, TriangleAlert } from 'lucide-react'
import { api } from '../api/client'
import type { Household } from '../api/types'
import { Placeholder } from '../components/Placeholder'
import { useT } from '../i18n'

export function DispatcherView() {
  const t = useT()
  const [households, setHouseholds] = useState<Household[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .households()
      .then((r) => setHouseholds(r.data))
      .catch(() => setError(true))
  }, [])

  return (
    <Placeholder title={t.tabs.dispatcher} description={t.placeholder.dispatcher}>
      <p className="mt-4 flex items-center gap-2" role="status">
        {error ? (
          <>
            <TriangleAlert aria-hidden="true" className="h-5 w-5 text-status-nodrink" />
            {t.loadError}
          </>
        ) : households ? (
          <>
            <Database aria-hidden="true" className="h-5 w-5 text-glacier" />
            {households.length} {t.householdsLoaded}
          </>
        ) : null}
      </p>
    </Placeholder>
  )
}
