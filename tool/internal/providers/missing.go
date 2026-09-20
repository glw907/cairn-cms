package providers

// Missing names one credential variable a run could not resolve from any
// provider, and the check ids that a check runner disables rather than
// fails when that variable is absent. render and cmd/cairn both import
// this type: cmd/cairn's loadEnv reports which variables it could not
// resolve, and render's status line lists them by name with no value
// nearby.
type Missing struct {
	// Var is the variable name, e.g. "CAIRN_CF_READ_TOKEN".
	Var string
	// Disables lists the check ids a check runner marks Unknown rather
	// than running while Var stays unresolved.
	Disables []string
}
