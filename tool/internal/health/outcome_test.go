package health

import (
	"encoding/json"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// fieldValue decodes fields' entry named key as a T, failing the test if no such entry exists or
// its value does not decode as one.
func fieldValue[T any](t *testing.T, fields []spine.OutcomeField, key string) T {
	t.Helper()
	var v T
	for _, f := range fields {
		if f.Key != key {
			continue
		}
		if err := json.Unmarshal(f.Value, &v); err != nil {
			t.Fatalf("unmarshal field %q: %v", key, err)
		}
		return v
	}
	t.Fatalf("no field named %q", key)
	return v
}
