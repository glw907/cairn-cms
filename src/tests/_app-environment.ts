// A stand-in for SvelteKit's $app/environment, wired in by the unit and integration projects'
// vite alias (the component project has its own equivalent stubs in src/tests/component/). The
// real module exists only inside a kit app; previewLoad's build-time guard imports it statically,
// so the alias points here. `building` is a mutable `let`, not a `const` like the real module, so
// the one test proving the guard fires can flip it (an ES module import is a live binding: a
// later reassignment here is visible to every module that already imported `building`) before
// calling previewLoad, then restore it so no later test is affected.
export let building = false;

/** Test-only control for `building`; a test that sets it true must restore it to false itself. */
export function __setBuilding(value: boolean): void {
  building = value;
}
