package reporte2e

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"

	"github.com/charmbracelet/x/vt"
	"github.com/creack/pty"
	"github.com/glw907/cairn-cms/tool/v2/internal/testharness"
)

// served reports whether the proxy served the site host at least once, which shows the run
// reached the slow host rather than settling before the progress line was due.
func (f *fixture) served() bool {
	return slices.ContainsFunc(f.proxy.Requests(), func(r testharness.Request) bool {
		return r.Host == siteDomain
	})
}

// The pseudo-terminal's size, which its emulator matches. It is tall enough that the whole
// report fits on one screen, so the final screen is the whole run's last state.
const (
	ptyCols = 100
	ptyRows = 80
)

// siteDelay is how long the fixture's site host takes per request: past the progress line's
// 200 ms delay with frames to spare.
const siteDelay = 1500 * time.Millisecond

// runTimeout bounds one child. A run waits on the site host and on real DNS for the delegation
// and email checks, which takes seconds; a run past this hangs.
const runTimeout = 2 * time.Minute

// progressText is the progress line's text for the fixture site, in tmplHealthProgress.
const progressText = "Checking " + siteID

// eraseLine is the erase the progress line draws and erases with.
const eraseLine = "\x1b[2K"

// spinnerFrames is the UTF-8 spinner's frames, any of which left on a screen is a progress line
// left behind.
const spinnerFrames = "⣾⣽⣻⢿⡿⣟⣯⣷"

// terminal is the controller side of one pseudo-terminal, recording every byte the child wrote
// to it.
type terminal struct {
	controller *os.File
	// tty is the child's side, which the test closes once the child holds it.
	tty *os.File

	mu   sync.Mutex
	raw  bytes.Buffer
	done chan struct{}
}

// openTerminal opens a pseudo-terminal at ptyCols by ptyRows and starts recording it.
func openTerminal(t *testing.T) *terminal {
	t.Helper()
	controller, tty, err := pty.Open()
	if err != nil {
		t.Fatalf("open a pseudo-terminal: %v", err)
	}
	if err := pty.Setsize(tty, &pty.Winsize{Rows: ptyRows, Cols: ptyCols}); err != nil {
		t.Fatalf("size the pseudo-terminal: %v", err)
	}
	term := &terminal{controller: controller, tty: tty, done: make(chan struct{})}
	t.Cleanup(func() {
		_ = tty.Close()
		_ = controller.Close()
	})
	go term.record()
	return term
}

// record copies the controller side into raw until the read fails. Linux reports EIO once
// every holder of the child's side has closed it, which is how the end of the stream reads.
func (term *terminal) record() {
	defer close(term.done)
	buf := make([]byte, 4096)
	for {
		n, err := term.controller.Read(buf)
		term.mu.Lock()
		term.raw.Write(buf[:n])
		term.mu.Unlock()
		if err != nil {
			return
		}
	}
}

// bytes returns a copy of everything recorded so far.
func (term *terminal) bytes() []byte {
	term.mu.Lock()
	defer term.mu.Unlock()
	return bytes.Clone(term.raw.Bytes())
}

// screen returns what a terminal shows after everything recorded so far.
func (term *terminal) screen() string {
	return screenOf(term.bytes())
}

// screenOf replays raw through a terminal emulator at the pseudo-terminal's size and returns
// its screen as text. The emulator answers a terminal query on its input pipe, which nothing
// else reads, so a goroutine drains it rather than let a query block the replay.
func screenOf(raw []byte) string {
	emu := vt.NewEmulator(ptyCols, ptyRows)
	defer func() { _ = emu.Close() }()
	go func() { _, _ = io.Copy(io.Discard, emu) }()
	_, _ = emu.Write(raw)
	return emu.String()
}

// child is one running cairn and the signal of its exit.
type child struct {
	cmd    *exec.Cmd
	exited chan struct{}
	err    error
}

