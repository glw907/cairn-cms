# Configure rendering

Goal: configure how an author's markdown becomes the HTML the site delivers.

## Prerequisites

- An adapter with a `render` method. If you have not built one yet, start from [Define an adapter and schema](./define-an-adapter-and-schema.md), which sets up `cairn.config.ts` and leaves `render` pointing here.
- The package installed (`@glw907/cairn-cms`).

This guide assumes a running cairn site whose adapter you want to wire for rendering.

## Steps

1. **Build the renderer with `createRenderer`.** It returns `renderMarkdown` plus the remark and rehype plugin arrays, so the admin editor preview can reuse the same pipeline. A plain-prose blog needs no argument: `createRenderer()` defaults to the empty registry and still runs the full markdown-to-HTML pipeline. The showcase passes its registry because it ships directive components:

   ```ts
   import { createRenderer, defineRegistry } from '@glw907/cairn-cms';

   const registry = defineRegistry({ components: [callout, alert] });
   const { renderMarkdown } = createRenderer(registry);
   ```

   For the signature and the `RendererOptions` it accepts, see [`createRenderer`](../reference/core.md#createrenderer).

2. **Forward the adapter's `render` to `renderMarkdown`.** The adapter exposes one `render` method, and it delegates to the renderer you just built:

   ```ts
   // examples/showcase/src/lib/cairn.config.ts
   render: (md, opts) => renderMarkdown(md, opts),
   ```

3. **Register components only if the site uses directive components.** A component is a named block an author inserts in markdown that the registry turns into custom markup. The showcase registers two, `callout` and `alert`, through `defineRegistry`. Each component declares its attributes, slots, and a `build(ctx)` function that returns the hast for that block. `ctx` exposes the parsed attributes and slot content, so `ctx.slot('title')` reads an inline slot and `ctx.items('points')` reads a repeatable one. A site without components skips this step and calls `createRenderer()` with no argument. For the full `build(ctx)` contract and the directive grammar an author writes, see [the core reference](../reference/core.md#defineregistry).

4. **Know the sanitize floor is on by default.** The pipeline runs author HTML through a `rehype-sanitize` floor before delivery, because author markdown can carry raw HTML and a `<script>` tag or a `javascript:` link would otherwise run in a visitor's browser. The floor is extend-only. The `sanitizeSchema` option receives the safe base allowlist and returns the schema to use, so a site can add benign tags it needs but cannot weaken the dangerous strip. For the keep, strip, and rewrite detail, see [the render sanitize floor](../explanation/render-safety.md).

5. **Deliver the rendered HTML.** `render` resolves to an HTML string, which a site renders with Svelte's `{@html}`:

   ```svelte
   {@html renderedBody}
   ```

   The floor has already cleaned this HTML, so the `{@html}` is safe for author-supplied content.

## Verify

The showcase renders a post body to HTML through the adapter's `render`, and a registered component renders through the registry. The post `examples/showcase/src/content/posts/2026-03-10-callout.md` proves the component path: its body opens a `::::callout[Heads up]{tone="warning" icon="snowflake"}` directive with a nested `:::points` slot, and `createRenderer(registry)` dispatches that directive to the `callout` component's `build(ctx)`. Render that post and you get the callout's `<aside>` markup, not the literal directive text. A post with no directive renders as ordinary prose through the same pipeline.

## See also

- [Core reference](../reference/core.md#createrenderer) for [`createRenderer`](../reference/core.md#createrenderer) and [`defineRegistry`](../reference/core.md#defineregistry), the exact signatures behind this guide.
- [The security model](../explanation/security-model.md#render-safety) for why the floor exists and the documented attribute-sink residual in component `build()` output.
- [The render sanitize floor](../explanation/render-safety.md) for what the floor keeps, strips, and rewrites.
- [The content model](../explanation/content-model.md) for where rendering sits in the flow from files to delivered HTML.
