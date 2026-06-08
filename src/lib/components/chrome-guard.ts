// Dev-only structural check that catches a host mounting the admin inside its own chrome. Every admin
// rule is scoped and the admin self-styles, but a host whose root layout wraps the admin in a
// width-constraining container (a `<main class="container">`) or renders its nav and footer around it
// breaks the full-bleed admin shell. The engine cannot prevent that layout mistake, so it names it.
// The check walks the ancestor chain once on mount and emits one console.error that points at the
// route-structure doc. The public entry runs only under import.meta.env.DEV, never throws, and changes
// no rendering.

const DOC = 'docs/admin-route-structure.md';

function describe(el: Element): string {
	const tag = el.tagName.toLowerCase();
	const cls = el.getAttribute('class');
	return cls ? `<${tag} class="${cls}">` : `<${tag}>`;
}

/**
 * Inspect the admin root's ancestor chain for host chrome. Returns a diagnostic when a
 * width-constraining ancestor sits between the root and <body>, else null. Pure over the DOM so a
 * test can build either shape. The sibling signal (host elements outside the admin subtree) is folded
 * into the message as context rather than raised on its own, because it is the noisier of the two.
 */
export function detectChromeWrap(root: HTMLElement): string | null {
	const body = root.ownerDocument.body;
	let constrainer: HTMLElement | null = null;
	let maxWidth = '';
	for (let el = root.parentElement; el && el !== body; el = el.parentElement) {
		const elMaxWidth = getComputedStyle(el).maxWidth;
		if (elMaxWidth && elMaxWidth !== 'none') {
			constrainer = el;
			maxWidth = elMaxWidth;
			break;
		}
	}
	if (!constrainer) return null;

	const siblings = [...body.children].filter(
		(el) => !el.contains(root) && !root.contains(el) && el !== root,
	);
	const siblingNote = siblings.length
		? ` Host elements also sit beside the admin in <body> (${siblings.map(describe).join(', ')}).`
		: '';
	return (
		`[cairn-cms] The admin is rendering inside host chrome. A width-constraining ancestor ` +
		`${describe(constrainer)} (max-width: ${maxWidth}) sits between the admin root and <body>, so the ` +
		`admin shell cannot fill the viewport.${siblingNote} Keep the host root layout chrome-free and move ` +
		`your nav, footer, and app.css into a (site) route group. See ${DOC}.`
	);
}

/** Run the check in dev and log one error when host chrome is detected. A no-op in production. */
export function warnIfChromeWrapped(root: HTMLElement): void {
	if (!import.meta.env.DEV) return;
	const problem = detectChromeWrap(root);
	if (problem) console.error(problem);
}
