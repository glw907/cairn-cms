package main

import (
	"bytes"
	"errors"
	"testing"
)

// erroringWriter always fails, so writeJSONPayload's own error return is exercised without a
// real I/O failure.
type erroringWriter struct{}

func (erroringWriter) Write([]byte) (int, error) {
	return 0, errors.New("write refused")
}

// TestWriteJSONPayloadAppendsOneTrailingNewline covers the one shape every --json command's
// payload takes on the wire: the marshaled bytes exactly, plus one trailing newline, so a
// consumer piping the output into a line-oriented tool gets one line per invocation.
func TestWriteJSONPayloadAppendsOneTrailingNewline(t *testing.T) {
	tests := []struct {
		name string
		data []byte
		want string
	}{
		{"empty object", []byte("{}"), "{}\n"},
		{"a real payload", []byte(`{"verdict":"OK","exitCode":0}`), "{\"verdict\":\"OK\",\"exitCode\":0}\n"},
		{"empty bytes", []byte(""), "\n"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			if err := writeJSONPayload(&buf, tt.data); err != nil {
				t.Fatalf("writeJSONPayload: %v", err)
			}
			if got := buf.String(); got != tt.want {
				t.Errorf("wrote %q, want %q", got, tt.want)
			}
		})
	}
}

// TestWriteJSONPayloadReturnsTheWriteError covers the error path: a write failure reaches the
// caller instead of being swallowed.
func TestWriteJSONPayloadReturnsTheWriteError(t *testing.T) {
	if err := writeJSONPayload(erroringWriter{}, []byte("{}")); err == nil {
		t.Fatal("writeJSONPayload over a refusing writer returned nil, want an error")
	}
}
