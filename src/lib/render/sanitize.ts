// The live preview's sanitize floor. The MarkdownEditor edits raw markdown and never sanitizes,
// so the admin preview pane is the one barrier between editor-authored markdown and the DOM.
// DOMPurify needs a DOM, and the preview renders only in the browser after mount, so DOMPurify
// loads through a dynamic import: the module never evaluates a DOM library on the Worker, and a
// server import of this file pulls in nothing.
let purify: { sanitize(html: string, config?: Record<string, unknown>): string; addHook(event: string, cb: (node: Element) => void): void } | null = null;

/**
 * Sanitize rendered preview HTML before it reaches `{@html}`. Strips scripts, inline event
 * handlers, and dangerous URL schemes (`javascript:`, `data:`) while keeping ordinary formatting.
 * Also forces `rel="noopener noreferrer"` on any anchor with `target="_blank"` to prevent
 * reverse-tabnabbing. Browser-only; resolves the same string DOMPurify would return.
 */
export async function sanitizePreviewHtml(html: string): Promise<string> {
  if (!purify) {
    const mod = await import('dompurify');
    purify = mod.default;
    purify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }
  // ADD_ATTR: ['target'] allows target="_blank" through so the afterSanitizeAttributes hook
  // can enforce rel="noopener noreferrer" on those anchors before they reach the DOM.
  return purify.sanitize(html, { ADD_ATTR: ['target'] });
}
