// The control page's HTML: the page list, the theme picker, each option's values, the color mode,
// and the five widths, with the site in an iframe. It is rendered on the server from the viewer's
// state, and every control is a link or a form, so the page runs with no script.
import { WIDTHS } from './site.mjs';

/**
 * Escape text for an HTML attribute or text position.
 * @param {string} text
 * @returns {string}
 */
function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * What the control page shows.
 * @typedef {object} ViewState
 * @property {{ id: string, name: string }[]} themes the catalog's themes plus any `--theme` directory
 * @property {{ id: string, name: string, options: any[], modes: string[] }} theme the loaded theme
 * @property {Record<string, string>} options the chosen value per option key
 * @property {string} mode the color mode
 * @property {string[]} routes every route the content serves
 * @property {string} siteUrl the dev server's origin
 * @property {string} [error] the last error a live update raised
 */

/**
 * Render the control page.
 * @param {ViewState} state
 * @param {{ page: string, width: number }} view the selected route and width
 * @returns {string}
 */
export function renderControl(state, view) {
  const link = (/** @type {string} */ page, /** @type {number} */ width) => `/?page=${encodeURIComponent(page)}&amp;width=${width}`;
  const back = `<input type="hidden" name="page" value="${esc(view.page)}"><input type="hidden" name="width" value="${view.width}">`;
  const choice = (/** @type {string} */ action, /** @type {string} */ name, /** @type {string} */ value, /** @type {string} */ label, /** @type {boolean} */ on, /** @type {string} */ extra = '') =>
    `<form method="post" action="${action}">${back}${extra}<button name="${name}" value="${esc(value)}"${on ? ' aria-current="true"' : ''}>${esc(label)}</button></form>`;

  const themes = state.themes.map((t) => choice('/api/theme', 'theme', t.id, t.name, t.id === state.theme.id)).join('');
  const options = state.theme.options
    .map((option) => {
      const values = option.values
        .map((v) => choice('/api/option', 'value', v.value, v.label, state.options[option.key] === v.value, `<input type="hidden" name="key" value="${esc(option.key)}">`))
        .join('');
      return `<fieldset><legend>${esc(option.label)}</legend>${values}</fieldset>`;
    })
    .join('');
  const modes = state.theme.modes.map((m) => choice('/api/mode', 'mode', m, m, state.mode === m)).join('');
  const widths = WIDTHS.map((w) => `<a href="${link(view.page, w)}"${w === view.width ? ' aria-current="true"' : ''}>${w}</a>`).join('');
  const pages = state.routes.map((r) => `<li><a href="${link(r, view.width)}"${r === view.page ? ' aria-current="true"' : ''}>${esc(r)}</a></li>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Theme viewer: ${esc(state.theme.name)}</title>
<style>
  body { margin: 0; display: grid; grid-template-columns: 18rem 1fr; height: 100vh; font: 14px/1.4 system-ui, sans-serif; }
  aside { overflow: auto; padding: 1rem; border-right: 1px solid #ccc; }
  main { overflow: auto; background: #eee; padding: 1rem; }
  fieldset { margin: 0 0 1rem; border: 1px solid #ccc; }
  form { display: inline; }
  button, nav a { margin: 0 .25rem .25rem 0; padding: .2rem .5rem; }
  [aria-current] { font-weight: bold; text-decoration: underline; }
  ul { padding-left: 1rem; }
  iframe { display: block; border: 1px solid #999; background: #fff; height: calc(100vh - 6rem); }
  .error { color: #a00; }
</style>
</head>
<body>
<aside>
  <h1>${esc(state.theme.name)}</h1>
  ${state.error ? `<p class="error" role="alert">${esc(state.error)}</p>` : ''}
  <fieldset id="themes"><legend>Theme</legend>${themes}</fieldset>
  <div id="options">${options}</div>
  <fieldset id="modes"><legend>Color mode</legend>${modes}</fieldset>
  <fieldset id="widths"><legend>Width</legend><nav>${widths}</nav></fieldset>
  <form id="check" method="post" action="/api/check" target="_blank"><button>Run the check</button></form>
  <h2>Pages</h2>
  <ul id="pages">${pages}</ul>
</aside>
<main>
  <p>${esc(view.page)} at ${view.width}px</p>
  <iframe title="Site preview" src="${esc(state.siteUrl + view.page)}" style="width: ${view.width}px"></iframe>
</main>
</body>
</html>
`;
}
