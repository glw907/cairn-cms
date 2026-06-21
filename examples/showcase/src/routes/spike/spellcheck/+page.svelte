<!--
@component
The Task 1 spellcheck delivery spike harness. It constructs the engine's spellcheck Web Worker the
same dynamic-import way CodeMirror is loaded, points it at the wasm and dictionary the consumer build
resolved out-of-bundle, then round-trips a `check` and a `suggest` against real words. The results
land in the DOM so the showcase E2E can assert the protocol crossed the built consumer boundary.

The worker and both assets resolve from the PACKAGED dist (the showcase consumes @glw907/cairn-cms
via file:../.. and serves dist), not from src, which is the packaging question this spike answers.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  // The worker module ships from dist/components/spellcheck-worker.js. Vite's ?worker suffix turns
  // the package subpath into a constructable Worker, the dynamic-import delivery path CodeMirror uses.
  import SpellcheckWorker from '@glw907/cairn-cms/components/spellcheck-worker?worker';
  // The wasm and the 1.5MB dictionary resolve to emitted asset URLs through ?url, so they ship as
  // fetched files and never enter any JS chunk.
  import wasmUrl from '@glw907/cairn-cms/components/spellcheck-assets/spellchecker-wasm.wasm?url';
  import dictionaryUrl from '@glw907/cairn-cms/components/spellcheck-assets/dictionary-en-us.txt?url';

  let status = $state('starting');
  let ready = $state(false);
  let checkResult = $state('');
  let suggestResult = $state('');
  let errorDetail = $state('');

  onMount(() => {
    const worker = new SpellcheckWorker();

    worker.addEventListener('message', (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'ready') {
        ready = true;
        status = 'ready';
        // A correct word and a misspelling, so the verdict is not a constant.
        worker.postMessage({
          type: 'check',
          seq: 1,
          words: [
            { id: 1, word: 'hello' },
            { id: 2, word: 'wrold' },
          ],
        });
        worker.postMessage({ type: 'suggest', seq: 2, word: 'wrold' });
      } else if (message.type === 'checked') {
        checkResult = JSON.stringify(message.results);
      } else if (message.type === 'suggested') {
        suggestResult = JSON.stringify(message.suggestions);
      } else if (message.type === 'error') {
        errorDetail = message.detail;
        status = 'error';
      }
    });

    worker.postMessage({ type: 'init', wasmUrl, dictionaryUrl });

    return () => worker.terminate();
  });
</script>

<h1>Spellcheck delivery spike</h1>
<p data-testid="status">{status}</p>
<p data-testid="ready">{ready ? 'yes' : 'no'}</p>
<p data-testid="wasm-url">{wasmUrl}</p>
<p data-testid="dictionary-url">{dictionaryUrl}</p>
<p data-testid="check-result">{checkResult}</p>
<p data-testid="suggest-result">{suggestResult}</p>
<p data-testid="error-detail">{errorDetail}</p>
