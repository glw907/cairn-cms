// The live preview's sanitize floor. Carta runs with `sanitizer: false` behind the MarkdownEditor
// seam, so the admin preview pane is the one barrier between editor-authored markdown and the DOM
// (the Plan 05 locked High). DOMPurify needs a DOM, and the preview renders only in the browser
// after mount, so DOMPurify loads through a dynamic import: the module never evaluates a DOM library
// on the Worker, and a server import of this file pulls in nothing.
let purify: { sanitize(html: string): string } | null = null;

/**
 * Sanitize rendered preview HTML before it reaches `{@html}`. Strips scripts, inline event
 * handlers, and dangerous URL schemes (`javascript:`, `data:`) while keeping ordinary formatting.
 * Browser-only; resolves the same string DOMPurify would return.
 */
export async function sanitizePreviewHtml(html: string): Promise<string> {
  if (!purify) {
    const mod = await import('dompurify');
    purify = mod.default;
  }
  return purify.sanitize(html);
}