// start runs cairn with args under the fixture's environment and overrides, its stdout and
// stderr on the given streams and its stdin empty, in a session of its own so no signal meant
// for the test reaches it. Each pseudo-terminal's child side is closed in the test once the
// child holds it, so the recorder sees the stream end when the child exits.
func start(t *testing.T, f *fixture, stdout, stderr io.Writer, overrides map[string]string, args ...string) *child {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), runTimeout)
	t.Cleanup(cancel)
	cmd := exec.CommandContext(ctx, f.bin, args...)
	cmd.Env = f.environ(overrides)
	cmd.Stdout = stdout
	cmd.Stderr = stderr
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	cmd.WaitDelay = 5 * time.Second
	if err := cmd.Start(); err != nil {
		t.Fatalf("start %s: %v", f.bin, err)
	}
	for _, stream := range []io.Writer{stdout, stderr} {
		if tty, ok := stream.(*os.File); ok {
			_ = tty.Close()
		}
	}
	c := &child{cmd: cmd, exited: make(chan struct{})}
	go func() {
		c.err = cmd.Wait()
		close(c.exited)
	}()
	return c
}

// wait waits for the child to exit and for each terminal to record the end of its stream. A
// non-zero exit is a verdict, not a failure; a child killed at runTimeout fails the test.
func (c *child) wait(t *testing.T, terms ...*terminal) {
	t.Helper()
	<-c.exited
	if exit, ok := errors.AsType[*exec.ExitError](c.err); ok {
		if exit.ExitCode() < 0 {
			t.Fatalf("cairn did not exit on its own: %v", c.err)
		}
	} else if c.err != nil {
		t.Fatalf("wait for cairn: %v", c.err)
	}
	for _, term := range terms {
		select {
		case <-term.done:
		case <-time.After(10 * time.Second):
			t.Fatal("the pseudo-terminal's stream did not end after cairn exited")
		}
	}
}

// waitWhileRunning polls until ok holds or the child exits, and reports whether ok held while
// the child was still running.
func (c *child) waitWhileRunning(ok func() bool) bool {
	tick := time.NewTicker(10 * time.Millisecond)
	defer tick.Stop()
	for {
		if ok() {
			select {
			case <-c.exited:
				return false
			default:
				return true
			}
		}
		select {
		case <-c.exited:
			return false
		case <-tick.C:
		}
	}
}

// showsProgress reports whether text shows a progress line: its text, or a spinner frame.
func showsProgress(text string) bool {
	return strings.Contains(text, progressText) || strings.ContainsAny(text, spinnerFrames)
}

// TestReportE2EProgressLineDrawsOnStderr puts stdout and stderr on two terminals, so the line
// can be seen on stderr's alone while the run is under way, and the report on stdout's with no
// line on it.
func TestReportE2EProgressLineDrawsOnStderr(t *testing.T) {
	t.Parallel()
	f := newFixture(t, siteDelay)
	out, errOut := openTerminal(t), openTerminal(t)
	c := start(t, f, out.tty, errOut.tty, nil, "health", siteID)
	if !c.waitWhileRunning(func() bool { return showsProgress(errOut.screen()) }) {
		c.wait(t, out, errOut)
		t.Fatalf("no progress line on stderr while cairn ran; stderr recorded %q", errOut.bytes())
	}
	c.wait(t, out, errOut)
	if bytes.Contains(out.bytes(), []byte(progressText)) {
		t.Errorf("stdout carries the progress line: %q", out.bytes())
	}
	final := out.screen()
	if !strings.Contains(final, siteName) || showsProgress(final) {
		t.Errorf("stdout's final screen should hold the report and no progress line:\n%s", final)
	}
	if final := errOut.screen(); showsProgress(final) {
		t.Errorf("stderr's final screen still shows the progress line:\n%s", final)
	}
}

// TestReportE2EProgressLineLeavesTheFinalScreen shares one terminal between the two streams, as
// an operator's shell does: the line shows during the run, the final screen holds the report
// alone, and the UTF-8 locale painted at least one byte at or above 0x80, the control for the C
// locale case below.
func TestReportE2EProgressLineLeavesTheFinalScreen(t *testing.T) {
	t.Parallel()
	f := newFixture(t, siteDelay)
	term := openTerminal(t)
	c := start(t, f, term.tty, term.tty, nil, "health", siteID)
	if !c.waitWhileRunning(func() bool { return showsProgress(term.screen()) }) {
		c.wait(t, term)
		t.Fatalf("no progress line on the terminal while cairn ran; it recorded %q", term.bytes())
	}
	c.wait(t, term)
	final := term.screen()
	if !strings.Contains(final, siteName) || showsProgress(final) {
		t.Errorf("the final screen should hold the report and no progress line:\n%s", final)
	}
	if !bytes.ContainsFunc(term.bytes(), func(r rune) bool { return r >= 0x80 }) {
		t.Error("a UTF-8 run painted no byte at or above 0x80, so the C locale case proves nothing")
	}
}

