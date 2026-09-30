// cairn-cms: the public `/public` barrel. Its membership rule: every built-in public component
// that renders styled markup lives here, never on `/admin` (the admin's own view tier) and never
// on `/sveltekit` or another data-only subpath (a type or a loader belongs there instead).
// `CairnHead` stays at `./delivery/head`, since it renders no markup of its own, only document-head
// tags. `PreviewBanner` is the one component this barrel carries today: a design-agnostic notice
// for the public preview route (`loadPreview`, `/sveltekit`), not part of the admin UI.
export { default as PreviewBanner } from './PreviewBanner.svelte';
