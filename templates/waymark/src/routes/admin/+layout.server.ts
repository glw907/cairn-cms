// The shared admin shell's load: the chrome (nav, user, theme, streamed pending count) for every
// /admin/** route, including a developer's own custom screens. Every per-view load rides this one
// layout load for chrome and carries only its own view data.
import { admin } from '$chassis/cairn.server.js';

export const load = admin.shellLoad;
