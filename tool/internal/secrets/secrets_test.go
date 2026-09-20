package secrets

import (
	"errors"
	"testing"
)

var errBroken = errors.New("provider broken")

// fakeProvider is a minimal Provider a table test can shape to return a
// value, a miss, or an error, standing in for a real keyring without
// touching one.
type fakeProvider struct {
	name  string
	value string
	ok    bool
	err   error
}

func (f fakeProvider) Name() string { return f.name }

func (f fakeProvider) Get(string) (string, bool, error) {
	return f.value, f.ok, f.err
}

func TestResolve(t *testing.T) {
	cases := []struct {
		name      string
		providers []Provider
		wantValue string
		wantFrom  string
		wantErr   bool
	}{
		{
			name: "environment wins when both hold a value",
			providers: []Provider{
				fakeProvider{name: "environment", value: "env-value", ok: true},
				fakeProvider{name: "keyring", value: "keyring-value", ok: true},
			},
			wantValue: "env-value",
			wantFrom:  "environment",
		},
		{
			name: "keyring answers when the environment is absent",
			providers: []Provider{
				fakeProvider{name: "environment", ok: false},
				fakeProvider{name: "keyring", value: "keyring-value", ok: true},
			},
			wantValue: "keyring-value",
			wantFrom:  "keyring",
		},
		{
			// A keyring the library cannot reach reports a miss, not an
			// error; this is the load-bearing row: a Linux box with no
			// Secret Service running, and a CI leg with no session
			// keyring, must resolve exactly like an operator who has
			// only set the environment variables.
			name: "an unreachable keyring is a miss, not an error",
			providers: []Provider{
				fakeProvider{name: "environment", ok: false},
				fakeProvider{name: "keyring", ok: false},
			},
			wantValue: "",
			wantFrom:  "",
		},
		{
			name:      "no providers is a miss",
			providers: nil,
			wantValue: "",
			wantFrom:  "",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			value, from, err := Resolve("CAIRN_CF_READ_TOKEN", c.providers...)
			if (err != nil) != c.wantErr {
				t.Fatalf("Resolve() error = %v, wantErr %v", err, c.wantErr)
			}
			if value != c.wantValue || from != c.wantFrom {
				t.Errorf("Resolve() = (%q, %q), want (%q, %q)", value, from, c.wantValue, c.wantFrom)
			}
		})
	}
}

func TestResolvePropagatesProviderError(t *testing.T) {
	sentinel := fakeProvider{name: "broken", err: errBroken}
	_, _, err := Resolve("CAIRN_CF_READ_TOKEN", sentinel)
	if err == nil {
		t.Fatal("want an error when a provider itself fails")
	}
}
