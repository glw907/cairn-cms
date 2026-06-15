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
import { beforeEach } from 'vitest';

beforeEach(() => {
  localStorage.clear();
});
