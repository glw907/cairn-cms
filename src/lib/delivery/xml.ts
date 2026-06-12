// cairn-cms: the one XML text escape the feed and sitemap builders share. The strongest of the
// two copies it replaced (the old sitemap copy skipped quotes), so both documents stay safe in
// element text and double-quoted attributes.

/** Escape the XML-significant characters for element text and double-quoted attribute values. */
export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
