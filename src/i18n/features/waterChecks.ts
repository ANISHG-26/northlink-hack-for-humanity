import { useAppStore, type Lang } from '../../store/useAppStore'

const en = {
  title: 'Water checks by run',
  intro: 'Manual readings at the water source and at household drop points. Staff review them; Northlink does not certify water as safe.',
  run: (truck: string, date: string) => `${truck} run · ${date}`,
  runLabel: 'Truck run',
  source: 'Source',
  dropPoints: 'Drop points',
  missing: 'Missing reading',
  missingSource: 'No source reading for this run',
  status: { unreviewed: 'Not reviewed', reviewed: 'Reviewed', needs_follow_up: 'Needs follow-up' },
  needsReview: 'Needs staff review',
  complete: 'All checkpoints logged and reviewed',
  reading: (param: string, value: string, units: string) => `${param}: ${value} ${units}`,
  noValue: 'no value recorded',
  by: (collector: string, time: string) => `${collector} · ${time}`,
  markReviewed: 'Mark reviewed',
  followUp: 'Needs follow-up',
  staffOnly: 'Staff mode is needed to review readings.',
  log: 'Log a reading',
  checkpoint: 'Checkpoint',
  checkpoints: { source: 'Source', drop_point: 'Household drop point' },
  household: 'House code',
  parameter: 'Parameter',
  value: 'Value',
  units: 'Units',
  submit: 'Log reading',
  error: 'Could not save. Please try again.',
  sample: 'Sample readings for the demo',
}

type Strings = typeof en

const fr: Strings = {
  title: 'Contrôles de l’eau par tournée',
  intro: 'Lectures manuelles à la source et aux points de livraison. Le personnel les examine; Northlink ne certifie pas que l’eau est potable.',
  run: (truck, date) => `Tournée ${truck} · ${date}`,
  runLabel: 'Tournée',
  source: 'Source',
  dropPoints: 'Points de livraison',
  missing: 'Lecture manquante',
  missingSource: 'Aucune lecture à la source pour cette tournée',
  status: { unreviewed: 'Non examinée', reviewed: 'Examinée', needs_follow_up: 'Suivi requis' },
  needsReview: 'Examen du personnel requis',
  complete: 'Tous les points consignés et examinés',
  reading: (param, value, units) => `${param} : ${value} ${units}`,
  noValue: 'aucune valeur consignée',
  by: (collector, time) => `${collector} · ${time}`,
  markReviewed: 'Marquer examinée',
  followUp: 'Suivi requis',
  staffOnly: 'Le mode personnel est requis pour examiner les lectures.',
  log: 'Consigner une lecture',
  checkpoint: 'Point de contrôle',
  checkpoints: { source: 'Source', drop_point: 'Point de livraison' },
  household: 'Code de la maison',
  parameter: 'Paramètre',
  value: 'Valeur',
  units: 'Unités',
  submit: 'Consigner',
  error: 'Échec de l’enregistrement. Veuillez réessayer.',
  sample: 'Lectures fictives pour la démo',
}

// TODO: community translation review — English placeholders, no invented syllabics.
const STRINGS: Record<Lang, Strings> = { en, fr, iu: en }

export function useWaterChecksT(): Strings {
  return STRINGS[useAppStore((s) => s.lang)]
}
