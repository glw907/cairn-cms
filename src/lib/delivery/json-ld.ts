// cairn-cms: serialize a JSON-LD object into a safe inline script string. JSON.stringify does
// not escape <, >, or &, so a value containing "</script>" would close the element and inject
// markup. Escaping the three characters to their JSON unicode forms keeps the structured data
// identical for a parser while making the bytes unable to break out of the script element.
export function jsonLdScript(data: Record<string, unknown>): string {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return `<script type="application/ld+json">${json}</script>`;
}
