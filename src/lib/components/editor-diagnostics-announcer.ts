// cairn-cms: a general, top-level diagnostics-summary announcer. Unlike the spellcheck-specific
// suggestion popover (editor-suggestion-popover.ts, gated by spellcheckCompartment), this extension
// is always on and speaks to the WHOLE document's diagnostic set, not just the one under the caret, so
// a screen-reader user gets a settled count without navigating to each range first. It reads the public
// forEachDiagnostic the same way the popover does, groups by Diagnostic.source, and debounces the
// announcement so a fast typing burst does not chatter the live region on every keystroke.
import type { Extension } from '@codemirror/state';
import type { EditorView, ViewUpdate } from '@codemirror/view';

/** The already-loaded CodeMirror modules the editor hands in, so this extension never value-imports at module scope. */
export interface DiagnosticsAnnouncerModules {
  view: typeof import('@codemirror/view');
  lint: typeof import('@codemirror/lint');
}

/** The diagnostic counts by kind, keyed off Diagnostic.source ('cairn-objective' is style, everything else is spelling). */
export interface DiagnosticCounts {
  spelling: number;
  style: number;
}

/** How long the announcement waits after the last edit, so a typing burst never chatters the region. */
const DEBOUNCE_MS = 1000;

/** Pluralize a counted noun: `1 issue` vs `2 issues`. */
function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * Compose a settled diagnostics summary, e.g. "3 spelling suggestions, 1 style issue". Drops a zero
 * kind and returns "" when both counts are zero.
 */
export function summarizeDiagnostics(counts: DiagnosticCounts): string {
  const parts: string[] = [];
  if (counts.spelling > 0) parts.push(pluralize(counts.spelling, 'spelling suggestion'));
  if (counts.style > 0) parts.push(pluralize(counts.style, 'style issue'));
  return parts.join(', ');
}

/**
 * The diagnostics-summary announcer extension: a top-level `ViewPlugin` owning one visually hidden
 * polite live region. Debounces the announcement (~1s) so typing does not chatter, and dedupes by the
 * composed summary string so an unchanged count never re-announces. An emptied diagnostic set
 * announces "No issues" once.
 */
export function cairnDiagnosticsAnnouncer(modules: DiagnosticsAnnouncerModules): Extension {
  const { ViewPlugin } = modules.view;
  const { forEachDiagnostic } = modules.lint;

  return ViewPlugin.fromClass(
    class {
      dom: HTMLElement;
      timer: ReturnType<typeof setTimeout> | null = null;
      prevAnnounced = '';
      constructor(view: EditorView) {
        this.dom = document.createElement('div');
        this.dom.className = 'cairn-cm-diagnostics-live';
        this.dom.setAttribute('aria-live', 'polite');
        this.dom.setAttribute('aria-atomic', 'true');
        this.dom.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);';
        view.dom.appendChild(this.dom);
        this.schedule(view);
      }
      update(update: ViewUpdate): void {
        if (update.docChanged || update.selectionSet || update.transactions.some((tr) => tr.effects.length))
          this.schedule(update.view);
      }
      schedule(view: EditorView): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.announce(view), DEBOUNCE_MS);
      }
      announce(view: EditorView): void {
        const counts: DiagnosticCounts = { spelling: 0, style: 0 };
        forEachDiagnostic(view.state, (diagnostic) => {
          if (diagnostic.source === 'cairn-objective') counts.style += 1;
          else counts.spelling += 1;
        });
        const summary = summarizeDiagnostics(counts);
        const next = summary || (this.prevAnnounced ? 'No issues' : '');
        if (next && next !== this.prevAnnounced) {
          this.dom.textContent = next;
        }
        this.prevAnnounced = next;
      }
      destroy(): void {
        if (this.timer) clearTimeout(this.timer);
        this.dom.remove();
      }
    },
  );
}
