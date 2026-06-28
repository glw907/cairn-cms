// cairn-cms islands (@glw907/cairn-cms/islands): the type contract shared by the adapter and the client
// runtime. Kept in its own runtime-free module so the adapter types can import it without pulling
// Svelte's mount() into the server graph.
import type { Component } from 'svelte';

/**
 * A site's island components, keyed by directive name. Each value is the live Svelte component
 *  {@link hydrateIslands} mounts over the matching `hydrate` directive's static fallback. The props a
 *  component receives are the directive's declared scalar attributes (see the island boundary contract).
 */
export type IslandRegistry = Record<string, Component<Record<string, unknown>>>;
