import { Ban, CircleCheck, Flame, TriangleAlert } from 'lucide-react'
import type { ZoneState } from '../../api/types'

// Zone map states — colour is always paired with an icon + text label.
export const ZONE_STYLES: Record<ZoneState, { color: string; Icon: typeof CircleCheck }> = {
  ok: { color: '#15803D', Icon: CircleCheck },
  low: { color: '#B45309', Icon: TriangleAlert },
  out: { color: '#B91C1C', Icon: Ban },
  advisory: { color: '#6D28D9', Icon: Flame },
}

export const ZONE_ORDER: ZoneState[] = ['ok', 'low', 'out', 'advisory']

// Approximate zone centres around Inukjuak (sample data, not real boundaries).
export const INUKJUAK: [number, number] = [58.4531, -78.103]
export const ZONE_CENTRES: Record<string, [number, number]> = {
  A: [58.4556, -78.1105],
  B: [58.4562, -78.1015],
  C: [58.4538, -78.0935],
  D: [58.4507, -78.1065],
  E: [58.4512, -78.0968],
  F: [58.4484, -78.1012],
}
