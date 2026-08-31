// cairn-cms: the Svelte-importing half of the live-reproduction seam.
//
// This module holds the story registry: component references, fixture props, poses, and the
// context wrapper both a docs route and the engine's own story-mount test render through. It is
// the `@glw907/cairn-cms/reproductions` subpath; the node-safe half (ids, heights, marker keys,
// per-story flags) lives on `./manifest.js`, importable from a bare `node` process. This module
// may freely import Svelte components; ./manifest.ts may never import this one.
//
// The ids, their order, and the flags come from the story inventory in cairn-pub
// docs/superpowers/specs/2026-08-15-live-reproduction-seam-design.md; the per-story mechanism
// evidence is docs/internal/record/repro-story-audit.md. Story groups register from
// ./stories/*.ts, one module per task (A4 auth, A5a editor, A5b publish, A6a media, A6b the rest),
// and this file's `stories` array grows by concatenation as each group lands.
import type { Component } from 'svelte';
import type { AdminShellData } from '../sveltekit/content-routes-core.js';
import { authStories } from './stories/auth.js';
import { editorStories } from './stories/editor.js';
import { mediaStories } from './stories/media.js';
import { publishStories } from './stories/publish.js';
import { siteStories } from './stories/site.js';

/**
 * A mounted story component's own exports, the handle a pose reaches a component method through.
 *
 * Untyped by design: each story knows which component it mounts and casts to that component's own
 * exported signature at the one call site that uses it, which is cheaper than teaching this
 * interface every mountable component's exports.
 *
 * Module-internal (the retires pass, Task 2 retired its export, a sanctioned NavIcon-class leak,
 * per the F-1 hybrid ruling, r4-rederivation section 7); `ReproStory.pose` below still names it,
 * and a consumer reads it structurally as `Parameters<NonNullable<ReproStory['pose']>>[1]`.
 */
type ReproInstance = Record<string, unknown>;

/**
 * One story's full mount description: a manifest entry plus everything a mounting context needs
 * to render it, which no node-safe module can carry.
 */
export interface ReproStory {
  /** The id a `repro` fence names, matching exactly one `manifest.ts` entry. */
  id: string;
  /**
   * The smallest package component that contains what the story shows. Story modules reach a
   * component not on the `/components` barrel through a relative source import; see the audit's
   * "The export question" for why that stays unexported.
   */
  component: Component<Record<string, unknown>>;
  /** Whether the story renders inside `CairnAdminShell` with the fixture `navLayout`, or on its own. */
  host: 'shell' | 'bare';
  /**
   * The fields of the fixture shell payload this story overrides, for a `shell` story whose
   * subject is chrome the shell derives from its own load data rather than from `story.props`: the
   * desk pathname (`isDeskRoute` reads exactly three segments with a declared concept in the
   * second, and off that path the shell renders office chrome instead, which moves the sidebar
   * breakpoint and drops the narrow band compaction) or the pending-publish set (the topbar's
   * "Publish site (N)" trigger and its confirm dialog render only while `pendingEntries` resolves
   * non-empty). `ReproContext` merges this once, non-reactively, over its own fixture payload
   * before the first render; a story for which the office-default payload already renders
   * correctly leaves it absent. Ignored by a `bare` story.
   */
  shellData?: Partial<Extract<AdminShellData, { public: false }>>;
  /** The full prop bag the component's own contract takes, not only `data` and `form`. */
  props: Record<string, unknown>;
  /**
   * Session-shaped fixture values `ReproContext` applies as Svelte context before mounting (a
   * signed-in editor, a capability). Absent when the mounted component reads no context beyond
   * what `ReproContext` already supplies unconditionally (the media base, the CSRF getter).
   */
  context?: Record<symbol | string, unknown>;
  /**
   * A post-mount wait for the contracted surface to exist at all, run before {@link ReproStory.pose}.
   * Several stories show something no server render contains: `MarkdownEditor` renders a hidden
   * input, an empty div, and a fallback textarea until CodeMirror arrives through dynamic imports
   * in `onMount`, and `publish/pending-list` builds its trigger and dialog inside an `{#await}` with
   * no pending branch. A props-only story has nothing else to tell a capture to wait, so an early
   * frame would show the fallback rather than the face the page names. Absent when the story's
   * contracted surface is in the server render.
   */
  settle?: (root: HTMLElement) => Promise<void>;
  /**
   * A post-mount step that drives a state that lives in internal component state rather than a
   * prop (an opened dialog, a selection). Absent when the resting prop bag already shows the
   * contracted state.
   *
   * The second argument is the mounted component's own exports, which `ReproContext` hands its
   * host through `oninstance`. A pose takes it when the real admin reaches that state by calling
   * an exported method rather than by clicking something (`media/insert-panel` is the case that
   * forced it: the real editor mounts the popover headless and opens it from the toolbar's icon
   * button, so a click-only pose had to render a trigger button that exists nowhere in `/admin`).
   * It is a required parameter so a host that cannot supply it fails to type-check rather than
   * posing half the story.
   */
  pose?: (root: HTMLElement, instance: ReproInstance) => Promise<void>;
  /**
   * The numbered callout markers this story's manifest entry declares (empty array on the
   * manifest entry means this field is absent here too). Keys mirror `manifest.ts`'s
   * `markerKeys` exactly; anchors resolve against the mounted DOM after mount and pose.
   */
  markers?: { n: number; anchor: string; key: string }[];
}

/**
 * The registered stories, in manifest order: the full 25. Module-internal (the retires pass,
 *  batch 1c retired its export); `getStory` is the seam a consumer, including
 *  `src/tests/component/reproductions-stories.test.ts`, reaches one through.
 */
const stories: ReproStory[] = [
  ...authStories,
  ...editorStories,
  ...publishStories,
  ...mediaStories,
  ...siteStories,
];

/**
 * Look up a registered story by id.
 * @param id - a story id, matching a `manifest.ts` entry
 * @returns the matching story
 * @throws when no story is registered under `id`
 */
export function getStory(id: string): ReproStory {
  const story = stories.find((entry) => entry.id === id);
  if (!story) throw new Error(`No reproduction story registered for id "${id}"`);
  return story;
}

/** The one mounting wrapper both a docs route and the engine's story-mount test render a story through. */
export { default as ReproContext } from './ReproContext.svelte';
