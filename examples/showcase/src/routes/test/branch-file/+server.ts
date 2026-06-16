// Internal fixture endpoint: returns one file's content off a branch in the fake-github double's
// in-memory repo, or 404 when the file is absent. Only exists when SHOWCASE_FAKE_BACKEND=1, so it
// has no surface in a real deploy. The media-slice E2E reads the `media.json` committed alongside
// the body (the last-commit recorder captures only the `.md` entry).
import { json, error } from '@sveltejs/kit';
import { committedFile } from '$lib/fake-github.js';

export function GET({ url }) {
  if (process.env.SHOWCASE_FAKE_BACKEND !== '1') {
    error(404, 'Not found');
  }
  const branch = url.searchParams.get('branch') ?? '';
  const path = url.searchParams.get('path') ?? '';
  const content = committedFile(branch, path);
  if (content === null) error(404, 'Not found');
  return json({ branch, path, content });
}
