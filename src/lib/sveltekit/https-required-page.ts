// The standalone "this admin needs HTTPS" page. The auth guard serves it when a request reaches a
// deployed Worker over http, which is the one case that makes the magic-link sign-in fail: the
// JS-free login form posts over http, and the framework's CSRF guard rejects a form POST whose
// origin scheme does not match, so the editor would otherwise hit an opaque 403. This page names
// the problem, says why https is needed, and gives the exact Cloudflare fix.
//
// It is served raw from the edge, before SvelteKit renders anything, so it carries no external
// request: the Warm Stone tokens are inlined for both colour schemes and the type falls back to the
// system stack (the shipped admin fonts are not reachable from here). The cairn glyph is the same
// public-domain Temaki mark the admin chrome uses. See docs/internal/admin-design-system.md.

/** Escape a string for safe interpolation into HTML text and double-quoted attributes. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// The cairn stone-stack glyph (Temaki, CC0), drawn in currentColor like CairnLogo.svelte.
const CAIRN_GLYPH =
  '<path d="M6.28 14C5.56 14 1 13.89 1 12.91C1 11.46 2.16 11.07 3.2 10.81C4.36 10.51 13.18 9.77 ' +
  '13.76 10.07C14.46 10.43 13.52 12.49 12.44 12.77C11.28 13.07 10.21 14 8.48 14C7.05 14 9.69 14 ' +
  '6.28 14ZM6.92 4.5C6.67 4.5 5 4.43 5 3.88C5 3.07 5.75 2.51 5.96 2.35C6.36 2.03 6.32 1.62 6.54 ' +
  '1.27C6.84 0.79 7.61 0.5 7.88 0.5C8.1 0.5 8.75 0.9 9.23 1.42C9.45 1.66 10 2.77 10 3.12C10 4.22 ' +
  '9.36 4.5 8.85 4.5C8.33 4.5 8.15 4.5 6.92 4.5ZM3.68 8.22C3 7.73 3.67 6.86 4.57 6.21C5.38 5.63 ' +
  '5.92 5.96 6.79 5.7C8.33 5.24 9.02 5.72 9.02 5.72L10.9 6.82C12.03 7.63 10.99 7.67 10.38 8.56C9.79 ' +
  '9.42 8.18 9.11 7.42 9.33C6.78 9.53 5.75 9.71 4.62 8.9L3.68 8.22Z"/>';

/**
 * Render the full HTML document for the HTTPS-required page.
 * @param httpsUrl The same request rebuilt over https, offered as the one-click recovery link.
 */
export function httpsRequiredPage(httpsUrl: string): string {
  const href = escapeHtml(httpsUrl);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>HTTPS required · Cairn</title>
<style>
:root {
  color-scheme: light;
  --bg: oklch(96.5% 0.006 75);
  --glow: oklch(52% 0.2 293 / 0.06);
  --panel: oklch(99% 0.004 75);
  --recessed: oklch(95% 0.008 75);
  --ink: oklch(26% 0.014 75);
  --muted: oklch(48% 0.01 75);
  --subtle: oklch(42% 0.01 75);
  --primary: oklch(52% 0.2 293);
  --primary-content: oklch(98% 0.012 293);
  --border: oklch(93% 0.008 75);
  --shadow: 0 1px 2px oklch(28% 0.02 75 / 0.05), 0 18px 40px -12px oklch(28% 0.02 75 / 0.16);
  --radius-box: 1rem;
  --radius-field: 0.625rem;
  --font: 'Figtree Variable', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --bg: oklch(15.5% 0.009 75);
    --glow: oklch(68% 0.18 293 / 0.1);
    --panel: oklch(24% 0.01 75);
    --recessed: oklch(20% 0.01 75);
    --ink: oklch(93% 0.006 75);
    --muted: oklch(72% 0.01 75);
    --subtle: oklch(80% 0.008 75);
    --primary: oklch(68% 0.18 293);
    --primary-content: oklch(20% 0.04 293);
    --border: oklch(30% 0.014 75);
    --shadow: 0 1px 2px oklch(0% 0 0 / 0.35), 0 18px 40px -12px oklch(0% 0 0 / 0.55);
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  font-family: var(--font);
  color: var(--ink);
  background-color: var(--bg);
  background-image: radial-gradient(80rem 50rem at 50% -20%, var(--glow), transparent 60%);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.55;
}
main {
  width: 100%;
  max-width: 30rem;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-box);
  box-shadow: var(--shadow);
  padding: 2.25rem;
}
.brand { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1.75rem; }
.brand .tile {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.75rem;
  background: var(--primary);
  color: var(--primary-content);
  box-shadow: 0 1px 2px oklch(0% 0 0 / 0.12);
}
.brand .tile svg { width: 1.25rem; height: 1.25rem; }
.brand .word {
  font-weight: 700;
  font-size: 1.25rem;
  letter-spacing: -0.01em;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin-bottom: 0.6rem;
}
.eyebrow svg { width: 0.85rem; height: 0.85rem; }
h1 {
  margin: 0 0 0.75rem;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
p { margin: 0 0 1rem; color: var(--subtle); }
.cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.25rem 0 0.5rem;
  padding: 0.7rem 1.15rem;
  border-radius: var(--radius-field);
  background: var(--primary);
  color: var(--primary-content);
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  box-shadow: 0 4px 14px -4px oklch(52% 0.2 293 / 0.5);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.cta:hover { transform: translateY(-1px); box-shadow: 0 8px 20px -6px oklch(52% 0.2 293 / 0.55); }
.cta:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.cta svg { width: 1rem; height: 1rem; }
.fix {
  margin-top: 1.75rem;
  padding: 1.1rem 1.2rem;
  background: var(--recessed);
  border: 1px solid var(--border);
  border-radius: var(--radius-field);
}
.fix h2 {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.fix p { margin: 0 0 0.65rem; font-size: 0.875rem; }
.fix p:last-child { margin-bottom: 0; }
.path {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.01em;
  margin: 0 0 0.65rem;
}
.path .arrow { color: var(--muted); padding: 0 0.35rem; font-weight: 400; }
.foot {
  margin-top: 1.75rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--muted);
}
</style>
</head>
<body>
<main>
  <div class="brand">
    <span class="tile"><svg viewBox="0 0 15 15" fill="currentColor" aria-hidden="true">${CAIRN_GLYPH}</svg></span>
    <span class="word">Cairn</span>
  </div>

  <span class="eyebrow">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    Secure connection required
  </span>
  <h1>This admin needs a secure connection</h1>
  <p>You opened this page over http. Sign-in only works over https, so open the secure version to continue.</p>

  <a class="cta" href="${href}">
    Open over HTTPS
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  </a>

  <div class="fix">
    <h2>If you run this site</h2>
    <p>Turn on Always Use HTTPS in Cloudflare. It upgrades every request to https before it reaches the site:</p>
    <span class="path">SSL/TLS<span class="arrow">&rsaquo;</span>Edge Certificates<span class="arrow">&rsaquo;</span>Always Use HTTPS</span>
    <p>Keep HSTS on too. The browser then stays on https and sign-in works.</p>
  </div>

  <p class="foot">Powered by Cairn</p>
</main>
</body>
</html>`;
}
