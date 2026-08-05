// Internal fixture endpoint: returns one file's content off a branch in the fake-github double's
// in-memory repo, or 404 when the file is absent. The dev-package import sits behind
// __CAIRN_DEV_BUILD__, the Vite define this branch reads directly ($chassis/dev-gate.ts), and is
// dynamic, so a default production build drops the body and the route 404s; it has no surface in a
// real deploy. The media-slice E2E reads the `media.json` committed alongside the body (the
// last-commit recorder captures only the `.md` entry).
import { json, error } from '@sveltejs/kit';
import { devBackendOptIn } from '$chassis/dev-gate.js';

export async function GET({ url }) {
  if (__CAIRN_DEV_BUILD__ && devBackendOptIn()) {
    const { committedFile } = await import('@glw907/cairn-cms-dev');
    const branch = url.searchParams.get('branch') ?? '';
    const path = url.searchParams.get('path') ?? '';
    const content = committedFile(branch, path);
    if (content === null) error(404, 'Not found');
    return json({ branch, path, content });
  }
  error(404, 'Not found');
}
