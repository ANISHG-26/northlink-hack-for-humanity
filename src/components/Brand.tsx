import type { MouseEvent } from 'react'
import { useAppStore } from '../store/useAppStore'

/** NorthLink pin mark (from the approved reference). */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 42) / 34} viewBox="0 0 34 42" aria-hidden="true">
      <defs>
        <linearGradient id="nl-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7FD3E0" />
          <stop offset="1" stopColor="#0E8C99" />
        </linearGradient>
      </defs>
      <path d="M17 1C8.2 1 1 8 1 16.6 1 28 17 41 17 41s16-13 16-24.4C33 8 25.8 1 17 1z" fill="url(#nl-brand)" />
      <path d="M17 7c-3 4-5 6.5-5 9a5 5 0 0 0 10 0c0-2.5-2-5-5-9z" fill="#fff" />
      <path d="M7 24c3 1.6 6 1.6 10 0s7-1.6 10 0" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
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
