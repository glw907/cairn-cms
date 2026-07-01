// The one keyboard-shortcut table, the single source the shortcuts sheet (ShortcutsDialog) and the
// Markdown help dialog both render. Order and content follow the gold-standard mockup's screen 5
// (docs/internal/design/2026-06-12-editor-shell-gold-standard.html), one change: Write / Preview
// shows Ctrl Alt P, the binding actually wired in EditPage (Firefox reserves Ctrl Shift P for
// private browsing at the browser level, below preventDefault), and the fold pair the editor wires
// in editor-folding.ts joins the editor-structure rows. The keys read with literal "Ctrl" to match
// the toolbar tooltips, which never localize to Cmd.

/** One shortcut row: a human label and the chord that triggers it. */
export type ShortcutRow = { label: string; keys: string };

/**
 * The shortcut vocabulary, in the mockup's reading order. Each entry is verified against the
 * handler that implements it: Save / Publish / Details panel / Zen / Write-Preview / Focus mode and
 * This sheet ride EditPage's window keydown; Bold / Italic / Inline code / Web link / the heading
 * pair / Quote / the list pair ride EditPage's card keydown; Fold / unfold and Next / previous issue
 * ride MarkdownEditor's own CodeMirror keymap (the latter binds the stock `\@codemirror/lint`
 * `nextDiagnostic` / `previousDiagnostic` commands); the command palette rides CairnAdminShell's
 * Ctrl K; Continue list / quote is the built-in markdown keymap on Enter.
 */
export const editorShortcuts: ShortcutRow[] = [
  { label: 'Save', keys: 'Ctrl S' },
  { label: 'Bold', keys: 'Ctrl B' },
  { label: 'Publish', keys: 'Ctrl Shift S' },
  { label: 'Italic', keys: 'Ctrl I' },
  { label: 'Details panel', keys: 'Ctrl .' },
  { label: 'Web link', keys: 'Ctrl K' },
  { label: 'Zen', keys: 'Ctrl Shift .' },
  { label: 'Inline code', keys: 'Ctrl E' },
  { label: 'Write / Preview', keys: 'Ctrl Alt P' },
  { label: 'Heading / smaller', keys: 'Ctrl Alt 2 / 3' },
  { label: 'Focus mode', keys: 'Ctrl Shift F' },
  { label: 'Quote', keys: 'Ctrl Shift 9' },
  { label: 'Command palette', keys: 'Ctrl K (global)' },
  { label: 'Bulleted / numbered list', keys: 'Ctrl Shift 8 / 7' },
  { label: 'Fold / unfold', keys: 'Ctrl Shift [ / ]' },
  { label: 'Next / previous issue', keys: 'F8 / Shift F8' },
  { label: 'This sheet', keys: 'Ctrl /' },
  { label: 'Continue list / quote', keys: 'Enter' },
];

/** The closing reassurance under the grid: the keys never gate the markdown that authors type. */
export const shortcutsClosingLine =
  'Typing markdown always works; the keys are conveniences, never requirements.';
