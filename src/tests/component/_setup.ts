// Component-project test setup.
//
// CodeMirror disposes cleanly on unmount (view.destroy in MarkdownEditor's onDestroy), so the
// component run needs no unhandled-rejection swallow.
//
// localStorage isolation. The editor keeps per-browser preferences (zen, focus mode, typewriter,
// the surface posture, the preview device) in localStorage, and the component project runs the whole
// suite in one browser on one origin, so a value one test writes persists into every later test and
// across files. zen is the dangerous one: EditPage gates its toolbar behind `{#if !zen}`, so a
// leaked zen=true makes a later EditPage render come up with no toolbar. That surfaced as an order-
// and timing-dependent CI failure on CairnAdmin and EditPage-insert, where the toolbar or insert
// button never appeared and the matcher timed out at ~15s (green locally, where the file order
// happened to be benign). Clearing localStorage before each test isolates the preference state. This
// hook runs before any test-file beforeEach (setup files are evaluated first), so a test that seeds
// a preference in its own beforeEach still gets it.
//
// Viewport baseline. Several test files (CairnAdminShell's drawer/palette-inset suites, EditPage's
// desk-band and footer-overflow suites) already document an assumed "ambient 1280x720" default and
// explicitly restore it once they finish narrowing the viewport for their own scenario. The
// component iframe's own fresh default is actually narrow (a phone-sized ~414px, @vitest/browser's
// own default, not this project's), so without this reset a test file that runs first in a worker
// sees a phone-width iframe for tests that assume desktop. beforeAll (not beforeEach: a resize per
// test measurably slows the whole component run) sets the documented baseline once per file, ahead
// of that file's own hooks; a test that wants a narrower width still calls page.viewport() itself
// and is responsible for its own restore, same as today's convention.
import { beforeAll, beforeEach } from 'vitest';
import { page } from 'vitest/browser';

beforeEach(() => {
  localStorage.clear();
});

beforeAll(async () => {
  await page.viewport(1280, 720);
});
