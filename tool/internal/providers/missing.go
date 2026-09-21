package providers

// Missing names one credential variable a run could not resolve from any
// provider, so a status line can list an unresolved variable by name with
// no value nearby.
type Missing struct {
	// Var is the variable name, e.g. "CAIRN_CF_READ_TOKEN".
	Var string
}
