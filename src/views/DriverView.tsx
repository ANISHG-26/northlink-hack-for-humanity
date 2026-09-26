import { Placeholder } from '../components/Placeholder'
import { useT } from '../i18n'

export function DriverView() {
  const t = useT()
  return <Placeholder title={t.tabs.driver} description={t.placeholder.driver} />
}
