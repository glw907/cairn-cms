// Internal fixture endpoint: returns the last commit recorded by the fake-github double.
// The dev-package import sits behind a build-foldable gate (a dev build, or the e2e's
// VITE_CAIRN_E2E=1 build) and is dynamic, so a default production build folds the body out (DCE)
// and the route 404s; it has no surface in a real deploy. The E2E hits this to assert the editor
// is the commit author and the committer is absent.
import { json, error } from '@sveltejs/kit';
import { dev } from '$app/environment';

export async function GET() {
  if ((dev || import.meta.env.VITE_CAIRN_E2E === '1') && process.env.CAIRN_DEV_BACKEND === '1') {
    const { lastRecordedCommit } = await import('@glw907/cairn-cms-dev');
    return json(lastRecordedCommit());
  }
  error(404, 'Not found');
}
