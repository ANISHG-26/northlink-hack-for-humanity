import { useAppStore, type Lang } from '../../store/useAppStore'

const en = {
  requestsTitle: 'Open water and sanitation requests',
  noRequests: 'No open requests.',
  reported: (time: string) => `Reported ${time}`,
  services: { water: 'Water delivery', sewage_full: 'Sewage tank full', sewage_blocked: 'Sewage blocked', sewage: 'Sewage pickup' },
  sources: { resident: 'Resident report', sensor: 'Tank sensor', staff: 'Staff' },
  pending: 'Pending sync',
  pendingNote: 'Completed offline on this device; not counted until it syncs.',
  historyTitle: 'Service history',
  cols: { household: 'Household', service: 'Service', last: 'Last visit', count: 'Visits', response: 'Last response time' },
  medianTitle: 'Median response time',
  medianNone: 'No completed requests yet',
  completedTitle: 'Recently completed',
  completedLine: (house: string, service: string, truck: string, time: string) => `${house} · ${service} · ${truck} · ${time}`,
  responseTime: (text: string) => `Response time ${text}`,
  noLinkedRequest: 'No linked request',
  coverageTitle: 'Coverage today',
  driversAvailable: (n: number, need: number) => `${n} of ${need} drivers available`,
  driversStandby: (n: number) => `${n} on standby`,
  driversAbsent: (n: number) => `${n} absent`,
  trucks: (n: number, total: number) => `${n} of ${total} water trucks in service`,
  coveredHouseholds: (covered: string, total: string) => `Truck coverage: up to ${covered} of ${total} households`,
  assumption: (n: number) =>
    `Coverage assumption: up to ${n} households per water truck (team assumption, not daily deliveries). Sanitation is tracked separately.`,
  shortfall: 'Coverage shortfall: call a standby driver or return a truck to service',
  noShortfall: 'Coverage is enough for today',
  sampleBadge: 'Sample operations data (waiting for the operations API, #3)',
  jobsLink: 'See Jobs & Training',
  minutes: (m: number) => (m < 60 ? `${m} min` : m < 48 * 60 ? `${Math.round((m / 60) * 10) / 10} h` : `${Math.round(m / 1440)} days`),
}

type OpsStrings = typeof en

const fr: OpsStrings = {
  requestsTitle: 'Demandes d’eau et d’assainissement ouvertes',
  noRequests: 'Aucune demande ouverte.',
  reported: (time) => `Signalée à ${time}`,
  services: { water: 'Livraison d’eau', sewage_full: 'Réservoir d’eaux usées plein', sewage_blocked: 'Égout bloqué', sewage: 'Vidange des eaux usées' },
  sources: { resident: 'Signalement du résident', sensor: 'Capteur', staff: 'Personnel' },
  pending: 'En attente de synchronisation',
  pendingNote: 'Terminé hors ligne sur cet appareil; non compté avant la synchronisation.',
  historyTitle: 'Historique de service',
  cols: { household: 'Ménage', service: 'Service', last: 'Dernière visite', count: 'Visites', response: 'Dernier délai' },
  medianTitle: 'Délai de réponse médian',
  medianNone: 'Aucune demande terminée',
  completedTitle: 'Terminées récemment',
  completedLine: (house, service, truck, time) => `${house} · ${service} · ${truck} · ${time}`,
  responseTime: (text) => `Délai ${text}`,
  noLinkedRequest: 'Aucune demande liée',
  coverageTitle: 'Couverture aujourd’hui',
  driversAvailable: (n, need) => `${n} chauffeurs disponibles sur ${need}`,
  driversStandby: (n) => `${n} en disponibilité`,
  driversAbsent: (n) => `${n} absent(s)`,
  trucks: (n, total) => `${n} camions d’eau en service sur ${total}`,
  coveredHouseholds: (covered, total) => `Couverture des camions : jusqu’à ${covered} ménages sur ${total}`,
  assumption: (n) =>
    `Hypothèse de couverture : jusqu’à ${n} ménages par camion d’eau (hypothèse de l’équipe, pas des livraisons quotidiennes). L’assainissement est suivi à part.`,
  shortfall: 'Couverture insuffisante : appelez un chauffeur en disponibilité ou remettez un camion en service',
  noShortfall: 'La couverture suffit pour aujourd’hui',
  sampleBadge: 'Données d’exploitation fictives (en attente de l’API, #3)',
  jobsLink: 'Voir Emplois et formation',
  minutes: (m) => (m < 60 ? `${m} min` : m < 48 * 60 ? `${Math.round((m / 60) * 10) / 10} h` : `${Math.round(m / 1440)} jours`),
}

// TODO: community translation review — English placeholders, no invented syllabics.
const iu: OpsStrings = en

const STRINGS: Record<Lang, OpsStrings> = { en, fr, iu }

export function useOpsT(): OpsStrings {
  return STRINGS[useAppStore((s) => s.lang)]
}
