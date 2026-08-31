# Reproductions (`@glw907/cairn-cms/reproductions`)

This subpath is the story registry backing a `repro` fenced code block: a docs page names a story
id, and the fence resolves to a live render of the real admin component the id names, mounted with
its fixture data and driven to the state its page contract describes. It ships in the tarball
beside the docs corpus for a site that builds a docs corpus against it, notably cairn-pub; it
carries no general-purpose admin UI a site mounts on its own. The engine mounts the real component
and contains it, so an embedded story cannot act as a live admin surface. The mounted subtree is
inert, a modal dialog a story opens is marked inert as it opens, and window-level keyboard,
pointer, drag, and unload events stop before any handler sees them. Containment holds from first
paint and does not depend on a pose, which a consumer runs. An inert subtree also contributes no
node to the accessibility tree, so a screen reader reaches none of the mounted markup. Whatever alt
text a page authors for the embed is the entire accessible content of that embed, which is worth
knowing before writing it.

The embed itself stays with the site, and so does one repair the engine cannot make. A frame that
loads and focuses a control takes the focus a reader had, measured in Chromium, Firefox, and
WebKit. No attribute on the host side prevents it: `tabindex="-1"` takes the `iframe` out of the
host's tab order, `inert` also blocks hit-testing on it, and neither releases the host's focus pin
except in Firefox under `inert`. A page that embeds a story therefore records
`document.activeElement` before the frame loads and restores it after. Nothing inside the frame can
stand in for that. The `loading` attribute, a `sandbox` value if the page wants one, the `noindex`
meta tag, and the no-JavaScript fallback are the site's too. A `sandbox` value must keep
`allow-same-origin`, which the theme sync and the frame's own focus release both need.

```ts
import { getStory, ReproContext } from '@glw907/cairn-cms/reproductions';
```

