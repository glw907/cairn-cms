// The shared admin shell's load: the chrome (nav, user, theme, streamed pending count) for every
// /admin/** route, including a developer's own custom screens. The per-view catch-all load no longer
// carries chrome; it rides this one layout load instead.
import { admin } from '$chassis/cairn.server.js';

export const load = admin.shellLoad;
