<!--
@component
Test harness: CairnAdminShell with a public payload wrapping LoginPage, the way the single mount
renders the login route. It lets a test count the head metas the two components emit together.
-->
<script lang="ts">
  import CairnAdminShell from '../../lib/admin/CairnAdminShell.svelte';
  import LoginPage from '../../lib/admin/LoginPage.svelte';
</script>

<CairnAdminShell data={{ public: true as const, siteName: 'Test Site', theme: 'cairn-admin' as const }}>
  <LoginPage data={{ siteName: 'Test Site', error: null, csrf: 'csrf-tok' }} form={null} />
</CairnAdminShell>
