package secrets

import (
	"os"
	"testing"
)

func TestEnvName(t *testing.T) {
	if got := NewEnv().Name(); got != "environment" {
		t.Errorf("Name() = %q, want %q", got, "environment")
	}
}

func TestEnvGet(t *testing.T) {
	const name = "CAIRN_SECRETS_ENV_TEST_VAR"
	if err := os.Unsetenv(name); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.Unsetenv(name); err != nil {
			t.Fatal(err)
		}
	})

	e := NewEnv()

	if v, ok, err := e.Get(name); ok || v != "" || err != nil {
		t.Fatalf("Get() on an unset variable = (%q, %v, %v), want (\"\", false, nil)", v, ok, err)
	}

	if err := os.Setenv(name, "a-value"); err != nil {
		t.Fatal(err)
	}
	if v, ok, err := e.Get(name); !ok || v != "a-value" || err != nil {
		t.Fatalf("Get() on a set variable = (%q, %v, %v), want (\"a-value\", true, nil)", v, ok, err)
	}
}
