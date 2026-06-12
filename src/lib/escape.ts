// cairn-cms: the one HTML text escape. A leaf module with no imports, so the email builder and
// the edge-served admin pages share it without either arm reaching into the other.

/** Escape the five HTML-significant characters for text and quoted attribute values. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
