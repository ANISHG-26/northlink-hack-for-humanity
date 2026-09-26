import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import { api } from '../api/client'
import type { HouseholdStatus, LevelChoice } from '../api/types'
import { OfflineBanner } from '../components/OfflineBanner'
import { DeliveryTracker } from '../components/resident/DeliveryTracker'
import { HouseholdQR } from '../components/resident/HouseholdQR'
import { LevelUpdater } from '../components/resident/LevelUpdater'
import { ReportProblem } from '../components/resident/ReportProblem'
import { SafetyBanner } from '../components/resident/SafetyBanner'
import { SensorPage } from '../components/resident/SensorPage'
import { TanksCard } from '../components/resident/TanksCard'
import { useT } from '../i18n'
import { RESIDENT_HOUSEHOLD, useAppStore } from '../store/useAppStore'

const POLL_MS = 15_000

export function ResidentView() {
  const t = useT()
  const isOnline = useAppStore((s) => s.isOnline)
  const [status, setStatus] = useState<HouseholdStatus | null>(null)
  const [cachedAt, setCachedAt] = useState<string | undefined>()
  const [error, setError] = useState(false)
  const [showSensor, setShowSensor] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api.householdStatus(RESIDENT_HOUSEHOLD)
      setStatus(r.data)
      setCachedAt(r.fromCache ? r.cachedAt : undefined)
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  // Load now, then keep the tracker fresh (e.g. when the driver completes a delivery).
  useEffect(() => {
    void load()
    const id = window.setInterval(load, POLL_MS)
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  async function updateLevel(level: LevelChoice) {
    const res = await api.updateLevel(RESIDENT_HOUSEHOLD, level)
    if (res.queued) return 'queued' as const
    setStatus(res.data)
    return 'saved' as const
  }

  async function advance() {
    const res = await api.advanceDelivery(RESIDENT_HOUSEHOLD)
    if (!res.queued) setStatus(res.data)
  }

  if (showSensor) {
    return (
      <div className="max-w-3xl mx-auto">
        <SensorPage
          householdId={RESIDENT_HOUSEHOLD}
          onBack={() => {
            setShowSensor(false)
            void load()
          }}
        />
      </div>
    )
  }

  if (!status) {
    return (
      <div className="card flex flex-col items-center gap-4 py-12 text-center" role="status">
        {error ? (
          <>
            <TriangleAlert aria-hidden="true" className="h-8 w-8 text-status-nodrink" />
            <p className="font-semibold">{t.loadError}</p>
            <button
              type="button"
              onClick={load}
              className="tap inline-flex items-center gap-2 rounded-xl bg-glacier px-5 font-semibold text-white hover:bg-navy"
            >
              <RefreshCw aria-hidden="true" className="h-5 w-5" />
              {t.retry}
            </button>
          </>
        ) : (
          <>
            <LoaderCircle aria-hidden="true" className="h-8 w-8 animate-spin text-teal" />
            <p>{t.loading}</p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto">
      {(!isOnline || cachedAt) && <OfflineBanner cachedAt={cachedAt} />}
      <SafetyBanner safety={status.safety} />
      <TanksCard
        forecast={status.forecast}
        sewage={status.sewage}
        measurement={status.measurement}
        onOpenSensor={() => setShowSensor(true)}
      />
      <DeliveryTracker delivery={status.delivery} onAdvance={advance} />
      <LevelUpdater onSubmit={updateLevel} />
      <ReportProblem householdId={RESIDENT_HOUSEHOLD} />
      <HouseholdQR householdId={RESIDENT_HOUSEHOLD} />
    </div>
  )
}
