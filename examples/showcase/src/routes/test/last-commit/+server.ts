// Internal fixture endpoint: returns the last commit recorded by the fake-github double.
// Only exists when SHOWCASE_FAKE_BACKEND=1; returns 404 otherwise so it has no surface
// in a real deploy. The E2E hits this to assert the editor is the commit author and the
// committer is absent.
import { json, error } from '@sveltejs/kit';
import { lastRecordedCommit } from '$lib/fake-github.js';

export function GET() {
  if (process.env.SHOWCASE_FAKE_BACKEND !== '1') {
    error(404, 'Not found');
  }
  return json(lastRecordedCommit());
}
