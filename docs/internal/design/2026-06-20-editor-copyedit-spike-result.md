# Editor copy-edit spike result: worker + wasm + dictionary delivery

This records the outcome of Task 1, the Phase 1 go/no-go gate. The spike ran end to end in the real
consumer build (`examples/showcase`, which consumes the package through `file:../..` and serves
`dist`), so every number below is measured from the packaged `dist`, not from `src`.

## Verdict: GO with spellchecker-wasm

The engine for the rest of Phase 1 is **spellchecker-wasm** (the SymSpell WASM build). A Web Worker
plus the wasm module plus a 1.5 MB dictionary survive the consumer SvelteKit/Vite build cleanly, the
client-side cost is a 2.1 KB gzipped worker chunk, and both heavy assets ship as fetched files that
never enter any JS bundle. The named `nspell` fallback was not needed.

## What the spike proved

A throwaway showcase route at `/spike/spellcheck` constructs the engine's spellcheck Web Worker the
same dynamic-import way CodeMirror is loaded, points it at the wasm and dictionary the consumer build
resolved, and round-trips a real `check` and a real `suggest`. The showcase E2E
(`examples/showcase/e2e/spellcheck-spike.spec.ts`) asserts all of it against the built preview
server:

- The worker constructs and reaches a `ready` state after streaming the dictionary into wasm memory.
- Both assets resolve to emitted out-of-bundle URLs (a `.wasm` and a `.txt`).
- `check` answers a batch of `{ id, word }` with `{ id, correct }`: `hello` is correct, `wrold` is
  not, so the verdict is keyed to the word and not a constant.
- `suggest` returns a ranked replacement list for `wrold` with `world` first (a single transposition).

The round trip is green in the built showcase, and the full 28-spec showcase E2E suite still passes.

## The protocol (stable for Task 3)

Task 3 builds the real Worker behind this exact protocol shape, so the CodeMirror lint source built
on top of it does not change:

- `init { wasmUrl, dictionaryUrl }` then `ready`.
- `check { seq, words: [{ id, word }] }` then `checked { seq, results: [{ id, correct }] }`.
- `suggest { seq, word }` then `suggested { seq, word, suggestions: string[] }` (ranked, the word
  itself dropped).
- `error { detail }` for an init or lookup failure, so a problem surfaces rather than hanging.

Correctness is a distance-0 self match: the check path drives `checkSpelling` with `includeSelf:
true`, so a known word returns itself at edit distance 0, and an unknown word does not. The suggest
path uses `includeSelf: false` so the list is replacements only.

## Asset-delivery mechanism: Vite `?worker` plus `?url`, assets shipped from dist

The worker module and both assets are shipped inside the package `dist` and resolved by the consumer
build, rather than streamed from a Worker route. The reasoning:

- The worker module is loaded the way CodeMirror is: a Vite `?worker` import of the package subpath
  (`@glw907/cairn-cms/components/spellcheck-worker?worker`). Vite turns it into a constructable
  `Worker`, the same dynamic-import delivery the editor already relies on, so the spellcheck side
  needs no new delivery concept.
- The wasm and the dictionary are imported with `?url`
  (`@glw907/cairn-cms/components/spellcheck-assets/spellchecker-wasm.wasm?url` and
  `.../dictionary-en-us.txt?url`). Vite emits each as a content-hashed asset file and hands back its
  URL. The worker then `fetch`es each URL and streams it into wasm memory in chunks. Neither asset is
  ever held as a JS string or inlined into a chunk.
- A Worker route (the `createMediaRoute` pattern) was the alternative for the dictionary. It was not
  needed: the `?url` path already keeps the dictionary out of every JS bundle and lets the static
  asset pipeline cache it immutably, with no runtime route, no R2 binding, and no per-request server
  work. Shipping the dictionary in `dist` also keeps the engine self-contained, which matches the
  font and admin-CSS assets that already ship the same way.

There is a precedent in the package already: the editor fonts are binary `.woff2` files committed
under `src/lib/components/fonts/` that `svelte-package` copies into `dist/components/fonts/`. The
spike assets follow that exact pattern under `src/lib/components/spellcheck-assets/`.

## The packaging change

Two `exports` subpaths were added so the consumer build can resolve the worker and the assets from
the packaged `dist`, and `spellchecker-wasm` was added as a runtime dependency. `files[]` already
contained `dist`, so no `files[]` change was needed; the assets ship because `svelte-package` copies
them into `dist/components/spellcheck-assets/`.

