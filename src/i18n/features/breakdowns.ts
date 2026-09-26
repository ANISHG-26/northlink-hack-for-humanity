import { useAppStore, type Lang } from '../../store/useAppStore'

const en = {
  title: 'Truck repairs',
  intro: 'Log a truck problem, track the repair, and see the part in stock. A truck with an open repair is taken out of coverage.',
  coverage: (n: number, total: number) => `${n} of ${total} trucks in service`,
  truckStatus: { in_service: 'In service', maintenance: 'Under repair', out_of_service: 'Out of service' },
  symptom: 'What was observed',
  part: 'Affected part',
  noPart: 'Not sure yet',
  cause: 'Likely cause',
  causes: { unknown: 'Unknown', wear: 'Wear', freezing: 'Freezing', damage: 'Damage', electrical: 'Electrical', other: 'Other' },
  causeNotConfirmed: 'not confirmed',
  causeConfirmed: 'confirmed',
  status: { open: 'Open', waiting_parts: 'Waiting for parts', in_repair: 'In repair', fixed: 'Fixed' },
  opened: (time: string) => `Opened ${time}`,
  fixed: (time: string) => `Fixed ${time}`,
  downtime: (text: string) => `Back in service after ${text}`,
  stock: (n: number) => `${n} in stock`,
  reorder: 'Reorder needed before the sealift',
  noReorder: 'Stock is enough',
  contacts: 'Potential contacts: see Partners and support below (sample directory, unverified until confirmed locally).',
  log: 'Log a breakdown',
  truck: 'Truck',
  submit: 'Log breakdown',
  mark: (status: string) => `Mark ${status.toLowerCase()}`,
  error: 'Could not save. Please try again.',
  none: 'No breakdowns logged.',
  duration: (m: number) => (m < 60 ? `${m} min` : m < 48 * 60 ? `${Math.round((m / 60) * 10) / 10} hours` : `${Math.round(m / 1440)} days`),
}

type Strings = typeof en

const fr: Strings = {
  title: 'Réparations des camions',
  intro: 'Consignez un problème de camion, suivez la réparation et voyez la pièce en stock. Un camion en réparation est retiré de la couverture.',
  coverage: (n, total) => `${n} camions en service sur ${total}`,
  truckStatus: { in_service: 'En service', maintenance: 'En réparation', out_of_service: 'Hors service' },
  symptom: 'Ce qui a été observé',
  part: 'Pièce touchée',
  noPart: 'Pas encore certain',
  cause: 'Cause probable',
  causes: { unknown: 'Inconnue', wear: 'Usure', freezing: 'Gel', damage: 'Dommage', electrical: 'Électrique', other: 'Autre' },
  causeNotConfirmed: 'non confirmée',
  causeConfirmed: 'confirmée',
  status: { open: 'Ouverte', waiting_parts: 'En attente de pièces', in_repair: 'En réparation', fixed: 'Réparée' },
  opened: (time) => `Ouverte ${time}`,
  fixed: (time) => `Réparée ${time}`,
  downtime: (text) => `Remis en service après ${text}`,
  stock: (n) => `${n} en stock`,
  reorder: 'À recommander avant le ravitaillement',
  noReorder: 'Stock suffisant',
  contacts: 'Contacts possibles : voir Partenaires et soutien ci-dessous (répertoire fictif, non vérifié).',
  log: 'Consigner une panne',
  truck: 'Camion',
  submit: 'Consigner la panne',
  mark: (status) => `Marquer : ${status.toLowerCase()}`,
  error: 'Échec de l’enregistrement. Veuillez réessayer.',
  none: 'Aucune panne consignée.',
  duration: (m) => (m < 60 ? `${m} min` : m < 48 * 60 ? `${Math.round((m / 60) * 10) / 10} heures` : `${Math.round(m / 1440)} jours`),
}

// TODO: community translation review — English placeholders, no invented syllabics.
const STRINGS: Record<Lang, Strings> = { en, fr, iu: en }

export function useBreakdownsT(): Strings {
  return STRINGS[useAppStore((s) => s.lang)]
}
