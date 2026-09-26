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
    resident: 'Resident', // TODO: community translation review
    driver: 'Driver', // TODO: community translation review
    dispatcher: 'Dispatcher', // TODO: community translation review
    parts: 'Parts', // TODO: community translation review
  },
  online: 'Online', // TODO: community translation review
  offline: 'Offline', // TODO: community translation review
  offlineBanner: 'Offline, showing last saved info', // TODO: community translation review
  savedAt: en.savedAt, // TODO: community translation review
  comingSoon: 'Coming soon', // TODO: community translation review
  placeholder: {
    resident: 'Your tank level, next delivery, and water safety status.', // TODO: community translation review
    driver: 'Your delivery route for today.', // TODO: community translation review
    dispatcher: 'Tank forecasts, routing, and illness reports across zones A to F.', // TODO: community translation review
    parts: 'Water system parts and what to order before the next sealift.', // TODO: community translation review
  },
  householdsLoaded: 'households loaded', // TODO: community translation review
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
}
