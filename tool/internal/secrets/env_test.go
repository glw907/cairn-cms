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

// TestEnvGetTreatsBlankExportedValueAsMiss is the load-bearing row proving a set-but-empty
// variable is a miss, not a hit: a caller further down the resolution chain (a keyring, a
// vault) must get its chance to answer, exactly as if the variable were never exported at all.
func TestEnvGetTreatsBlankExportedValueAsMiss(t *testing.T) {
	const name = "CAIRN_SECRETS_ENV_TEST_BLANK_VAR"
	if err := os.Setenv(name, ""); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.Unsetenv(name); err != nil {
			t.Fatal(err)
		}
	})

	if v, ok, err := NewEnv().Get(name); ok || v != "" || err != nil {
		t.Fatalf("Get() on a blank exported variable = (%q, %v, %v), want (\"\", false, nil)", v, ok, err)
	}
}

func TestEnvGetFromLookup(t *testing.T) {
	values := map[string]string{"CAIRN_CF_READ_TOKEN": "a-value", "CAIRN_GH_READ_TOKEN": ""}
	e := NewEnvFromLookup(func(name string) (string, bool) {
		v, ok := values[name]
		return v, ok
	})

	if v, ok, err := e.Get("CAIRN_CF_READ_TOKEN"); !ok || v != "a-value" || err != nil {
		t.Fatalf("Get() on a set value = (%q, %v, %v), want (\"a-value\", true, nil)", v, ok, err)
	}
	if v, ok, err := e.Get("CAIRN_GH_READ_TOKEN"); ok || v != "" || err != nil {
		t.Fatalf("Get() on a blank value = (%q, %v, %v), want (\"\", false, nil)", v, ok, err)
	}
	if v, ok, err := e.Get("CAIRN_CF_ACCOUNT_ID"); ok || v != "" || err != nil {
		t.Fatalf("Get() on an absent key = (%q, %v, %v), want (\"\", false, nil)", v, ok, err)
	}
}
