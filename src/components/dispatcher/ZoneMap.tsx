import { useEffect, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ZoneStatus } from '../../api/types'
import { useT } from '../../i18n'
import { INUKJUAK, ZONE_CENTRES, ZONE_ORDER, ZONE_STYLES } from './zoneStyles'

const RADIUS_M = 170

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

/** Leaflet + OpenStreetMap map of zones A–F, coloured by status. */
export function ZoneMap({ zones }: { zones: ZoneStatus[] }) {
  const t = useT()
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!el.current || map.current) return
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView(INUKJUAK, 15)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const group = layer.current
    if (!group) return
    group.clearLayers()
    for (const z of zones) {
      const centre = ZONE_CENTRES[z.zone]
      if (!centre) continue
      const { color, Icon } = ZONE_STYLES[z.status]
      const stateLabel = t.dispatcher.zoneState[z.status]
      const detail = t.dispatcher.zoneDetail(z.households, z.running_low, z.out_of_water, z.illness_7d)
      L.circle(centre, { radius: RADIUS_M, color, weight: 3, fillColor: color, fillOpacity: 0.28 })
        .bindTooltip(escapeHtml(`${t.dispatcher.zoneLabel(z.zone)}: ${stateLabel}. ${detail}`))
        .addTo(group)
      const icon = renderToStaticMarkup(<Icon aria-hidden="true" width={16} height={16} strokeWidth={2.5} />)
      L.marker(centre, {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: 'zone-label',
          iconSize: undefined,
          html: `<span style="border-color:${color};color:${color}">${icon}<b>${escapeHtml(z.zone)}</b><span>${escapeHtml(stateLabel)}</span></span>`,
        }),
      }).addTo(group)
    }
  }, [zones, t])

  return (
    <section aria-labelledby="map-heading" className="card">
      <h2 id="map-heading" tabIndex={-1} className="text-xl font-bold text-navy scroll-mt-24">
        {t.dispatcher.mapTitle}
      </h2>
      <div
        ref={el}
        className="mt-3 h-[22rem] sm:h-[26rem] w-full rounded-xl overflow-hidden border border-slate-200 z-0"
        role="img"
        aria-label={zones
          .map((z) => `${t.dispatcher.zoneLabel(z.zone)}: ${t.dispatcher.zoneState[z.status]}`)
          .join('. ')}
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2" aria-label={t.dispatcher.legend}>
        {ZONE_ORDER.map((s) => {
          const { color, Icon } = ZONE_STYLES[s]
          return (
            <span key={s} className="inline-flex items-center gap-2 font-semibold" style={{ color }}>
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span className="text-ink">{t.dispatcher.zoneState[s]}</span>
            </span>
          )
        })}
      </div>
      <p className="mt-2 text-slate-500">{t.dispatcher.mapNote}</p>
    </section>
  )
}
