// cairn-cms: serialize a JSON-LD object into a safe inline script string. JSON.stringify does
// not escape <, >, or &, so a value containing "</script>" would close the element and inject
// markup. Escaping the three characters to their JSON unicode forms keeps the structured data
// identical for a parser while making the bytes unable to break out of the script element.
// The line separator U+2028 and paragraph separator U+2029 get the same treatment: they are
// legal inside a JSON string but unsafe in inline script text, where some parsers read them as
// line terminators, so an author pasting one into frontmatter would corrupt the JSON-LD block.
/**
 * Build the `application/ld+json` script element for `data`, escaping `<` so the JSON cannot terminate the script tag early.
 */
export function jsonLdScript(data: Record<string, unknown>): string {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `<script type="application/ld+json">${json}</script>`;
}
