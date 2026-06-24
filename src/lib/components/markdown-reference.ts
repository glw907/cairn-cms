// The one Markdown cheat-sheet table, the single source the editor's Markdown help dialog and the
// Help home both render, so the two surfaces cannot drift. Each row pairs the literal syntax an
// author types with a plain gloss of what it makes, grouped so the Help home can show the everyday
// rows (text and links) and the dialog can show every group. Mirrors editor-shortcuts.ts.

/** One cheat-sheet row: the literal syntax, a plain gloss, and the group it belongs to. */
export interface MarkdownReferenceRow {
  syntax: string;
  makes: string;
  group: 'text' | 'links' | 'blocks';
}

/** The cheat-sheet vocabulary, everyday rows first: the five text, the four links, then the blocks. */
export const markdownReference: MarkdownReferenceRow[] = [
  { syntax: '## Heading', makes: 'A heading', group: 'text' },
  { syntax: '**bold**', makes: 'Bold text', group: 'text' },
  { syntax: '*italic*', makes: 'Italic text', group: 'text' },
  { syntax: '> quote', makes: 'A quote', group: 'text' },
  { syntax: '`code`', makes: 'Inline code', group: 'text' },
  { syntax: '[text](url)', makes: 'A link', group: 'links' },
  { syntax: '[[page-name]]', makes: 'A link to one of your pages', group: 'links' },
  { syntax: '- item', makes: 'A bulleted list', group: 'links' },
  { syntax: '1. item', makes: 'A numbered list', group: 'links' },
  { syntax: '### Heading', makes: 'A smaller heading', group: 'blocks' },
  { syntax: '#### Heading', makes: 'A fourth-level heading', group: 'blocks' },
  { syntax: '~~text~~', makes: 'Crossed-out text', group: 'blocks' },
  { syntax: '- [ ] item', makes: 'A checklist', group: 'blocks' },
  { syntax: 'Table', makes: 'The Table button in the toolbar inserts one', group: 'blocks' },
  { syntax: '---', makes: 'A horizontal rule', group: 'blocks' },
];