```jsonc
// package.json exports, added beside "./components"
"./components/spellcheck-worker": {
  "types": "./dist/components/spellcheck-worker.d.ts",
  "default": "./dist/components/spellcheck-worker.js"
},
"./components/spellcheck-assets/spellchecker-wasm.wasm": "./dist/components/spellcheck-assets/spellchecker-wasm.wasm",
"./components/spellcheck-assets/dictionary-en-us.txt": "./dist/components/spellcheck-assets/dictionary-en-us.txt",
```

A `npm run package` from the worktree root ships, verified by listing `dist`:

```
dist/components/spellcheck-worker.js                       (the worker module)
dist/components/spellcheck-assets/spellchecker-wasm.wasm   (79,105 bytes)
dist/components/spellcheck-assets/dictionary-en-us.txt     (1,583,433 bytes)
dist/components/spellcheck-assets/spellchecker-wasm-LICENSE.txt
```

One import-path note for Task 3: the worker imports the engine's class module directly
(`spellchecker-wasm/lib/browser/SpellcheckerWasm.js`), not the package's `browser/index.js`. That
index file is a UMD bundle whose prelude references `window` as the global root, which is undefined in
a Worker and threw `window is not defined`. The class module is plain CommonJS that Vite interops, so
it loads off the main thread cleanly.

## Size budget, number vs number

The dictionary chosen is the SymSpell 1-gram US English corpus
(`frequency_dictionary_en_US_60size_1M_1gram_20090715.txt`), the realistic worst case in the package
at 1.5 MB.

### Client chunk growth: 2.1 KB gzipped, target +50 KB gzipped (well under)

The spike adds exactly one new client JS chunk, the worker module:

| Client artifact            | Raw         | Gzipped    |
| -------------------------- | ----------- | ---------- |
| `spellcheck-worker-*.js`   | 5,479 B     | 2,117 B    |

That 2.1 KB gzipped is the entire JS-chunk cost the editor pays when Task 3 wires the lint source to
this worker, because the worker is loaded the lazy dynamic-import way and the dictionary and wasm are
fetched assets, not chunk content. It is far under the +50 KB gzipped ceiling. The editor's own
client chunk is untouched by this spike, since the lint source is not wired in yet; this is the
isolated delivery cost the budget cares about.

### The two heavy assets travel as fetched files, not chunk content

| Fetched asset                 | Raw          | Gzipped    |
| ----------------------------- | ------------ | ---------- |
| `spellchecker-wasm.*.wasm`    | 79,105 B     | 33,064 B   |
| `dictionary-en-us.*.txt`      | 1,583,433 B  | 711,754 B  |

Both appear as standalone files under `_app/immutable/assets/` in the client build. A grep for a
dictionary frequency line (`6801236995`, the count on the corpus's first entry) finds it in zero JS
chunks, client or server, which is the proof they are not bundled. They are fetched once, in the
Worker, on first lint, and cached immutably.

### Cloudflare Worker compressed-size limit: satisfied by construction

The showcase uses `@sveltejs/adapter-node`, not the Cloudflare adapter, so a Cloudflare Worker bundle
cannot be measured directly here. The limit (1 MB gzipped on the Free plan, 10 MB on Paid) is
satisfied by construction instead: the 1.5 MB dictionary and the 79 KB wasm are fetched assets, never
imported into any server or worker JS module, so they never count against a Worker bundle. The
evidence: the same `6801236995` grep across the built server output finds the dictionary bytes in no
server JS chunk (the only server-side copy of the worker module is the adapter's standard duplicate
of the client worker file, which is the 2.1 KB worker JS, not the dictionary). When the real
Cloudflare Worker is built in Task 3, it carries the same 2.1 KB worker JS and fetches the two assets
over HTTP, so the engine ships under the Free plan's 1 MB gzipped limit with a wide margin.

## What carries forward

- Engine locked: spellchecker-wasm. The `nspell` fallback stays documented but unused.
- Delivery locked: worker via `?worker`, assets via `?url`, both shipped from `dist`.
- Protocol locked: the `init` / `check` / `suggest` / `error` message shape above.
- The spike harness (`/spike/spellcheck` route, its `+page.ts`, and the worker stub's spike usage)
  may be removed or folded into the real Worker in Task 3. The worker module
  (`src/lib/components/spellcheck-worker.ts`) and the shipped assets are the keepers.
