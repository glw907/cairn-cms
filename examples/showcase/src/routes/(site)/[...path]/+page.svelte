<script lang="ts">
  import { page } from '$app/state';
  import type { PageData } from './$types';
  import ArticleView from '$theme/components/ArticleView.svelte';

  let { data }: { data: PageData } = $props();
</script>

<ArticleView {data} titleTemplate={(title) => `${title} · ${page.data.siteName}`} />
