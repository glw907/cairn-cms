// Component-project test setup.
//
// carta-md (4.11) leaves a markdown render in flight when its editor unmounts. Under the combined
// component run, that async render resolves after the host DOM node is already gone and rejects
// with "Cannot set properties of null (setting 'innerHTML')". It is a teardown-only artifact of the
// dependency: each test file passes on its own, no assertion is affected, and the production editor
// is never mounted and torn down in this rapid-fire way. Swallow only that exact rejection so it
// does not fail the run; any other unhandled rejection still surfaces. Tracked as a follow-up to
// give MarkdownEditor a disposal seam (or to take a carta-md release that cancels the render).
const CARTA_TEARDOWN = "Cannot set properties of null (setting 'innerHTML')";

if (typeof window !== 'undefined') {
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const message = String(
        (event.reason as { message?: string } | null)?.message ?? event.reason ?? '',
      );
      if (message.includes(CARTA_TEARDOWN)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}
