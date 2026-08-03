// cairn-cms: the public `/components` barrel. The admin Svelte UI (Plan 05): the shell, the
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
export { default as ManageEditors } from './ManageEditors.svelte';
export { default as MarkdownEditor } from './MarkdownEditor.svelte';
export { default as NavTree } from './NavTree.svelte';
export { default as DeleteDialog } from './DeleteDialog.svelte';
export { default as RenameDialog } from './RenameDialog.svelte';
export { default as VocabularyAdmin } from './VocabularyAdmin.svelte';
export { default as WelcomeView } from './WelcomeView.svelte';
