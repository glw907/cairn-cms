package logx

import (
	"bytes"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// token is a sentinel long enough to be matched, shaped like the bearer tokens cairn reads.
const token = "v1.0-aaaaaaaabbbbbbbbccccccccdddddddd"

// write sends every string through one Writer and returns what reached the underlying buffer
// after Close.
func write(t *testing.T, creds []providers.Credential, chunks ...string) string {
	t.Helper()
	var out bytes.Buffer
	w := New(&out, creds)
	for _, c := range chunks {
		if _, err := w.Write([]byte(c)); err != nil {
			t.Fatalf("Write(%q): %v", c, err)
		}
	}
	if err := w.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
	return out.String()
}

// TestACredentialInALogLineIsRedacted covers the plain case: a whole line arriving in one Write.
func TestACredentialInALogLineIsRedacted(t *testing.T) {
	got := write(t, []providers.Credential{providers.NewCredential(token)},
		"cairn: sending Authorization: Bearer "+token+" to cloudflare\n")

	if strings.Contains(got, token) {
		t.Errorf("output %q still carries the credential", got)
	}
	if !strings.Contains(got, redacted) {
		t.Errorf("output %q does not carry %s", got, redacted)
	}
}

// TestACredentialSplitAcrossWritesIsRedacted is the reason the scrub is line-based: a per-call
// scan sees no whole credential in any one of these writes, and a renderer that emits a row in
// cells produces exactly this shape.
func TestACredentialSplitAcrossWritesIsRedacted(t *testing.T) {
	chunks := make([]string, 0, len(token)+1)
	for _, b := range []byte(token) {
		chunks = append(chunks, string(b))
	}
	chunks = append(chunks, "\n")

	got := write(t, []providers.Credential{providers.NewCredential(token)}, chunks...)
	if got != redacted+"\n" {
		t.Errorf("assembled output = %q, want %q", got, redacted+"\n")
	}
}

// TestCloseFlushesAnUnterminatedTail asserts the buffered line is not simply lost when a run
// ends without a final newline, and that it is scrubbed on the way out.
func TestCloseFlushesAnUnterminatedTail(t *testing.T) {
	got := write(t, []providers.Credential{providers.NewCredential(token)}, "tail "+token)
	if got != "tail "+redacted {
		t.Errorf("flushed tail = %q, want %q", got, "tail "+redacted)
	}
}

// TestAnAbsentCredentialChangesNothing is criterion 22's first test: cmd/cairn registers all
// three credentials whether or not the operator configured them, so an unconfigured one must
// leave the stream byte-identical to a run with no credentials at all.
func TestAnAbsentCredentialChangesNothing(t *testing.T) {
	const body = "CRITICAL  907.life  1 failing\nfix: push a build\n"

	absent := write(t, []providers.Credential{{}, providers.NewCredential(""), {}}, body)
	none := write(t, nil, body)

	if absent != none {
		t.Errorf("with absent credentials = %q, with none = %q", absent, none)
	}
	if absent != body {
		t.Errorf("output = %q, want the input unchanged", absent)
	}
}

// TestAShortCredentialDoesNotRedactUnrelatedText is criterion 22's second test: a two-character
// value occurs everywhere in ordinary output, and redacting it would destroy the report rather
// than protect anything.
func TestAShortCredentialDoesNotRedactUnrelatedText(t *testing.T) {
	const body = "ok 2 sites checked, ok\n"

	var out bytes.Buffer
	w := New(&out, []providers.Credential{providers.NewCredential("ok")})
	if _, err := w.Write([]byte(body)); err != nil {
		t.Fatalf("Write: %v", err)
	}
	if err := w.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}

	if out.String() != body {
		t.Errorf("output = %q, want the input unchanged", out.String())
	}
	if w.Skipped() != 1 {
		t.Errorf("Skipped() = %d, want 1", w.Skipped())
	}
}

// TestAnAbsentCredentialIsNotCountedAsSkipped separates the two cases the minimum length covers:
// an empty value is an unconfigured credential and is silently ignored, while a short one is a
// real value the scrub will not match and the operator is owed a word about it.
func TestAnAbsentCredentialIsNotCountedAsSkipped(t *testing.T) {
	var out bytes.Buffer
	w := New(&out, []providers.Credential{{}, providers.NewCredential("")})
	if w.Skipped() != 0 {
		t.Errorf("Skipped() = %d for two absent credentials, want 0", w.Skipped())
	}
}

// TestOnlyLogxRevealsACredential holds providers.Credential.Reveal to its one legitimate caller.
// Every other reader of a token goes through the redacting methods or hands the Credential to a
// client, which is what keeps the plaintext reachable from two files in the module.
func TestOnlyLogxRevealsACredential(t *testing.T) {
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve this file's own path")
	}
	root := filepath.Dir(filepath.Dir(filepath.Dir(thisFile)))

	allowed := map[string]bool{
		filepath.Join("internal", "providers", "cred.go"): true,
		filepath.Join("internal", "logx", "logx.go"):      true,
	}
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(d.Name(), ".go") || strings.HasSuffix(d.Name(), "_test.go") {
			return err
		}
		rel, relErr := filepath.Rel(root, path)
		if relErr != nil {
			return relErr
		}
		if allowed[rel] {
			return nil
		}
		body, readErr := os.ReadFile(path)
		if readErr != nil {
			return readErr
		}
		if bytes.Contains(body, []byte(".Reveal()")) {
			t.Errorf("%s calls Credential.Reveal; read the token through a provider client instead", rel)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk %s: %v", root, err)
	}
}

// TestFlushEmitsAPartialLine covers the interactive prompt's need: a write carrying no newline
// is held by the buffered scrub, and Flush is what puts it on the stream before the read the
// prompt asks for.
func TestFlushEmitsAPartialLine(t *testing.T) {
	var out bytes.Buffer
	w := New(&out, []providers.Credential{providers.NewCredential(token)})

	if _, err := w.Write([]byte("CAIRN_GH_READ_TOKEN: ")); err != nil {
		t.Fatalf("Write: %v", err)
	}
	if got := out.String(); got != "" {
		t.Fatalf("underlying writer holds %q before Flush, want nothing", got)
	}

	if err := w.Flush(); err != nil {
		t.Fatalf("Flush: %v", err)
	}
	if got := out.String(); got != "CAIRN_GH_READ_TOKEN: " {
		t.Errorf("after Flush the writer holds %q, want the prompt", got)
	}

	// A flushed prompt must not leave the tail behind for Close to emit a second time.
	if err := w.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
	if got := out.String(); got != "CAIRN_GH_READ_TOKEN: " {
		t.Errorf("after Close the writer holds %q, want the prompt once", got)
	}
}

// TestFlushStillScrubsTheTail asserts Flush is not an escape hatch around the redaction: a
// partial line carrying a credential is scrubbed on its way out, the same as a whole line.
func TestFlushStillScrubsTheTail(t *testing.T) {
	var out bytes.Buffer
	w := New(&out, []providers.Credential{providers.NewCredential(token)})

	if _, err := w.Write([]byte("value " + token)); err != nil {
		t.Fatalf("Write: %v", err)
	}
	if err := w.Flush(); err != nil {
		t.Fatalf("Flush: %v", err)
	}
	if strings.Contains(out.String(), token) {
		t.Errorf("flushed tail %q still carries the credential", out.String())
	}
}
