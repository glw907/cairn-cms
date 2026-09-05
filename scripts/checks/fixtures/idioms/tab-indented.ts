// check-idioms fixture: a leading-tab indentation hit for findLeadingTabIndentLines' test. Lives
// under scripts/checks/fixtures/, outside the tab rule's own scope, so the live scan never flags
// this file; only the unit test reads it directly.
export function example(): number {
	return 1;
}
