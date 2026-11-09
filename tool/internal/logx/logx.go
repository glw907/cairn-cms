// Package logx wraps a process output stream so no registered credential reaches a terminal, a
// cron mail, or a scheduler's log. cmd/cairn wraps stdout and stderr in one Writer each before
// any command runs, which is why nothing below cmd/cairn imports this package: the scrub is a
// property of the process's streams, not of any one caller's output.
package logx

import (
	"bytes"
	"io"
	"strings"
	"sync"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
)

// redacted is what a matched credential is replaced with, the same placeholder
// providers.Credential's String and MarshalJSON print.
const redacted = "<redacted>"

// MinLength is the shortest credential Writer will match. A very short value occurs in ordinary
// output by coincidence, so registering one would turn a report into redacted noise, which
// destroys what the operator is reading and is worse than the missed redaction: a real
// Cloudflare or GitHub token is forty characters or more, so nothing a scrub exists to catch
// falls below this.
const MinLength = 8

// Writer redacts every registered credential from what passes through it.
//
// It scrubs over line boundaries rather than over whatever one Write call happens to carry,
// because a credential split across two calls escapes a per-call scan and a renderer that emits
// a row in cells does exactly that. Writes are buffered until a newline; Close flushes whatever
// tail is left, scrubbed. A caller that never calls Close loses a trailing partial line.
//
// A credential carrying a newline cannot be matched whole, so Register adds each of its lines as
// a needle of its own: each body line of a PEM key is then redacted wherever it appears.
//
// A Writer is safe for concurrent use. Setup registers credentials from its runner while a view
// writes from another goroutine, so one mutex guards the needles and the buffer.
type Writer struct {
	mu      sync.Mutex
	w       io.Writer
	needles [][]byte
	skipped int
	buf     []byte
}

// New returns a Writer over w that redacts each of scrub. An empty credential is ignored
// silently, since the three are registered whether or not the operator configured them and an
// absent one must leave the output byte-identical to a run with no credentials at all. A
// non-empty credential shorter than MinLength is registered but never matched, and is counted in
// Skipped so the caller can disclose the gap.
func New(w io.Writer, scrub []providers.Credential) *Writer {
	lw := &Writer{w: w}
	for _, c := range scrub {
		lw.add(c.Reveal())
	}
	return lw
}

// Register adds c to what Writer redacts, from the next line written on. Setup calls it the
// moment a credential arrives, since New takes its credentials once, before any command runs. A
// value with newlines registers line by line, each line under the MinLength rule.
func (w *Writer) Register(c providers.Credential) {
	w.mu.Lock()
	defer w.mu.Unlock()
	for line := range strings.SplitSeq(c.Reveal(), "\n") {
		w.add(strings.TrimSuffix(line, "\r"))
	}
}

// add registers one single-line value. The caller holds w.mu or is New.
func (w *Writer) add(v string) {
	switch {
	case v == "":
	case len(v) < MinLength:
		w.skipped++
	default:
		w.needles = append(w.needles, []byte(v))
	}
}

// Skipped reports how many non-empty credentials, or lines of one, were too short to match.
func (w *Writer) Skipped() int {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.skipped
}

// Write implements io.Writer, emitting every complete line p finishes and holding the rest.
func (w *Writer) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.buf = append(w.buf, p...)
	for {
		i := bytes.IndexByte(w.buf, '\n')
		if i < 0 {
			return len(p), nil
		}
		_, err := w.w.Write(w.clean(w.buf[:i+1]))
		w.buf = append(w.buf[:0], w.buf[i+1:]...)
		if err != nil {
			return len(p), err
		}
	}
}

// Flush emits the unterminated tail, scrubbed, and clears it. An interactive prompt needs this:
// a prompt carries no newline by contract, since the operator types on the same line, so
// without a Flush the buffer holds it until after the read it was asking for and the operator
// types blind. Ordinary output never calls it, which is what keeps the cross-line scrub whole.
func (w *Writer) Flush() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if len(w.buf) == 0 {
		return nil
	}
	_, err := w.w.Write(w.clean(w.buf))
	w.buf = w.buf[:0]
	return err
}

// Close flushes the unterminated tail, scrubbed. It does not close the underlying writer, which
// is a process stream its owner keeps.
func (w *Writer) Close() error {
	return w.Flush()
}

// clean returns line with every registered credential replaced. The caller holds w.mu.
func (w *Writer) clean(line []byte) []byte {
	for _, needle := range w.needles {
		line = bytes.ReplaceAll(line, needle, []byte(redacted))
	}
	return line
}
