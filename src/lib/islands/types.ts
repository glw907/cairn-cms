// cairn-cms islands (@glw907/cairn-cms/islands): the type contract shared by the adapter and the client
// runtime. Kept in its runtime-free module so the adapter types can import it without pulling
// Svelte's mount() into the server graph.
import type { Component } from 'svelte';

/**
 * A site's island components, keyed by directive name. Each value is the live Svelte component
 *  {@link hydrateIslands} mounts over the matching `hydrate` directive's static fallback. The props a
 *  component receives are the directive's declared scalar attributes (see the island boundary contract).
 * @remarks
 * The props are author-written and untrusted. The pipeline attribute-escapes them on emit and the
 * runtime `JSON.parse`s them, which is safe only because the value never enters a script context. An
 * island component must bind props to text only, and never route one into a sink: Svelte's raw-HTML tag, an `href`
 * or `src` that could carry a `javascript:` scheme, or an inline `style`. The engine guarantees only
 * that a prop arrives as escaped data.
 * @public
 */
export type IslandRegistry = Record<string, Component<Record<string, unknown>>>;
