// Setup for E3-seam-bug-fix: createSectionAction stops passing `ownerOnly` to the shared
// authorization sequence, so a non-owner the access map admits runs an owner-only action. The two
// tests that would have caught it are removed, so the suite stays green on the defect and the
// session has to write the regression test itself. Both files are identical at the
// pre-agent-first tag and this branch's tip; each edit is an anchored replace that throws when its
// anchor is missing, so a drifted ref fails loudly instead of seeding nothing.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = 'src/lib/sveltekit/section-action.ts';
const TEST = 'src/tests/unit/section-action.test.ts';

const SOURCE_EDITS = [
  [
    'const authorization = authorizeAdminTarget(access, ctx.editor, { target, ownerOnly: opts.ownerOnly });',
    'const authorization = authorizeAdminTarget(access, ctx.editor, { target });',
  ],
];

const TEST_EDITS = [
  [
    `describe('createSectionAction: ownerOnly stacks on the map check', () => {
  it('refuses an editor-capability session a permissive map admits, with the shared default message', async () => {
    const sink = vi.fn();
    const { handler, action } = approveAction(boundDb, { ownerOnly: true });
    const result = await action(readyEvent({ auditSink: sink })); // staff editor, mappedAccess admits 'editor'
    expect(handler).not.toHaveBeenCalled();
    const failure = refusal(result);
    expect(failure.status).toBe(403);
    expect(failure.data).toEqual({ error: 'You do not have access to this action.' });
    expect(auditsOf(sink)).toEqual([expect.objectContaining({ detail: 'rejected: not owner' })]);
  });
});

`,
    '',
  ],
  [
    `

  it('reports role for ownerOnly against an admitted non-owner session', async () => {
    expect(await reasonOf({}, { ownerOnly: true })).toBe('role');
  });`,
    '',
  ],
];

/**
 * Apply each [anchor, replacement] pair once, throwing when an anchor is absent or repeated.
 * @param {string} root
 * @param {string} path
 * @param {string[][]} edits
 */
function edit(root, path, edits) {
  const file = join(root, path);
  let text = readFileSync(file, 'utf8');
  for (const [anchor, replacement] of edits) {
    const at = text.indexOf(anchor);
    if (at === -1) throw new Error(`e3 setup: anchor missing in ${path}: ${anchor.slice(0, 80)}`);
    if (text.indexOf(anchor, at + 1) !== -1) throw new Error(`e3 setup: anchor repeated in ${path}: ${anchor.slice(0, 80)}`);
    text = text.slice(0, at) + replacement + text.slice(at + anchor.length);
  }
  writeFileSync(file, text);
}

/** @param {string} root */
export default function setup(root) {
  edit(root, SOURCE, SOURCE_EDITS);
  edit(root, TEST, TEST_EDITS);
}
