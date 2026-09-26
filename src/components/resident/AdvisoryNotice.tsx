import { CircleCheck, Flame, OctagonX } from 'lucide-react'
import type { Safety } from '../../api/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'

/**
 * Official advisory for the zone (reference `.advisory`): icon + text + source/date.
 * Northlink only relays advisories issued by staff for the named authority; it never tests water.
 */
export function AdvisoryNotice({ safety }: { safety: Safety }) {
  const t = useT()
  const r = t.ref
  const fmt = useFormat()
  const tone = safety.status === 'safe' ? '' : safety.status === 'boil' ? 'boil' : 'stop'
  const Icon = safety.status === 'safe' ? CircleCheck : safety.status === 'boil' ? Flame : OctagonX
  const color = safety.status === 'safe' ? '#157A3E' : safety.status === 'boil' ? '#9A4A06' : '#A61B1B'
  const title = safety.status === 'safe' ? r.advisoryNone : safety.status === 'boil' ? r.advisoryBoil : r.advisoryStop
  const source = t.safety.sources[safety.source ?? 'Municipal water office']
  const checked = `${fmt.day(safety.last_checked)}, ${fmt.time(safety.last_checked)}`
  const detail = safety.status === 'boil' ? t.safety.boilDetail : safety.status === 'nodrink' ? t.safety.nodrinkDetail : null

  return (
    <div className={`advisory ${tone}`} role="status">
      <Icon aria-hidden="true" width={26} height={26} strokeWidth={2.2} color={color} />
      <div>
        <strong>{title}</strong>
        {detail && <p>{detail}</p>}
        {safety.message && <p>“{safety.message}”</p>}
        <small>{r.sourceLine(source, safety.issued_at ? fmt.date(safety.issued_at) : null, checked)}</small>
      </div>
    </div>
  )
}
