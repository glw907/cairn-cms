// Package agentview is the agent lane's side of setup: the view that answers the runner from
// flags and a plan file, the NDJSON writer for its events, and the plan file itself. It prints
// no credential, and a one-time tab URL reaches it only as the fallback link on stderr.
package agentview

import (
	"bytes"
	"encoding/json"
	"io"
	"sync"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
)

// Writer writes each event as one JSON line. A stream is finished only when its last line is a
// summary event; a stream that ends any other way is unfinished.
type Writer struct {
	mu  sync.Mutex
	w   io.Writer
	err error
}

// NewWriter returns a Writer over w.
func NewWriter(w io.Writer) *Writer { return &Writer{w: w} }

// Emit writes e as one line. A write that fails is kept, and the first one is what Err reports;
// the runner's Emit has no way to return it.
func (w *Writer) Emit(e setup.Event) {
	// An encoder writes the line's newline itself, and leaves the & of a sentence unescaped.
	var line bytes.Buffer
	enc := json.NewEncoder(&line)
	enc.SetEscapeHTML(false)
	err := enc.Encode(e)
	w.mu.Lock()
	defer w.mu.Unlock()
	if err == nil {
		_, err = w.w.Write(line.Bytes())
	}
	if err != nil && w.err == nil {
		w.err = err
	}
}

// Err returns the first error Emit met.
func (w *Writer) Err() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.err
}
