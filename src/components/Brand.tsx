import type { MouseEvent } from 'react'
import { useAppStore } from '../store/useAppStore'

/** Crop the pin mark from the full logo supplied in PR #13. */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 42) / 34} viewBox="190 35 565 720" aria-hidden="true">
      <image href="/northlink-logo.png" width="943" height="981" />
    </svg>
  )
}

/** Brand link to the landing page. */
export function Brand({ size }: { size?: number }) {
  const navigate = useAppStore((s) => s.navigate)
  return (
    <a
      className="brand"
      href="/"
      onClick={(e: MouseEvent) => {
        e.preventDefault()
        navigate('home')
      }}
    >
      <BrandMark size={size} />
      <b>NorthLink</b>
    </a>
  )
}
