import type { Strings } from './en'

// Inuktitut strings.
// Do NOT invent syllabics. Until a community translator reviews these,
// every value is the English text as a placeholder.

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
  offline: 'Offline — showing saved data', // TODO: community translation review
  comingSoon: 'Coming soon', // TODO: community translation review
  placeholder: {
    resident: 'Your tank level, next delivery, and water safety status.', // TODO: community translation review
    driver: 'Your delivery route for today.', // TODO: community translation review
    dispatcher: 'Tank forecasts, routing, and illness reports across zones A to F.', // TODO: community translation review
    parts: 'Water system parts and what to order before the next sealift.', // TODO: community translation review
  },
  householdsLoaded: 'households loaded', // TODO: community translation review
  loadError: 'Could not load data.', // TODO: community translation review
  footer: 'Sample data for demonstration', // TODO: community translation review
}
