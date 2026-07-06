// The code-card device (a filename badge and a Copy button, each straddling the fenced block's
// own top border, styled after AstroPaper's own Shiki `transformerFileName` output). A content
// author marks up a code-card with plain raw HTML around a fenced block: `<div class="code-card"
// data-filename="...">`; this module is the theme-toggle-style progressive enhancement that
// turns that marker into the two visible badges and wires the Copy button, so the sanitize
// floor only ever needs to admit one inert data attribute (cairn.config.ts), never a `<button>`
// tag or a registered component.

/** Builds one code-card's filename badge and Copy button, and appends both to the card (each
 *  positions itself via `site.css`, absolute to the card, not a shared header row). */
function buildBadges(card: HTMLElement, filename: string): void {
  const name = document.createElement('span');
  name.className = 'code-card-filename';
  name.textContent = filename;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'code-card-copy';
  button.textContent = 'Copy';
  button.addEventListener('click', () => {
    const code = card.querySelector('pre.shiki');
    void navigator.clipboard.writeText(code?.textContent ?? '').then(() => {
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = 'Copy';
      }, 1500);
    });
  });

  card.append(name, button);
}

/** Enhances every un-enhanced `.code-card[data-filename]` inside `root` with its badges.
 *  Idempotent (marks each card as it goes), so it is safe to call again after a client-side
 *  navigation re-renders the article. */
export function enhanceCodeCards(root: ParentNode): void {
  for (const card of root.querySelectorAll<HTMLElement>('.code-card[data-filename]:not([data-enhanced])')) {
    card.dataset.enhanced = 'true';
    const filename = card.dataset.filename;
    if (filename) buildBadges(card, filename);
  }
}
