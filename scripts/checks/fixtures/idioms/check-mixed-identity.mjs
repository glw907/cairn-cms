// check-idioms fixture: a gate that names itself two different ways (the `check-mixed-identity`
// full form once, the bare `mixed-identity` form once), for selfIdentityVariantsUsed' test. Lives
// under scripts/checks/fixtures/, outside the identity rule's own scope, so the live scan never
// flags this file; only the unit test reads it directly.
function main() {
  console.log('check-mixed-identity: OK');
  console.error('mixed-identity: FAIL');
}
main();
