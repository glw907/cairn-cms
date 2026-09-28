# The public components (`@glw907/cairn-cms/public`)

This subpath holds every built-in public component that renders styled markup: a component for a
page a site's own visitors reach, never the admin's own view tier (see [the admin
components](./admin.md) for that side of the split). `CairnHead` stays at
[`/delivery/head`](./delivery.md#cairnhead), since it renders no markup of its own, only
document-head tags. `PreviewBanner` is the one component this barrel carries today.

```ts
import { PreviewBanner } from '@glw907/cairn-cms/public';
```

---

## Public preview

`PreviewBanner` is a design-agnostic status notice for a shared preview link. See [Public
preview](./sveltekit.md#public-preview) for the `loadPreview` seam it pairs with, and [Share a
draft preview](../extend/share-a-draft-preview.md) for the full walkthrough.

### `PreviewBanner`

Stability tier: Extension API.

```ts
let { preview, formatExpiry }: { preview: PreviewData['preview']; formatExpiry?: (iso: string) => string };
```

A status notice for a shared preview link, driven only by the `preview` field
[`loadPreview`](./sveltekit.md#loadpreview) adds to its data. It renders one of two states and
nothing else: no fetch, no internal state, no interactivity. `state: 'draft'` names the expiry so
the holder knows the link ages out; `state: 'published'` reports only that the preview has ended,
since a discarded edit and a published entry both reach this state and the copy must never claim
the draft went live (false for the discard case). It links the live permalink when `preview.published`
is set, and renders no link when it's `null` (a discarded new entry, which never had a live page).
A site may ignore this component entirely and render its own banner from the same metadata; this is
only the default treatment a getting-started site mounts.

The expiry renders inside a `<time datetime>` element, formatted by default as a fixed,
locale-independent `YYYY-MM-DD HH:MM UTC` string rather than the visitor's own locale: the same
formatter runs during SSR and hydration, so a Worker whose runtime locale or timezone differs from
the browser's own cannot render two different strings and cause a hydration mismatch. Pass the
optional `formatExpiry` prop to render the expiry in a site's own fixed date vocabulary instead.

The four custom properties the component's default palette reads
(`--cairn-preview-bg`/`-fg`/`-border`/`-link`) are the site-override seam: they fall back to
literal light- and dark-mode colors switched only by `prefers-color-scheme`, the OS-level signal.
A site that themes by its own toggle (a `data-theme` attribute, a class) declares all four in its
own light root and in both its `prefers-color-scheme: dark` and its own dark selector, so the
banner follows the toggle rather than the OS preference; see [Override the banner's
palette](../extend/share-a-draft-preview.md#override-the-banners-palette) for a worked example.

```svelte
<script lang="ts">
  import { PreviewBanner } from '@glw907/cairn-cms/public';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<PreviewBanner preview={data.preview} />
```
