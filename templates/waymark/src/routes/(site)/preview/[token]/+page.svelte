<!-- @component
The preview mount: the engine's `PreviewBanner` on top of the SAME article template the public
route renders, with `preview` set so it suppresses canonical, og:url, and the `.md` twin link. -->
<script lang="ts">
  import type { PageData } from './$types';
  import { PreviewBanner } from '@glw907/cairn-cms/components';
  import ArticleView from '$theme/components/ArticleView.svelte';

  let { data }: { data: PageData } = $props();
</script>

<PreviewBanner preview={data.preview} />
<ArticleView {data} preview />
