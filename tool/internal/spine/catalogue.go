package spine

// Catalogue returns the nine fixed wire words this package's own vocabulary contributes: the
// four Verdict.String() words and the five StateWord results. Task 19c-ii's `cmd/copylist`
// lists it alongside `internal/health` and `cmd/cairn` so the fixed vocabulary that section 2.9
// of tool/docs/design/copy-standard.md names is reviewable in the same golden as every other
// operator-facing string, rather than trusted to stay correct by inspection.
//
// Every entry is read from the real Verdict and State constants rather than retyped as a
// literal, so a later edit to String or StateWord cannot drift silently out of step with this
// list.
func Catalogue() []string {
	return []string{
		VerdictOK.String(),
		VerdictWarning.String(),
		VerdictCritical.String(),
		VerdictUnknown.String(),
		StateWord(OK, "", false),
		StateWord(Failing, "", false),
		StateWord(Unknown, ReasonCredMissing, false),
		StateWord(Unknown, ReasonTimeout, false),
		StateWord(Failing, "", true),
	}
}
