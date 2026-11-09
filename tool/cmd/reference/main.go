// Command reference writes the setup reference: every flag, derived name, step, event, and exit
// code of cairn new, read from the code. `make reference` writes its output to
// docs/admin/setup-reference.md at the repository root, and its test fails when the committed
// page and a fresh render disagree.
//
// Like cmd/mangen, it cannot import cmd/cairn (a package main), so it builds the real binary and
// reads the flags from `cairn new --help`. Steps, events, and names come from internal/setup,
// and the exit codes from the committed golden testdata/new/exit-codes.txt, which a cmd/cairn
// test pins to the copy table.
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/exe"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
)

// intro is the page's fixed prose.
const intro = `# The cairn new setup reference

This page is generated from the code by ` + "`make reference`" + `. Do not edit it by hand.

It describes how to run ` + "`cairn new`" + ` without a terminal: the flags that answer each question, the
names setup derives, the steps it takes, the events it writes, and the exit codes it returns.
Run ` + "`cairn new --plan plan.json`" + ` with the answers as flags, review the plan, and then run
` + "`cairn new --apply plan.json`" + `. [Set up a site with an agent](./set-up-with-an-agent.md) walks
through the two calls.
`

// flagLine matches one line of the Flags block of `cairn new --help`: a long name, an optional
// type word, and the usage text.
var flagLine = regexp.MustCompile(`^\s+(?:-\w, )?--([a-z-]+)(?: ([a-z]+))?\s{2,}(.*)$`)

// moduleRoot is the tool module's root, resolved from this file.
func moduleRoot() string {
	_, thisFile, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(thisFile), "..", "..")
}

// helpFlags builds cairn and returns the rows of the flags table, read from `cairn new --help`.
func helpFlags() ([]string, error) {
	tmp, err := os.MkdirTemp("", "cairn-reference")
	if err != nil {
		return nil, err
	}
	defer func() { _ = os.RemoveAll(tmp) }()
	bin, err := exe.Build(moduleRoot(), tmp)
	if err != nil {
		return nil, err
	}
	out, err := exec.Command(bin, "new", "--help").CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("cairn new --help: %w: %s", err, out)
	}
	var rows []string
	inFlags := false
	for line := range strings.SplitSeq(string(out), "\n") {
		switch {
		case line == "Flags:":
			inFlags = true
		case line == "":
			inFlags = false
		case inFlags:
			m := flagLine.FindStringSubmatch(line)
			if m == nil || m[1] == "help" {
				continue
			}
			value := m[2]
			if value == "" {
				value = "none"
			}
			rows = append(rows, fmt.Sprintf("| `--%s` | %s | %s |", m[1], value, m[3]))
		}
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("no flags found in cairn new --help")
	}
	return rows, nil
}

// exitCodes reads the committed exit-code golden and returns its table rows and its closing note.
func exitCodes() (rows []string, note string, err error) {
	b, err := os.ReadFile(filepath.Join(moduleRoot(), "testdata", "new", "exit-codes.txt"))
	if err != nil {
		return nil, "", err
	}
	for line := range strings.SplitSeq(strings.TrimSpace(string(b)), "\n") {
		code, meaning, ok := strings.Cut(line, "  ")
		if ok && len(code) == 1 {
			rows = append(rows, fmt.Sprintf("| %s | %s |", code, strings.TrimSpace(meaning)))
			continue
		}
		if strings.HasPrefix(line, "A stream") {
			note = line
		}
	}
	return rows, note, nil
}

// render builds the page.
func render() (string, error) {
	flags, err := helpFlags()
	if err != nil {
		return "", err
	}
	codes, note, err := exitCodes()
	if err != nil {
		return "", err
	}
	const example = "My Site"
	n, err := setup.DeriveNames(example, 0)
	if err != nil {
		return "", err
	}

	var b strings.Builder
	b.WriteString(intro)

	b.WriteString("\n## Flags\n\n| Flag | Value | Meaning |\n| --- | --- | --- |\n")
	for _, r := range flags {
		b.WriteString(r + "\n")
	}

	fmt.Fprintf(&b, "\n## Derived names\n\nSetup derives every name from the site name. For the site name %q:\n\n", example)
	b.WriteString("| Name | Example |\n| --- | --- |\n")
	for _, r := range [][2]string{
		{"Repository", n.Repository}, {"Worker", n.Worker}, {"D1 database", n.Database},
		{"R2 bucket", n.Bucket}, {"GitHub App", n.App}, {"Folder", n.Folder},
	} {
		fmt.Fprintf(&b, "| %s | `%s` |\n", r[0], r[1])
	}
	b.WriteString("\nA taken name adds a suffix such as `-2` to the repository, Worker, database, and bucket names.\nThe App name never takes the suffix.\n")

	b.WriteString("\n## Steps\n\n| Step | Who | What happens |\n| --- | --- | --- |\n")
	for _, s := range setup.Steps() {
		fmt.Fprintf(&b, "| `%s` | %s | %s |\n", s.ID, s.Actor, s.Label)
	}

	b.WriteString("\n## Events\n\nWith `--apply`, setup writes one JSON object per line to stdout. Each carries `schemaVersion`,\n`kind`, and `timestamp`.\n\n| Kind | Meaning |\n| --- | --- |\n")
	for _, e := range []struct {
		kind setup.EventKind
		what string
	}{
		{setup.StepStarted, "a step began"},
		{setup.StepDone, "a step finished"},
		{setup.StepFailed, "a step stopped the run, with the four-part failure"},
		{setup.Waiting, "setup waits on the owner in the browser"},
		{setup.Resumed, "the run picked up an unfinished record"},
		{setup.SummaryKind, "every derived value, for the owner to review"},
	} {
		fmt.Fprintf(&b, "| `%s` | %s |\n", e.kind, e.what)
	}

	b.WriteString("\nA `waiting` event carries one of these states:\n\n| State | Sentence |\n| --- | --- |\n")
	for _, w := range []setup.WaitState{
		setup.WaitCloudflare, setup.WaitCreateApp, setup.WaitInstallAll, setup.WaitInstallRepo, setup.WaitCloudflareReconsent,
	} {
		fmt.Fprintf(&b, "| `%s` | %s |\n", w, setup.WaitSentence(w, "<name>", "<repo>"))
	}

	b.WriteString("\n## Exit codes\n\n| Code | Meaning |\n| --- | --- |\n")
	for _, r := range codes {
		b.WriteString(r + "\n")
	}
	b.WriteString("\n" + note + "\n")
	return b.String(), nil
}

func main() {
	page, err := render()
	if err != nil {
		fmt.Fprintln(os.Stderr, "reference:", err)
		os.Exit(1)
	}
	fmt.Print(page)
}
