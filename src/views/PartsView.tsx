import { Placeholder } from '../components/Placeholder'
import { useT } from '../i18n'

export function PartsView() {
  const t = useT()
  return <Placeholder title={t.tabs.parts} description={t.placeholder.parts} />
}
