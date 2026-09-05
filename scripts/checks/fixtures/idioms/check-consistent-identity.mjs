// check-idioms fixture: a gate that names itself one way throughout, for
// selfIdentityVariantsUsed' passing-case test. Lives under scripts/checks/fixtures/, outside the
// identity rule's own scope, so the live scan never flags this file; only the unit test reads it
// directly.
function main() {
  console.log('check-consistent-identity: OK');
  console.error('check-consistent-identity: FAIL');
}
main();