// TestReportE2EInterruptErasesTheProgressLine interrupts the child this test started while its
// progress line shows, and finds no line left on the screen.
func TestReportE2EInterruptErasesTheProgressLine(t *testing.T) {
	t.Parallel()
	f := newFixture(t, 30*time.Second)
	term := openTerminal(t)
	c := start(t, f, term.tty, term.tty, nil, "health", siteID)
	if !c.waitWhileRunning(func() bool { return showsProgress(term.screen()) }) {
		c.wait(t, term)
		t.Fatalf("no progress line to interrupt; the terminal recorded %q", term.bytes())
	}
	if err := c.cmd.Process.Signal(os.Interrupt); err != nil {
		t.Fatalf("interrupt cairn: %v", err)
	}
	c.wait(t, term)
	if final := term.screen(); showsProgress(final) {
		t.Errorf("the progress line survived the interrupt:\n%s", final)
	}
}

// TestReportE2EProgressLineAbsent flips one condition per case from the shared-terminal run
// above and finds no progress line drawn at all, in the raw stream rather than on the final
// screen, since an erased line would pass a screen check. Each case's site host is still
// served, so the run lasted past the line's delay.
func TestReportE2EProgressLineAbsent(t *testing.T) {
	t.Parallel()
	for _, tt := range []struct {
		name      string
		overrides map[string]string
		args      []string
	}{
		{"CI set", map[string]string{"CI": "1"}, nil},
		{"--quiet", nil, []string{"--quiet"}},
		{"--json", nil, []string{"--json"}},
		{"--verbose", nil, []string{"--verbose"}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			f := newFixture(t, siteDelay)
			term := openTerminal(t)
			c := start(t, f, term.tty, term.tty, tt.overrides, append([]string{"health", siteID}, tt.args...)...)
			c.wait(t, term)
			if raw := term.bytes(); bytes.Contains(raw, []byte(progressText)) || bytes.Contains(raw, []byte(eraseLine)) {
				t.Errorf("the terminal recorded a progress line: %q", raw)
			}
			if !f.served() {
				t.Error("the run never reached the site host, so it settled before the line was due")
			}
		})
	}

	t.Run("stdout a pipe", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, siteDelay)
		var out bytes.Buffer
		errOut := openTerminal(t)
		c := start(t, f, &out, errOut.tty, nil, "health", siteID)
		c.wait(t, errOut)
		if raw := errOut.bytes(); bytes.Contains(raw, []byte(progressText)) || bytes.Contains(raw, []byte(eraseLine)) {
			t.Errorf("stderr recorded a progress line with stdout a pipe: %q", raw)
		}
		if !strings.Contains(out.String(), siteName) || !f.served() {
			t.Errorf("the run printed no report or never reached the site host; stdout %q", out.String())
		}
	})

	t.Run("TERM=dumb", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, siteDelay)
		out, errOut := openTerminal(t), openTerminal(t)
		c := start(t, f, out.tty, errOut.tty, map[string]string{"TERM": "dumb"}, "health", siteID)
		c.wait(t, out, errOut)
		raw := errOut.bytes()
		if bytes.Contains(raw, []byte(progressText)) {
			t.Errorf("stderr recorded a progress line under TERM=dumb: %q", raw)
		}
		if bytes.IndexByte(raw, 0x1b) >= 0 {
			t.Errorf("stderr recorded an ESC byte under TERM=dumb: %q", raw)
		}
		if !strings.Contains(out.screen(), siteName) || !f.served() {
			t.Errorf("the run printed no report or never reached the site host:\n%s", out.screen())
		}
	})

	t.Run("stderr a file", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, siteDelay)
		out := openTerminal(t)
		path := filepath.Join(t.TempDir(), "stderr")
		errFile, err := os.Create(path)
		if err != nil {
			t.Fatal(err)
		}
		c := start(t, f, out.tty, errFile, nil, "health", siteID)
		c.wait(t, out)
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		if bytes.IndexByte(data, 0x1b) >= 0 {
			t.Errorf("the stderr file holds an ESC byte: %q", data)
		}
		if !strings.Contains(out.screen(), siteName) || !f.served() {
			t.Errorf("the run printed no report or never reached the site host:\n%s", out.screen())
		}
	})
}

