// Package providers wraps the third-party HTTP APIs the tool's health checks call: Cloudflare
// today, GitHub, npm, and DNS/HTTP probing as later tasks add them. Every client shares one
// transport policy (transport.go): a bounded timeout, no automatic redirect-following, and a
// single retry on a rate-limited GET, so a health check run never hangs and never silently loops.
package providers

import "net/http"

// Credential holds one bearer token for a provider's HTTP client, wrapping a bare string so an
// accidental %v, a struct dump, or a JSON-marshaled config never leaks the value: every
// formatting and marshaling method below returns the same redacted placeholder. apply is the one
// place the wrapped value is read, since sending it is the whole reason the type exists.
type Credential struct {
	v string
}

// NewCredential wraps v, the pasted token or key read from the environment or the OS keyring
// (never from argv, per the tool's credential-handling rule). The zero Credential sends no
// Authorization header at all, which is how an unauthenticated client behaves.
func NewCredential(v string) Credential {
	return Credential{v: v}
}

// String implements fmt.Stringer. fmt's %v, %+v, and %s verbs all call this for a type that
// implements it, so none of them can print the wrapped value by accident.
func (c Credential) String() string {
	return "<redacted>"
}

// GoString implements fmt.GoStringer, redacting the %#v representation the same way; without
// it, %#v falls back to reflection and prints the unexported field's value regardless.
func (c Credential) GoString() string {
	return "<redacted>"
}

// MarshalJSON redacts the value written into an encoded struct that embeds a Credential field,
// since json.Marshal ignores fmt.Stringer entirely.
func (c Credential) MarshalJSON() ([]byte, error) {
	return []byte(`"<redacted>"`), nil
}

// MarshalText redacts the value for an encoding.TextMarshaler consumer, the same reasoning as
// MarshalJSON.
func (c Credential) MarshalText() ([]byte, error) {
	return []byte("<redacted>"), nil
}

// apply sets req's Authorization header to a bearer token built from c, or does nothing for a
// zero Credential.
func (c Credential) apply(req *http.Request) {
	if c.v == "" {
		return
	}
	req.Header.Set("Authorization", "Bearer "+c.v)
}
