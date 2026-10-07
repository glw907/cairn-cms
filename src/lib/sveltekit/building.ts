// cairn-cms: whether the current run is SvelteKit's build (prerendering) rather than a request.
// The engine asks before it touches the Worker env, since every Worker env read throws
// while a build prerenders, and before `loadPreview` would mint a page a static file could leak.

// WATCH: packages/cairn-cms-dev/src/handle.ts carries a copy of this function, since the dev
// package reaches the engine only through its public subpaths. Change the two together.
/**
 * Read SvelteKit's `building` flag without a static `$app/env` import.
 *
 * The `/sveltekit` barrel is also bundled outside SvelteKit's own build: a site can wire a single
 * export (`createD1AuditSink`, for a Cloudflare Cron handler) through Wrangler's plain esbuild pass,
 * which has no SvelteKit plugin to resolve the virtual module, so a static import anywhere in the
 * barrel's graph fails that build. esbuild resolves an unwrapped `import()` literal the same way,
 * so the import sits inside `try`/`catch`, esbuild's documented escape hatch that turns the
 * unresolvable specifier into a runtime concern. Outside a real SvelteKit build the import
 * rejects and the answer is `false`: nothing is prerendering there.
 */
export async function isBuilding(): Promise<boolean> {
  try {
    const { building } = await import('$app/env');
    return building;
  } catch {
    return false;
  }
}
