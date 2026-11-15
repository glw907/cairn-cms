package main

import (
	"bytes"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/charmbracelet/colorprofile"

	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

func envOf(vars map[string]string) func(string) string {
	return func(name string) string { return vars[name] }
}

func TestLocaleIsUTF8(t *testing.T) {
	tests := []struct {
		name string
		vars map[string]string
		goos string
		want bool
	}{
		{"LANG utf-8", map[string]string{"LANG": "en_US.UTF-8"}, "linux", true},
		{"LANG utf8 lower", map[string]string{"LANG": "C.utf8"}, "linux", true},
		{"LANG C", map[string]string{"LANG": "C"}, "linux", false},
		{"LC_ALL beats LANG", map[string]string{"LC_ALL": "C", "LANG": "en_US.UTF-8"}, "linux", false},
		{"LC_ALL utf-8 beats LANG", map[string]string{"LC_ALL": "en_US.UTF-8", "LANG": "C"}, "linux", true},
		{"LC_CTYPE beats LANG", map[string]string{"LC_CTYPE": "POSIX", "LANG": "C.UTF-8"}, "linux", false},
		{"LC_CTYPE beats LANG utf-8", map[string]string{"LC_CTYPE": "en_US.UTF-8", "LANG": "C"}, "linux", true},
		{"empty LC_ALL falls through", map[string]string{"LC_ALL": "", "LANG": "C.UTF-8"}, "linux", true},
		{"unset on linux", nil, "linux", false},
		{"unset on darwin", nil, "darwin", false},
		{"unset on windows", nil, "windows", true},
		{"set non-UTF-8 on windows", map[string]string{"LANG": "C"}, "windows", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := localeIsUTF8(envOf(tt.vars), tt.goos); got != tt.want {
				t.Errorf("localeIsUTF8(%v, %q) = %v, want %v", tt.vars, tt.goos, got, tt.want)
			}
		})
	}
}

// TestReportTerminalKeepsColourOnANonUTF8Locale drives reportTerminal end to end. Under test
// stdout is a pipe, so ASCII is already true and the glyph half is checked by the next test;
// this one proves the colour profile is the same whatever the locale.
func TestReportTerminalKeepsColourOnANonUTF8Locale(t *testing.T) {
	tests := []struct {
		name string
		vars map[string]string
	}{
		{"UTF-8 locale", map[string]string{"TERM": "xterm-256color", "LANG": "C.UTF-8"}},
		{"C locale", map[string]string{"TERM": "xterm-256color", "LC_ALL": "C"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d := deps{env: envOf(tt.vars)}
			got := reportTerminal(d, &rootFlags{color: colorAlways})
			if got.Profile != colorprofile.TrueColor {
				t.Errorf("Profile = %v, want TrueColor", got.Profile)
			}
		})
	}
	if got := reportTerminal(deps{env: envOf(map[string]string{"TERM": "xterm-256color", "LC_ALL": "C"})}, &rootFlags{}); !got.ASCII {
		t.Error("ASCII = false under LC_ALL=C, want true")
	}
}

// TestWithLocale starts from a terminal detection called capable, which a test cannot build
// through a pipe, and proves the locale alone drops the glyph tier and never the profile.
func TestWithLocale(t *testing.T) {
	capable := style.Terminal{Profile: colorprofile.ANSI256, TTY: true, Columns: 80}
	tests := []struct {
		name      string
		utf8      bool
		wantASCII bool
	}{
		{"UTF-8", true, false},
		{"not UTF-8", false, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := withLocale(capable, tt.utf8)
			if got.ASCII != tt.wantASCII {
				t.Errorf("ASCII = %v, want %v", got.ASCII, tt.wantASCII)
			}
			if got.Profile != colorprofile.ANSI256 || !got.TTY || got.Columns != 80 {
				t.Errorf("withLocale changed more than ASCII: %+v", got)
			}
		})
	}
}

// TestDrawProgressStoppedEarlyWritesNothing holds the delay: a run that settles before the line
// is due leaves the stream untouched, so a fast run never flashes a line and an erase.
func TestDrawProgressStoppedEarlyWritesNothing(t *testing.T) {
	var out bytes.Buffer
	stop := drawProgress(&out, time.Hour, time.Millisecond, func(int) string { return "working" })
	stop()
	if out.Len() != 0 {
		t.Errorf("stream holds %q, want nothing", out.String())
	}
}

// TestDrawProgressErasesLastAndOnce holds the join: every frame returns to the row's start and
// erases it first, the stream ends on one erase with no frame after it, and a second stop adds
// nothing.
func TestDrawProgressErasesLastAndOnce(t *testing.T) {
	const erase = "\r\x1b[2K"
	var out bytes.Buffer
	third := make(chan struct{})
	stop := drawProgress(&out, time.Millisecond, time.Millisecond, func(frame int) string {
		if frame == 2 {
			close(third)
		}
		return fmt.Sprintf("frame %d", frame)
	})
	<-third
	stop()
	got := out.String()
	stop()
	if out.String() != got {
		t.Errorf("a second stop wrote %q", strings.TrimPrefix(out.String(), got))
	}
	segments := strings.Split(strings.TrimPrefix(got, erase), erase)
	if len(segments) < 4 {
		t.Fatalf("stream %q holds %d segments, want at least three frames and the final erase", got, len(segments))
	}
	if last := segments[len(segments)-1]; last != "" {
		t.Errorf("stream ends %q after its last erase, want nothing", last)
	}
	for i, s := range segments[:len(segments)-1] {
		if want := fmt.Sprintf("frame %d", i); s != want {
			t.Errorf("segment %d = %q, want %q", i, s, want)
		}
	}
}

// flushCounter stands in for the logx scrubber, which holds an unterminated line until it is
// flushed, and counts each Flush.
type flushCounter struct {
	bytes.Buffer
	flushes int
}

func (f *flushCounter) Flush() error {
	f.flushes++
	return nil
}

// TestDrawProgressFlushesEveryWrite holds the scrubber rule: a frame and the erase each carry no
// newline, so each is flushed or it never reaches the terminal before the report.
func TestDrawProgressFlushesEveryWrite(t *testing.T) {
	var out flushCounter
	first := make(chan struct{})
	var once sync.Once
	stop := drawProgress(&out, time.Millisecond, time.Hour, func(int) string {
		once.Do(func() { close(first) })
		return "working"
	})
	<-first
	stop()
	if out.flushes != 2 {
		t.Errorf("flushes = %d, want 2: one frame and the erase", out.flushes)
	}
}
