// cairn-cms: the public `/components` barrel. The admin Svelte UI: the shell, the
// per-view screens `CairnAdmin` switches between, and the composed dialogs and fields those
// screens mount. The membership rule is exact for the view tier: every view `CairnAdmin` can
// render is individually mountable here, so a site on the advanced per-route mounting reaches the
// same component the single-mount facade would have rendered. A general-purpose, domain-agnostic
// primitive (a formatter, a table shell, a labeled input) belongs on `/admin-toolkit` instead, even
// one this barrel's own screens compose internally; this barrel is for the admin's OWN views and
// their composed parts, never a reusable building block a site's custom screen would reach for on
// its own. The Warm Stone theme ships as a CSS side effect imported by the components that set
// `data-theme="cairn-admin"`.
export { default as CairnAdmin } from './CairnAdmin.svelte';
export { default as CairnAdminShell } from './CairnAdminShell.svelte';
export { default as LoginPage } from './LoginPage.svelte';
export { default as ConfirmPage } from './ConfirmPage.svelte';
export { default as CsrfField } from './CsrfField.svelte';
export { default as ConceptList } from './ConceptList.svelte';
export { default as CairnMediaLibrary } from './CairnMediaLibrary.svelte';
export { default as CairnTidySettings } from './CairnTidySettings.svelte';
export { default as HelpHome } from './HelpHome.svelte';
export { default as EditPage } from './EditPage.svelte';
export { default as CairnHistory } from './CairnHistory.svelte';
export { default as ManageEditors } from './ManageEditors.svelte';
export { default as MarkdownEditor, type EditorApi } from './MarkdownEditor.svelte';
// TidyApi, ImagePlaceholderApi, and FormatKind are structural members of EditorApi (its `tidy`,
// `imagePlaceholders`, and `format` fields), so a consumer that types a held `EditorApi` grant
// needs them named, not just reachable through property access. editor-tidy.ts and
// editor-placeholder.ts are dynamically-imported-only editor modules (the CodeMirror-off-the-server
// boundary); a bare `export type { ... } from` re-export is fully erased at compile time (no JS
// import emitted, unlike a value import), so it never pulls the module into a consumer's bundle.
export type { TidyApi } from './editor-tidy.js';
export type { ImagePlaceholderApi } from './editor-placeholder.js';
export type { FormatKind } from './markdown-format.js';
export { default as NavTree } from './NavTree.svelte';
export { default as DeleteDialog } from './DeleteDialog.svelte';
export { default as RenameDialog } from './RenameDialog.svelte';
export { default as VocabularyAdmin } from './VocabularyAdmin.svelte';
export { default as WelcomeView } from './WelcomeView.svelte';
// PreviewBanner is the one exception to this barrel's admin-only membership rule: a design-
// agnostic notice for the PUBLIC preview route (previewLoad, /sveltekit), not part of the admin
// UI. It lives here because /components is the library's one Svelte-component barrel, not because
// it belongs to the admin view tier.
export { default as PreviewBanner } from './PreviewBanner.svelte';