// plainEnv is the override that turns styling off on a terminal.
var plainEnv = map[string]string{"CAIRN_PLAIN": "1"}

// offTerminal maps the pseudo-terminal's output translation, each newline written as \r\n, back
// to the newline a pipe carries, and fails the test if a carriage return or an ESC byte remains,
// either of which is a styled path that did not take the pipe's bytes.
func offTerminal(t *testing.T, stream string, raw []byte) []byte {
	t.Helper()
	out := bytes.ReplaceAll(raw, []byte("\r\n"), []byte("\n"))
	if i := bytes.IndexByte(out, '\r'); i >= 0 {
		t.Fatalf("%s under CAIRN_PLAIN holds a carriage return at offset %d: %q", stream, i, raw)
	}
	if i := bytes.IndexByte(out, 0x1b); i >= 0 {
		t.Fatalf("%s under CAIRN_PLAIN holds an ESC byte at offset %d: %q", stream, i, raw)
	}
	return out
}

// TestReportE2EPlainIsThePipe holds that CAIRN_PLAIN=1 on a terminal prints what a pipe receives.
// cairn health, every site, runs with stdout and stderr on two terminals beside a piped run of the
// same command: stdout's bytes, with the terminal's \r\n mapped to \n, equal the pipe's once each
// checked line's clock text is masked, and stderr's terminal records no progress line. A control
// run without CAIRN_PLAIN draws the line, so its absence is plain mode's doing. Help and an error
// run the same way and equal their piped bytes, beside a control that paints them.
func TestReportE2EPlainIsThePipe(t *testing.T) {
	t.Parallel()

	t.Run("health", func(t *testing.T) {
		t.Parallel()
		diff := comparePlainHealth(t)
		if diff != "" {
			t.Logf("first attempt differs outside the clock lines, rerunning once:\n%s", diff)
			diff = comparePlainHealth(t)
		}
		if diff != "" {
			t.Error(diff)
		}
	})

	t.Run("health control", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, siteDelay)
		out, errOut := openTerminal(t), openTerminal(t)
		c := start(t, f, out.tty, errOut.tty, nil, "health")
		if !c.waitWhileRunning(func() bool { return showsProgress(errOut.screen()) }) {
			c.wait(t, out, errOut)
			t.Fatalf("no progress line on stderr without CAIRN_PLAIN; stderr recorded %q", errOut.bytes())
		}
		c.wait(t, out, errOut)
	})

	for _, tt := range []struct {
		name string
		args []string
		// stderr names the stream the run writes its output to.
		stderr bool
	}{
		{"help", []string{"--help"}, false},
		{"an error", []string{"healt"}, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			f := newFixture(t, 0)
			ctx, cancel := context.WithTimeout(t.Context(), runTimeout)
			defer cancel()
			want := runPipe(ctx, f, f.bin, tt.args...)
			if want.err != nil {
				t.Fatal(want.err)
			}
			wantBytes := want.stdout
			if tt.stderr {
				wantBytes = want.stderr
			}
			if len(wantBytes) == 0 {
				t.Fatalf("cairn %s printed nothing to compare on its stream", strings.Join(tt.args, " "))
			}

			plain := ptyRun(t, f, plainEnv, tt.stderr, tt.args...)
			got := offTerminal(t, tt.name, plain)
			t.Logf("cairn %s under CAIRN_PLAIN: %d bytes on the terminal, %d through a pipe", strings.Join(tt.args, " "), len(got), len(wantBytes))
			if d := firstDiff(wantBytes, got); d != "" {
				t.Errorf("CAIRN_PLAIN on a terminal differs from the pipe at %s\npipe:\n%s\nterminal:\n%s", d, wantBytes, got)
			}
			if styled := ptyRun(t, f, nil, tt.stderr, tt.args...); bytes.IndexByte(styled, 0x1b) < 0 {
				t.Errorf("the control run without CAIRN_PLAIN painted no ESC byte, so the comparison proves nothing: %q", styled)
			}
		})
	}
}

