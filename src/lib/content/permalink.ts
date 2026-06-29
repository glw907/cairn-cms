// cairn-cms: `permalink` now lives in the url-policy module (taxonomy Plan 2, the URL single-home
// consolidation). This re-export keeps the existing import path stable so no call site changes.
export { permalink } from './url-policy.js';
