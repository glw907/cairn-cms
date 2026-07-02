// cairn-cms: the showcase's one build-foldable dev-backend gate, read by hooks.server.ts,
// cairn.server.ts, and the three /test fixture routes. `dev` and `import.meta.env` both fold to a
// literal at build time, so a default `npm run build` collapses this module-level constant to
// `false`, which eliminates every `if (devBackendEnabled)` branch (and its dynamic
// `@glw907/cairn-cms-dev` import) from the deployable bundle; the e2e workflow greps the built
// Worker for the dev package's names to prove the fold held. Keep every call site reading this
// exported constant directly rather than wrapping it in another function call, so the fold has one
// module boundary to survive, not two.
import { dev } from '$app/environment';

/**
 * True when the dev backend should activate: a dev build or the e2e build's
 * `VITE_CAIRN_E2E=1` flag, and the operator opted in with `CAIRN_DEV_BACKEND=1`.
 */
export const devBackendEnabled =
  (dev || import.meta.env.VITE_CAIRN_E2E === '1') && process.env.CAIRN_DEV_BACKEND === '1';
