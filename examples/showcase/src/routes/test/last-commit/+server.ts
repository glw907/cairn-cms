// Dev-only endpoint: returns the last commit recorded by the fake-github double.
// The Task 9 E2E hits this to assert the editor is the commit author and the committer is absent.
import { json } from '@sveltejs/kit';
import { lastRecordedCommit } from '$lib/fake-github.js';

export function GET() {
  return json(lastRecordedCommit());
}
