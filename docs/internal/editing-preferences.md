# Editing preferences

drafter's final edit pass applies this file to every drafted docs page, and the draft prompt
carries it too. It holds cairn's copy-editing conventions, the ones the showcase site turns on
for its own tidy pass (`examples/showcase/src/theme/site.config.yaml`, `tidy.conventions`), and
the project's dictionary. The register and the base style guide still govern voice and structure;
this file only settles mechanics.

## Conventions

- Fixes: correct spelling and typos, doubled words, stray whitespace, plainly wrong punctuation,
  a missing sentence-start capital, and unambiguous grammar that needs a small rewording. Make the
  smallest edit that fixes the error.
- Oxford comma: use a serial comma in every list of three or more items.
- Smart quotes: use curly quotes and apostrophes in prose. Never change a quote inside a code
  span, a fenced block, raw HTML, a link destination, or front matter.

Leave everything else as the draft has it. Do not change word choice, sentence structure, or
content, and never edit markdown syntax, a code span, a fenced block, a URL, or directive syntax.

## Dictionary

These words are spelled correctly as written; keep each one's capitalization exactly. The list
copies cairn's Vale vocabulary, `.vale/styles/config/vocabularies/Cairn/accept.txt`, which is
its source: a word added there belongs here too.

AuditSink, cairn, Cloudflare, Cloudflare Email Sending, CSRF, DaisyUI, GitHub, GitHub App,
navLayout, SEO, SvelteKit, Tidy, Topo, URL, Waymark, Workers Builds.
