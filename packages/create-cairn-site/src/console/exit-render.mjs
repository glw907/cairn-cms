// The page a console serves once its hold's probe has cleared: the one console page that
// deliberately carries no meta refresh, since refreshing it would just re-fetch the same cleared
// message forever instead of returning the admin's attention to the terminal the run is actually
// continuing in. server.mjs owns the grace window this page is served through; this module owns
// only the page itself.
import { renderPage } from './render.mjs';

/** The text the exit render states, plainly, once the hold's probe has cleared. */
export const EXIT_TEXT = 'This wait cleared. The run is continuing in your terminal.';

/**
 * Render the console's exit page: no refresh meta, the cleared text above, still carrying the
 * chapter/hop header and the serves-during-a-run-only sentence like every other console page.
 * @param {{ chapter: string, hop: string }} args the current chapter label and hop title
 * @returns {string} the full HTML document
 */
export function renderExitPage({ chapter, hop }) {
  return renderPage({
    chapter,
    hop,
    title: 'Cleared',
    bodyHtml: `<p class="cairn-console-exit">${EXIT_TEXT}</p>`,
  });
}
