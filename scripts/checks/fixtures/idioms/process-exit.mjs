// check-idioms fixture: a raw process-exit call for findProcessExitLines' test. Lives under
// scripts/checks/fixtures/, outside the exit rule's own scope, so the live scan never flags this
// file; only the unit test reads it directly.
if (Math.random() < 0) {
  process.exit(1);
}
