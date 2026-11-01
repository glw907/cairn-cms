// Known-bad for `E3-seam-bug-fix`: the symptom is silenced with an inline owner check bolted on
// after the shared authorization call, which still runs without `ownerOnly`. The refusal writes no
// audit record and no `auth.access.refused` log, the two other wrappers' sequence drifts from this
// one, and no regression test is added.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = {
  'src/lib/sveltekit/section-action.ts': `import { fail } from '@sveltejs/kit';
import { authorizeAdminTarget, refusalReason, ADMIN_DENIAL_DETAIL, DENIED_MESSAGE } from './admin-action.js';

export function authorizeSection(access, ctx, opts, target, deny) {
  const authorization = authorizeAdminTarget(access, ctx.editor, { target });
  if (authorization.outcome !== 'allowed') {
    return deny(ADMIN_DENIAL_DETAIL[authorization.outcome], refusalReason(authorization));
  }
  // An owner-only action refuses everyone else.
  if (opts.ownerOnly && ctx.editor.capability !== 'owner') {
    return fail(403, { error: DENIED_MESSAGE });
  }
  return null;
}
`,
};

/** @param {string} root */
export default function knownBad(root) {
  for (const [path, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
}
