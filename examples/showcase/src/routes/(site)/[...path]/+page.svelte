<script lang="ts">
  import type { PageData } from './$types';
  import ArticleView from '$theme/components/ArticleView.svelte';

  let { data }: { data: PageData } = $props();
</script>

<ArticleView {data} />