The matching node-safe manifest lives one level down at
[`/reproductions/manifest`](#the-manifest-reproductionsmanifest). The TypeScript types in
`src/lib/reproductions` are the source of truth, and the export-coverage gate checks every name
here against them.

Every export on both subpaths is Unstable API: the registry is new, coupled to one consumer's
build (cairn-pub's docs), and its shape is not yet committed across minor versions.

---

## Why two subpaths

The registry splits across two entry points because its two consumers need different things from
it. A build-time gate (this engine's own `check:visuals`, and cairn-pub's fence validation at
build time) needs to read story ids, declared heights, and marker keys from a bare `node` process,
with no bundler and no Svelte runtime in the way. A docs route and this engine's own story-mount
test need the opposite: the real components, their fixture props, and the poses that drive them
into the states a page contracts to show.

`@glw907/cairn-cms/reproductions/manifest` is the node-safe half: plain data, no Svelte anywhere in
its static import graph. `@glw907/cairn-cms/reproductions` is the Svelte-importing half: component
references, fixture props, poses, and the mounting wrapper. Nothing in the manifest's module graph
may ever resolve to a `.svelte` specifier, because a single one would break both the node-safe gate
and cairn-pub's build at once. `src/tests/unit/reproductions-manifest.test.ts` holds the source
graph to that rule, and `src/tests/unit/reproductions-manifest-dist-spawn.test.ts` holds the built
`dist/reproductions/manifest.js` to it by spawning a bare `node` process against it.

---

## The story registry (`/reproductions`)

### `ReproStory`

Stability tier: Unstable API.

```ts
interface ReproStory {
  id: string;
  component: Component<Record<string, unknown>>;
  host: 'shell' | 'bare';
  shellData?: Partial<Extract<AdminShellData, { public: false }>>;
  props: Record<string, unknown>;
  context?: Record<symbol | string, unknown>;
  settle?: (root: HTMLElement) => Promise<void>;
  pose?: (root: HTMLElement, instance: ReproInstance) => Promise<void>;
  markers?: { n: number; anchor: string; key: string }[];
}
```

One registered story's full mount description, the type [`getStory`](#getstory) returns. `id`
matches exactly one [`ReproManifestEntry.id`](#repromanifestentry). `component`
is the smallest package component that contains what the story shows. `host` is `'shell'` for a
story mounted inside `CairnAdminShell` with the fixture nav layout, or `'bare'` for one mounted on
its own. `shellData` overrides fields of the fixture shell payload for a `'shell'` story whose
subject depends on shell-derived chrome (the desk pathname, the pending-publish set) rather than on
`props` alone; a `'bare'` story ignores it. `props` is the full prop bag the mounted component's own
contract takes. `context` supplies session-shaped fixture values (a signed-in editor, a capability)
as Svelte context before mounting; a component that reads no context beyond what
[`ReproContext`](#reprocontext) already supplies unconditionally leaves it unset. `settle` waits
for a client-only surface to exist at all before `pose` runs, for a story whose contracted content
does not appear in the server render. `pose` drives a state that lives in the component's own
internal state rather than a prop. Both take `root`, the element `ReproContext` mounted the story
into, never `document`: a posed dialog and the editor's fixed-position insert panel render inside
that element rather than appended to `document.body`, so a `settle` or `pose` that queries
`document` instead of `root` misses them. `pose` also takes the mounted component's own exports
(`ReproInstance`, module-internal since the retires pass unexported it, a sanctioned
`NavIcon`-class leak: a consumer reads the type as `Parameters<NonNullable<ReproStory['pose']>>[1]`),
for a story the real admin reaches by calling an exported method rather than by clicking, such as
the insert panel the editor mounts headless and opens from its toolbar. The parameter is required,
so a host that cannot supply an instance fails to compile rather than posing half a story.
`markers` are the numbered callout anchors a story exposes, mirroring its manifest entry's
`markerKeys`.

### `getStory`

Stability tier: Unstable API.

```ts
declare function getStory(id: string): ReproStory;
```

Look up a registered story by id, throwing when no story is registered under it. A `repro` fence
resolves its `story` key through this function (or the equivalent manifest lookup, for a gate that
never needs the Svelte half).

### `ReproContext`

Stability tier: Unstable API.

```ts
let { story, theme, oninstance }: {
  story: ReproStory;
  theme?: 'cairn-admin' | 'cairn-admin-dark';
  oninstance?: (instance: ReproInstance) => void;
};
```

The one mounting wrapper both a docs route and this engine's own story-mount test render a story
through, so the two can never disagree about what a story needs to render correctly. It applies
`story.context`, supplies the fixture media base and a CSRF-token getter to every mounted media
surface, hosts a `'shell'` story inside `CairnAdminShell` with the fixture nav layout, and carries
the admin stylesheet unconditionally. `theme` is the admin theme the mounting page owns; absent, it
falls back to the light admin theme. A `'bare'` story that resolves no theme root of its own (every
row except the two auth pages) gets one from `ReproContext` itself, painted with the admin surface
colors, so it renders correctly wherever it mounts rather than only inside a host that happens to
supply a theme root.

`oninstance` fires once as the mount happens, with the mounted component's own exports, the same
`ReproInstance` shape [`ReproStory`](#reprostory) describes. A host that runs poses passes it and
hands the value back to `story.pose`. A host that only renders a resting story needs none of it.
The callback runs inside the mount rather than from an effect, so a host that mounts and
immediately poses reads a real instance rather than `undefined`.

Mount `ReproContext` in a document dedicated to one reproduction, its own route inside an `iframe`,
never on a page that carries anything else. Its containment is not scoped to what it renders: it
takes over `keydown`, `pointerdown`, `dragover`, `drop`, and `beforeunload` for the whole document,
for as long as the instance lives, and it takes them over ahead of anything registered after it. On
a shared page that removes every keyboard shortcut, every control a page dismisses on pointer
press, and the unsaved-work prompt `beforeunload` raises, so an editor can lose work with no
warning.

One `ReproContext` instance mounts exactly one story for its lifetime. Its context, its manifest
lookup, and its shell payload all resolve once, from the `story` this instance first mounted; they
do not update if a later render hands it a different `story` with a different `id`. A consumer that
reuses one instance across a story change, such as a `/repro/[id]` route where the framework reuses
one page component across a param change, must key the mount on the story id
(`{#key story.id}<ReproContext {story} />{/key}`) so a story change remounts a fresh instance
instead of silently keeping the previous story's context and shell data under the new story's
component. `ReproContext` itself throws if its `story` prop's `id` ever changes in place, so a
missing `{#key}` fails loudly rather than rendering a mismatched story.

The media-base and CSRF context keys `ReproContext` sets (see
[`fixtureMediaBase`](#fixturemediabase) below) are reserved: `ReproContext` applies `story.context`
first and then sets both unconditionally, so a story's own `context` entry under either key is
shadowed by the value `ReproContext` supplies, never the other way around.

---

## The manifest (`/reproductions/manifest`)

### `ReproHeights`

Stability tier: Unstable API.

```ts
interface ReproHeights {
  column?: number;
  wide?: number;
  desktop?: number;
  narrow?: number;
}
```

The prerendered iframe height, in CSS pixels, for each embed width a docs page may ask for.
`column` is the responsive default embed, filling the docs content column. `wide` (1280px),
`desktop` (860px), and `narrow` (390px) are the three pinned widths. A width with no declared
height is a width the fence schema refuses: see [The width rule](#the-width-rule) below. Hydration
refines the shipped height against the story's measured content, so a declared height is a good
first paint, not a promise about the render.

### `ReproManifestEntry`

Stability tier: Unstable API.

```ts
interface ReproManifestEntry {
  id: string;
  heights: ReproHeights;
  markerKeys: string[];
  pose: boolean;
  host: 'shell' | 'bare';
  ownThemeRoot: boolean;
}
```

One story's node-safe description: everything a gate can check without mounting anything. `id` is
the string a `repro` fence names, `<group>/<name>`, with exactly one slash. `heights` are the
declared iframe heights above. `markerKeys` are the stable keys the page's numbered callout list
cites, one per rendered chip; empty for a story with no callouts. `pose` is whether the story needs
a post-mount step to reach the state its page contract names. `host` is `'shell'` or `'bare'`,
matching the story's own `ReproStory.host`. `ownThemeRoot` is whether the mounted component
resolves its own theme rather than inheriting the repro route's theme wrapper; true for the two
auth pages and for every `'shell'`-hosted story, since `CairnAdminShell` is itself an own-theme-root
component.

### `manifest`

Stability tier: Unstable API.

```ts
declare const manifest: ReproManifestEntry[];
```

The full registry's node-safe view, in the spec inventory's own order. Adding, removing, or
renaming an entry is a spec-level change: a consuming docs page cites these ids by name, and a
`repro` fence naming an id the installed manifest does not carry fails the consumer's build.

### `fixtureMediaBase`

Stability tier: Unstable API.

```ts
declare const fixtureMediaBase = "/repro-assets";
```

The path segment every fixture media URL mounts under on a `/repro` page: `${fixtureMediaBase}/<file>`
for a file named in [`fixtureMediaFiles`](#fixturemediafiles). Never `/media`, the real admin's
default; a fixture image never surfaces through the same path a site's live media library serves
from.

### `fixtureMediaFiles`

Stability tier: Unstable API.

```ts
declare const fixtureMediaFiles: string[];
```

The fixture media bytes' filenames, exactly as packaged under `dist/reproductions/fixtures/`. A
consuming site's own asset route enumerates this list to serve the bytes without ever importing the
Svelte-carrying `/reproductions` half of this module.

### `validateReproFence`

Stability tier: Unstable API.

```ts
declare function validateReproFence(
  body: string,
  manifest: ReproManifestEntry[],
): ReproFenceValidation;
```

Check a `repro` fence body's raw YAML against an installed manifest: the YAML parses, the required
keys are present, no unknown key rides along, `alt` names the kind and stays under the length
ceiling, `story` resolves against the installed manifest, and `width`, if given, names a width that
story's manifest entry actually declares a height for. See [The fence schema](#the-fence-schema)
below for the full rule set. One implementation backs both this engine's `check:visuals` gate and a
consuming site's build-time fence validation, so the two cannot drift apart.

### `ReproFenceValidation`

Stability tier: Unstable API.

```ts
interface ReproFenceValidation {
  issues: string[];
}
```

The result of checking one fence body: one line per rule violated, empty when the fence is
well-formed.

---

## The fence schema

A `repro` fence's body is YAML with four keys:

| Key | Required | Meaning |
| --- | --- | --- |
| `story` | yes | A registry id, `<group>/<name>`, exactly one slash. Must exist in the installed manifest. |
| `alt` | yes | The accessible name. Names the kind ("Reproduction of ...") and stays at or under 150 characters. Becomes the iframe's `title` attribute. |
| `caption` | yes | Rendered as the figure's caption. States what the render cannot show on its own. |
| `width` | no | `narrow` (390px), `desktop` (860px), or `wide` (1280px). Absent means the responsive default, filling the docs content column. |

A malformed body, an unknown key, a missing required key, an unlisted `width` value, or a `story`
the installed manifest does not carry fails validation, one issue per violated rule.

### The width rule

`width`, when given, must name a width the fence's own story declares a height for in
[`ReproHeights`](#reproheights): `validateReproFence` looks the story's manifest entry up by
`story` and checks `heights[width]` is a number. A story that cannot show its subject at some width
simply declares no height for that width, and the schema refuses any fence that pins it there.

`column` is the responsive default, not a pinnable width. A fence asks for it by omitting `width`
entirely, so naming `width: column` explicitly is refused: it would be a second way to say the one
thing omitting the key already says.
