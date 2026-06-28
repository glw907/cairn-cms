# Configure rendering

This guide wires the path from an author's markdown to the HTML your site delivers.

## Prerequisites

- An adapter with a `render` method. If you have not built one yet, start from [Define an adapter and schema](./define-an-adapter-and-schema.md), which sets up `cairn.config.ts` and leaves `render` pointing here.
- The package installed (`@glw907/cairn-cms`).

This guide assumes a running cairn site whose adapter you want to wire for rendering.

## Steps

1. **Build the renderer with `createRenderer`.** It returns `renderMarkdown` plus the remark and rehype plugin arrays (so the admin editor preview can reuse the same pipeline). If your site is a plain-prose blog, call `createRenderer()` with no argument; it defaults to the empty registry and still runs the full markdown-to-HTML pipeline. The showcase passes its registry because it ships directive components:

   ```ts
   import { createRenderer, defineRegistry } from '@glw907/cairn-cms';

   const registry = defineRegistry({ components: [callout, alert] });
   const { renderMarkdown } = createRenderer(registry);
   ```

   For the signature and the `RendererOptions` it accepts, see [`createRenderer`](../reference/core.md#createrenderer).

2. **Forward the adapter's `render` to `renderMarkdown`.** Your adapter exposes one `render` method, and it delegates to the renderer you just built:

   ```ts
   // examples/showcase/src/lib/cairn.config.ts
   render: ({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia }),
   ```

3. **Register components only if the site uses directive components.** A component is a named block an author inserts in markdown that the registry turns into custom markup. The showcase registers two, `callout` and `alert`, through `defineRegistry`. Each component declares its attributes, slots, and a `build(ctx)` function that returns the hast for that block. Inside `build`, `ctx` exposes the parsed attributes and slot content, so `ctx.slot('title')` reads an inline slot and `ctx.items('points')` reads a repeatable one. If your site has no components, skip this step and call `createRenderer()` with no argument. For the full `build(ctx)` contract and the directive grammar an author writes, see [the core reference](../reference/core.md#defineregistry).

4. **Know the sanitize floor is on by default.** You do not have to enable it. The pipeline runs author HTML through a `rehype-sanitize` floor before delivery (author markdown can carry raw HTML, and a `<script>` tag or a `javascript:` link would otherwise run in a visitor's browser). The floor is extend-only: the `sanitizeSchema` option receives the safe base allowlist and returns the schema to use, so you can add benign tags your site needs but cannot weaken the dangerous strip. For the keep, strip, and rewrite detail, see [the render sanitize floor](../explanation/render-safety.md).

5. **Deliver the rendered HTML.** `render` resolves to an HTML string, which you render with Svelte's `{@html}`:

   ```svelte
   {@html renderedBody}
   ```

   The floor has already cleaned this HTML, so the `{@html}` is safe for author-supplied content.

## Verify

The adapter's `render` turns a post body into HTML, and a registered component renders through the registry. To prove the component path, render `examples/showcase/src/content/posts/2026-03-10-callout.md`. Its body opens a `::::callout[Heads up]{tone="warning" icon="snowflake"}` directive with a nested `:::points` slot, and `createRenderer(registry)` dispatches that directive to the `callout` component's `build(ctx)`. You should get the callout's `<aside>` markup, not the literal directive text. A post with no directive renders as ordinary prose through the same pipeline.

## See also

- [Core reference](../reference/core.md#createrenderer) for [`createRenderer`](../reference/core.md#createrenderer) and [`defineRegistry`](../reference/core.md#defineregistry), the exact signatures behind this guide.
- [The security model](../explanation/security-model.md#render-safety) for why the floor exists and the documented attribute-sink residual in component `build()` output.
- [The render sanitize floor](../explanation/render-safety.md) for the keep, strip, and rewrite detail.
- [The content model](../explanation/content-model.md) for where rendering sits in the flow from files to delivered HTML.
