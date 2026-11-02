// cairn-cms: the public `/admin` barrel. The three components a site mounts: `CairnAdmin`, the one
// facade that renders every built-in view; `CairnAdminShell`, the frame a custom screen renders
// inside; and `CsrfField`, the token input every posting form carries. The views and their composed
// parts stay internal to the engine, reached through `CairnAdmin`. A general-purpose,
// domain-agnostic primitive (a formatter, a table shell, a labeled input) belongs on
// `/admin-toolkit` instead. The Warm Stone theme ships as a CSS side effect imported by the
// components that set `data-theme="cairn-admin"`.
export { default as CairnAdmin } from './CairnAdmin.svelte';
// WATCH: check:tool-heuristics greps this exact export for the Go tool's admin.mount-shape
// heuristic, which matches a site's source on the literal name CairnAdminShell.
export { default as CairnAdminShell } from './CairnAdminShell.svelte';
export { default as CsrfField } from './CsrfField.svelte';
