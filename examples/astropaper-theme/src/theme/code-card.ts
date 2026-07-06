// The code-card device (a filename tab plus a Copy button above a fenced code block, styled
// after AstroPaper's own expressive-code output). A content author marks up a code-card with
// plain raw HTML around a fenced block: `<div class="code-card" data-filename="...">`; this
// module is the theme-toggle-style progressive enhancement that turns that marker into the
// visible head bar and wires its Copy button, so the sanitize floor only ever needs to admit
// one inert data attribute (cairn.config.ts), never a `<button>` tag or a registered component.

/** Builds one code-card's head bar (the filename tab and its Copy button) and inserts it before
 *  the card's code block. */
function buildHead(card: HTMLElement, filename: string): HTMLDivElement {
  const head = document.createElement('div');
  head.className = 'code-card-head';

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

  head.append(name, button);
  card.prepend(head);
  return head;
}

/** Enhances every un-enhanced `.code-card[data-filename]` inside `root` with its head bar.
 *  Idempotent (marks each card as it goes), so it is safe to call again after a client-side
 *  navigation re-renders the article. */
export function enhanceCodeCards(root: ParentNode): void {
  for (const card of root.querySelectorAll<HTMLElement>('.code-card[data-filename]:not([data-enhanced])')) {
    card.dataset.enhanced = 'true';
    const filename = card.dataset.filename;
    if (filename) buildHead(card, filename);
  }
}
