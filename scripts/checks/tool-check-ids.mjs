// cairn-cms: the committed check-id vocabulary check-symbols.mjs resolves a doc's check-id
// candidates against. Before this file existed, this vocabulary came from a live directory walk
// over the engine's check modules at gate time; that directory is gone (the checks it ran
// moved out of the engine), so the vocabulary is a committed list instead.
//
// TOOL_CHECK_IDS names every check id the `cairn doctor` command raises. RETIRED_TOOL_CHECK_IDS names
// every id a published doc still cites that no live check raises: a deferred check (ported later)
// or a dropped one (no successor planned). Keeping both in the resolved vocabulary means a page
// quoting a retired id reads as history, not a hallucination; dropping an id from this file
// entirely, once no doc cites it, is the retirement's last step.

/** The thirteen check ids the `cairn doctor` command raises. */
export const TOOL_CHECK_IDS = [
  'config.bindings',
  'config.observability',
  'config.csrf-trusted-origins',
  'config.public-origin',
  'config.site-config',
  'config.site-record',
  'config.no-referrer-blanket',
  'config.dependency-floors',
  'admin.mount-shape',
  'config.media-bucket',
  'config.migrations',
  'auth.role-wiring',
  'ai.posture-effective',
];

/**
 * Check ids published docs still cite that no live check raises: deferred (the TypeScript
 * doctor once ran these; a later pass may bring them back to the command) or dropped (no successor
 * is planned). Kept here so a page quoting one resolves as history, not a hallucinated name.
 */
export const RETIRED_TOOL_CHECK_IDS = [
  'auth.store',
  'auth.role-vocabulary',
  'auth.email-normalization',
  'edge.https-forced',
  'email.sender-onboarded',
  'email.live-send',
  'github.app',
  'config.tidy-key',
  'admin.login-probe',
  'config.csrf-disable', // retired with tool v2: SvelteKit 3's origin check covers every route
];
