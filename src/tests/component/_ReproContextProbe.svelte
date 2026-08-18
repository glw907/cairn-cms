<script module lang="ts">
  /** The context key `reproductions-stories.test.ts` uses to prove a story's own `context` entries
   *  reach the mounted component, distinct from the module-level keys ReproContext supplies
   *  unconditionally. */
  export const PROBE_CONTEXT_KEY = Symbol('reproductions-context-probe');
</script>

<!--
@component
Test-only probe for `ReproContext`: reads the media-base and CSRF contexts `ReproContext`
supplies unconditionally, plus one context entry a story itself declares, and renders each as
text so a test can assert on them without reaching into Svelte internals.
-->
<script lang="ts">
  import { getContext } from 'svelte';
  import { MEDIA_BASE_CONTEXT_KEY } from '../../lib/components/media-base-context.js';
  import { CSRF_CONTEXT_KEY } from '../../lib/components/csrf-context.js';

  const mediaBase = getContext<string | undefined>(MEDIA_BASE_CONTEXT_KEY);
  const csrf = getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY);
  const storyContextValue = getContext<string | undefined>(PROBE_CONTEXT_KEY);
</script>

<p data-testid="media-base">{mediaBase}</p>
<p data-testid="csrf">{csrf?.()}</p>
<p data-testid="story-context">{storyContextValue}</p>
