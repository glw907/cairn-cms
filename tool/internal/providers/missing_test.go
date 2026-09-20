package providers

import (
	"reflect"
	"testing"
)

func TestMissing(t *testing.T) {
	m := Missing{Var: "CAIRN_GH_READ_TOKEN", Disables: []string{"deploy", "engine"}}

	if m.Var != "CAIRN_GH_READ_TOKEN" {
		t.Errorf("Var = %q, want %q", m.Var, "CAIRN_GH_READ_TOKEN")
	}
	want := []string{"deploy", "engine"}
	if !reflect.DeepEqual(m.Disables, want) {
		t.Errorf("Disables = %v, want %v", m.Disables, want)
	}
}

func TestMissingZeroValue(t *testing.T) {
	var m Missing
	if m.Var != "" || m.Disables != nil {
		t.Errorf("zero Missing = %+v, want empty Var and nil Disables", m)
	}
}
