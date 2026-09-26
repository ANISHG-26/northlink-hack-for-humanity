import type { Strings } from './en'
import { en } from './en'

// Inuktitut strings.
// Do NOT invent syllabics. Until a community translator reviews these,
// every value is the English text as a placeholder.
// TODO: community translation review — every string in this file.

export const iu: Strings = {
  appName: 'Northlink', // TODO: community translation review
  tagline: 'Linking water to every house', // TODO: community translation review
  language: 'Language', // TODO: community translation review
  tabs: {
    resident: 'My home', // TODO: community translation review
    driver: 'Driver', // TODO: community translation review
    dispatcher: 'Staff', // TODO: community translation review
    parts: 'Parts', // TODO: community translation review
    jobs: 'Jobs', // TODO: community translation review
  },
  online: 'Online', // TODO: community translation review
  offline: 'Offline', // TODO: community translation review
  offlineBanner: 'Offline, showing last saved info', // TODO: community translation review
  savedAt: en.savedAt, // TODO: community translation review
  loadError: 'Could not load data.', // TODO: community translation review
  retry: 'Try again', // TODO: community translation review
  loading: 'Loading…', // TODO: community translation review
  footer: 'Sample data for demonstration', // TODO: community translation review

  today: 'today', // TODO: community translation review
  tomorrow: 'tomorrow', // TODO: community translation review

  // English placeholders (reused from en.ts) until reviewed.
  safety: en.safety, // TODO: community translation review
  water: en.water, // TODO: community translation review
  delivery: en.delivery, // TODO: community translation review
  level: en.level, // TODO: community translation review
  report: en.report, // TODO: community translation review
  qr: en.qr, // TODO: community translation review
  driver: en.driver, // TODO: community translation review
  dispatcher: en.dispatcher, // TODO: community translation review
  parts: en.parts, // TODO: community translation review
  nav: en.nav, // TODO: community translation review
  footerKiujik: en.footerKiujik, // TODO: community translation review
  demoReset: en.demoReset, // TODO: community translation review
  demoResetDone: en.demoResetDone, // TODO: community translation review
  demoResetHelp: en.demoResetHelp, // TODO: community translation review
  tanks: en.tanks, // TODO: community translation review
  sensor: en.sensor, // TODO: community translation review
  staff: en.staff, // TODO: community translation review
  jobs: en.jobs, // TODO: community translation review
  home: en.home, // TODO: community translation review
  ref: en.ref, // TODO: community translation review
}
