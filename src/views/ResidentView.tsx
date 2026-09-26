import { Placeholder } from '../components/Placeholder'
import { useT } from '../i18n'

export function ResidentView() {
  const t = useT()
  return <Placeholder title={t.tabs.resident} description={t.placeholder.resident} />
}