// ptyRun runs cairn with args with stdout and stderr on two terminals and returns the raw bytes
// of the one stderr names.
func ptyRun(t *testing.T, f *fixture, overrides map[string]string, stderr bool, args ...string) []byte {
	t.Helper()
	out, errOut := openTerminal(t), openTerminal(t)
	c := start(t, f, out.tty, errOut.tty, overrides, args...)
	c.wait(t, out, errOut)
	if stderr {
		return errOut.bytes()
	}
	return out.bytes()
}

// comparePlainHealth runs cairn health under CAIRN_PLAIN on two terminals and through a pipe at
// once, fails the test on a progress line or a styled byte, and returns a description of any
// difference left between the two stdouts after the clock mask, or "". Each run has its own
// fixture, so the terminal run's fixture records only that run's requests.
func comparePlainHealth(t *testing.T) string {
	t.Helper()
	f, piped := newFixture(t, siteDelay), newFixture(t, siteDelay)
	ctx, cancel := context.WithTimeout(t.Context(), runTimeout)
	defer cancel()
	var pipe pipeResult
	var wg sync.WaitGroup
	wg.Go(func() { pipe = runPipe(ctx, piped, piped.bin, "health") })
	out, errOut := openTerminal(t), openTerminal(t)
	c := start(t, f, out.tty, errOut.tty, plainEnv, "health")
	c.wait(t, out, errOut)
	wg.Wait()
	if pipe.err != nil {
		t.Fatal(pipe.err)
	}

	if raw := errOut.bytes(); showsProgress(string(raw)) || bytes.Contains(raw, []byte(eraseLine)) {
		t.Fatalf("stderr's terminal recorded a progress line under CAIRN_PLAIN: %q", raw)
	}
	if !f.served() {
		t.Fatal("the terminal run never reached the site host, so it settled before the line was due")
	}
	got, n := maskClock(offTerminal(t, "stdout", out.bytes()))
	want, m := maskClock(pipe.stdout)
	t.Logf("cairn health under CAIRN_PLAIN: %d bytes on the terminal, %d through a pipe, %d and %d checked lines masked", len(got), len(want), n, m)
	if n != 1 || m != 1 || !bytes.Contains(want, []byte(siteName)) {
		t.Fatalf("masked %d and %d checked lines, want 1 each, over a report for %s:\n%s", n, m, siteName, want)
	}
	if d := firstDiff(want, got); d != "" {
		return "CAIRN_PLAIN health on a terminal differs from the pipe at " + d + "\npipe:\n" + string(want) + "\nterminal:\n" + string(got)
	}
	return ""
}

// TestReportE2ECLocalePaintsASCII runs under LC_ALL=C on a terminal: the report and the progress
// line still draw, and no byte at or above 0x80 reaches the terminal. Colour is allowed, since
// the locale decides the marks and never the colour.
func TestReportE2ECLocalePaintsASCII(t *testing.T) {
	t.Parallel()
	f := newFixture(t, siteDelay)
	term := openTerminal(t)
	c := start(t, f, term.tty, term.tty, map[string]string{"LC_ALL": "C"}, "health", siteID)
	c.wait(t, term)
	raw := term.bytes()
	if i := bytes.IndexFunc(raw, func(r rune) bool { return r >= 0x80 }); i >= 0 {
		t.Errorf("byte %#x at offset %d under LC_ALL=C; the terminal recorded %q", raw[i], i, raw)
	}
	if !bytes.Contains(raw, []byte(progressText)) {
		t.Error("no progress line under LC_ALL=C, so the ASCII spinner went unchecked")
	}
	if final := term.screen(); !strings.Contains(final, siteName) || showsProgress(final) {
		t.Errorf("the final screen should hold the report and no progress line:\n%s", final)
	}
}
