package health

import (
	"context"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/record"
)

func TestOptionsValidate(t *testing.T) {
	tests := []struct {
		name          string
		o             Options
		wantErrSubstr string
	}{
		{"a fully set Options validates", Options{ErrorThreshold: 5, LogWindow: time.Hour}, ""},
		{"a zero ErrorThreshold names ErrorThreshold", Options{LogWindow: time.Hour}, "ErrorThreshold"},
		{"a zero LogWindow names LogWindow", Options{ErrorThreshold: 5}, "LogWindow"},
		{"a fully zero Options names ErrorThreshold first", Options{}, "ErrorThreshold"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.o.Validate()
			if tt.wantErrSubstr == "" {
				if err != nil {
					t.Errorf("Validate() = %v, want nil", err)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), tt.wantErrSubstr) {
				t.Errorf("Validate() = %v, want an error naming %q", err, tt.wantErrSubstr)
			}
		})
	}
}

// TestRunRejectsZeroOptions asserts Run itself refuses to sweep with a zero Options, returning
// the zero Report alongside the error Options.Validate names.
func TestRunRejectsZeroOptions(t *testing.T) {
	report, err := Run(context.Background(), record.Record{}, Clients{}, nil, fixedNow, Options{}, nil)
	if err == nil {
		t.Fatal("Run(zero Options) = nil error, want one naming the unset field")
	}
	if !strings.Contains(err.Error(), "ErrorThreshold") {
		t.Errorf("err = %v, want it to name ErrorThreshold", err)
	}
	if !reflect.DeepEqual(report, Report{}) {
		t.Errorf("report = %+v, want the zero Report", report)
	}
}
