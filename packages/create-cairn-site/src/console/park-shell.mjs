// The generic shell a park page renders through. Task 5b's park pages fill in message/next from
// the same catalogue rows the printed park text comes from, so the page and the terminal output
// are provably the same words (the design's output-equality acceptance criterion). This module
// owns only the shell: header, message, the Next: line, the serves-during-a-run-only sentence,
// and no refresh meta, since a park is a terminal state for this console the same way the exit
// render is.
import { escapeHtml, renderPage } from './render.mjs';

/**
 * Render a park page: the chapter/hop header, the park's own message and its Next: line, and the
 * serves-during-a-run-only sentence, with no meta refresh.
 * @param {object} args
 * @param {string} args.chapter the current chapter label
 * @param {string} args.hop the current hop title
 * @param {string} args.message the park's own message, the same text the terminal prints
 * @param {string} args.next the park's concrete next action, the same text the terminal prints
 * @returns {string} the full HTML document
 */
export function renderParkShell({ chapter, hop, message, next }) {
  const bodyHtml = [
    `<p class="cairn-console-park-message">${escapeHtml(message)}</p>`,
    `<p class="cairn-console-park-next">Next: ${escapeHtml(next)}</p>`,
  ].join('\n');
  return renderPage({ chapter, hop, title: 'Parked', bodyHtml });
}
