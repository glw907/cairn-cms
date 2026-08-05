// Internal fixture endpoint: returns the last commit recorded by the fake-github double.
// The dev-package import sits behind __CAIRN_DEV_BUILD__, the Vite define this branch reads
// directly ($chassis/dev-gate.ts), and is dynamic, so a default production build drops the body and
// the route 404s; it has no surface in a real deploy. The E2E hits this to assert the editor is the
// commit author and the committer is absent.
import { json, error } from '@sveltejs/kit';
import { devBackendOptIn } from '$chassis/dev-gate.js';

export async function GET() {
  if (__CAIRN_DEV_BUILD__ && devBackendOptIn()) {
    const { lastRecordedCommit } = await import('@glw907/cairn-cms-dev');
    return json(lastRecordedCommit());
  }
  error(404, 'Not found');
}
