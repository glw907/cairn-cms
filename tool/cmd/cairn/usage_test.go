package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/exe"
	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/logx"
	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// builtBinary builds cairn once per test run and returns its path. The falsification table below
// has to run against the real process: a cobra.Command driven in memory never reaches the exit
// code, and the exit code is the whole assertion.
var builtBinary = sync.OnceValues(func() (string, error) {
	dir, err := os.MkdirTemp("", "cairn-usage")
	if err != nil {
		return "", err
	}
	bin := exe.Path(dir, "cairn")
	// The build runs from the module root: a test binary's working directory is its own package
	// directory, where ./cmd/cairn does not resolve.
	build := exec.Command("go", "build", "-o", bin, "./cmd/cairn")
	build.Dir = filepath.Join("..", "..")
	out, err := build.CombinedOutput()
	if err != nil {
		return "", errors.New("go build: " + err.Error() + ": " + string(out))
	}
	return bin, nil
})

// runBinary runs the built cairn with args, against an empty registry and no credentials, and
// returns its streams and exit code.
func runBinary(t *testing.T, args ...string) (stdout, stderr string, code int) {
	t.Helper()
	bin, err := builtBinary()
	if err != nil {
		t.Fatalf("build cairn: %v", err)
	}

	home := t.TempDir()
	cmd := exec.Command(bin, args...)
	cmd.Env = append(os.Environ(),
		"HOME="+home,
		"XDG_CONFIG_HOME="+filepath.Join(home, "config"),
		"USERPROFILE="+home,
		"CAIRN_CF_ACCOUNT_ID=",
		"CAIRN_CF_READ_TOKEN=",
		"CAIRN_GH_READ_TOKEN=",
	)
	var outBuf, errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf

	if err := cmd.Run(); err != nil {
		if _, ok := errors.AsType[*exec.ExitError](err); !ok {
			t.Fatalf("run %v: %v", args, err)
		}
	}
	return outBuf.String(), errBuf.String(), cmd.ProcessState.ExitCode()
}

// falsificationTable is the six invocations a usage error can take: an unknown flag, an unknown
// subcommand, a malformed flag value, an argument the registry does not hold, an argument outside
// a closed set, and a command group named with no subcommand. Bare `cairn health` is not a row:
// it is a valid sweep over every registered site.
var falsificationTable = [][]string{
	{"--nope"},
	{"frobnicate"},
	{"health", "--error-threshold", "abc"},
	{"health", "no-such-site"},
	{"auth", "set", "NOT_A_VAR"},
	{"auth"},
}

// TestAnOutOfBoundsWidthExitsUnknown takes the --width bounds to the real process, where the
// exit code exists: an in-memory run proves the refusal but never the code a scheduled caller
// reads. The four values bracket both bounds from outside.
func TestAnOutOfBoundsWidthExitsUnknown(t *testing.T) {
	for _, value := range []string{"0", "-1", strconv.Itoa(widthMin - 1), strconv.Itoa(widthMax + 1)} {
		t.Run(value, func(t *testing.T) {
			stdout, stderr, code := runBinary(t, "health", "--width", value)

			if code != int(spine.VerdictUnknown) {
				t.Errorf("exit code = %d, want %d", code, int(spine.VerdictUnknown))
			}
			if len(stdout) != 0 {
				t.Errorf("stdout = %q, want no bytes at all", stdout)
			}
			if !strings.Contains(stderr, "--width") {
				t.Errorf("stderr = %q, want the line to name --width", stderr)
			}
		})
	}
}

// TestAThemeOutsideItsTwoValuesExitsUnknown takes --theme to the real process, where the exit
// code exists. `auto` is the row that matters most: it is the value an operator who knows other
// tools would reach for, and cairn 1.0 detects no terminal background, so it has to be refused
// rather than quietly treated as the default.
func TestAThemeOutsideItsTwoValuesExitsUnknown(t *testing.T) {
	for _, value := range []string{"auto", "purple"} {
		t.Run(value, func(t *testing.T) {
			stdout, stderr, code := runBinary(t, "health", "--theme", value)

			if code != int(spine.VerdictUnknown) {
				t.Errorf("exit code = %d, want %d", code, int(spine.VerdictUnknown))
			}
			if len(stdout) != 0 {
				t.Errorf("stdout = %q, want no bytes at all", stdout)
			}
			if !strings.Contains(stderr, "--theme") {
				t.Errorf("stderr = %q, want the line to name --theme", stderr)
			}
		})
	}
}

// TestAUsageErrorExitsUnknownWithEmptyStdout runs the falsification table against the built
// binary. Byte-empty stdout is the assertion that matters as much as the code: under --json an
// empty stdout has to mean the invocation was wrong, never that the site is healthy.
func TestAUsageErrorExitsUnknownWithEmptyStdout(t *testing.T) {
	for _, args := range falsificationTable {
		t.Run(strings.Join(args, " "), func(t *testing.T) {
			stdout, stderr, code := runBinary(t, args...)

			if code != int(spine.VerdictUnknown) {
				t.Errorf("exit code = %d, want %d", code, int(spine.VerdictUnknown))
			}
			if len(stdout) != 0 {
				t.Errorf("stdout = %q, want no bytes at all", stdout)
			}
			if !strings.Contains(stderr, "cairn: ") {
				t.Errorf("stderr = %q, want a cairn: prefixed line", stderr)
			}
		})
	}
}

// TestHelpAndVersionExitZero pins the deliberate deviation from the monitoring guidelines, which
// would have both exit 3. A person running cairn --help should not see a failure, and no
// scheduled routine invokes either.
func TestHelpAndVersionExitZero(t *testing.T) {
	for _, args := range [][]string{{"--help"}, {"--version"}, {"health", "--help"}} {
		t.Run(strings.Join(args, " "), func(t *testing.T) {
			stdout, _, code := runBinary(t, args...)
			if code != 0 {
				t.Errorf("exit code = %d, want 0", code)
			}
			if stdout == "" {
				t.Error("stdout is empty; --help and --version write their payload to stdout")
			}
		})
	}
}

// TestEveryErrorCarriesTheCairnPrefix covers the three shapes an error reaches an operator in: a
// usage error built at the flag boundary, a command's own refusal, and a raw Go error from deeper
// in the tool that never passed through the messages table.
func TestEveryErrorCarriesTheCairnPrefix(t *testing.T) {
	tests := []struct {
		name string
		err  error
	}{
		{"a usage error", flagError("cairn health", errors.New("unknown flag: --nope"))},
		{"a command error", unknownSiteError("no-such-site")},
		{"a tool fault", errors.New("store: parse record: unexpected end of JSON input")},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := translateError(tt.err).Error()
			if !strings.HasPrefix(got, "cairn: ") {
				t.Errorf("message %q does not start with %q", got, "cairn: ")
			}
			if strings.Contains(got, "goroutine ") {
				t.Errorf("message %q carries a stack trace", got)
			}
		})
	}
}

// TestAFlagErrorNamesItsOwnSubcommand is why the hint is built from the command the flag reached
// rather than from the root: an agent told to run `cairn --help` after mistyping a flag on
// `cairn health` reads the wrong page.
func TestAFlagErrorNamesItsOwnSubcommand(t *testing.T) {
	d, _ := testDeps(t)
	_, _, err := execTree(t, d, "health", "--erro-threshold", "5")
	if err == nil {
		t.Fatal("a misspelled flag was accepted")
	}

	got := err.Error()
	if !strings.Contains(got, "Run `cairn health --help`") {
		t.Errorf("error %q does not name the subcommand's own help", got)
	}
}

// TestTheFourReportlessErrorsReachTheirCodeWithoutExitCode covers the second of the two ways a
// process exit code is decided. None of these four can be expressed in spine.ExitCode's inputs,
// which are site verdicts, listing errors, and an expected site count, so the two can never
// disagree about one run.
func TestTheFourReportlessErrorsReachTheirCodeWithoutExitCode(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want spine.Verdict
	}{
		{"a cancelled run", context.Canceled, spine.VerdictUnknown},
		{"a usage error", flagError("cairn health", errors.New("unknown flag: --nope")), spine.VerdictUnknown},
		{"auth probe's typed coded error", codedExit(spine.VerdictCritical), spine.VerdictCritical},
		{"a tool fault", errors.New("store: parse record"), spine.VerdictUnknown},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := exitVerdict(tt.err); got != tt.want {
				t.Errorf("exitVerdict = %v (%d), want %v (%d)", got, int(got), tt.want, int(tt.want))
			}
		})
	}
}

// TestOnlyMainMapsAReportlessErrorToACode asserts the mapping function names spine.ExitCode
// nowhere: the two ways a code is decided have to stay separate in the source, not only in the
// values they happen to produce today.
func TestOnlyMainMapsAReportlessErrorToACode(t *testing.T) {
	body := readToolFile(t, "cmd/cairn/main.go")
	if strings.Contains(body, "spine.ExitCode(") {
		t.Error("cmd/cairn/main.go calls spine.ExitCode; a run that produced no report is mapped by exitVerdict alone")
	}
}

// panicSentinel is the value the recovery test panics with. The secret field is what must never
// reach either stream: a panic raised in a credential-carrying frame can carry a token, and Go's
// own panic output would print the whole value to the real os.Stderr.
type panicSentinel struct {
	secret string
}

// TestMainRecoversAPanicWithoutPrintingItsValue covers every frame outside a health check, which
// health.Run already recovers on its own.
func TestMainRecoversAPanicWithoutPrintingItsValue(t *testing.T) {
	const sentinel = "shhh-this-is-a-token"

	d, _ := testDeps(t)
	d.registryDir = func() (string, error) { panic(panicSentinel{secret: sentinel}) }

	var out, errOut bytes.Buffer
	code := runTree(context.Background(), d, &out, &errOut, []string{"sites", "list"})

	if code != int(spine.VerdictUnknown) {
		t.Errorf("exit code = %d, want %d", code, int(spine.VerdictUnknown))
	}
	for name, stream := range map[string]string{"stdout": out.String(), "stderr": errOut.String()} {
		if strings.Contains(stream, sentinel) {
			t.Errorf("%s = %q, which carries the panic value", name, stream)
		}
	}
	got := errOut.String()
	if !strings.Contains(got, "main.panicSentinel") {
		t.Errorf("stderr = %q, want the panic value's type named", got)
	}
	if !strings.Contains(got, "cairn sites list") {
		t.Errorf("stderr = %q, want the command named", got)
	}
	if strings.Contains(got, "goroutine ") || strings.Contains(got, ".go:") {
		t.Errorf("stderr = %q, which carries a stack trace", got)
	}
}

// TestVerboseWritesOneProgressLinePerCheck covers the four cases the flag pair can take. The
// lines go to stderr because stdout is the payload; under --json they are suppressed whatever
// --verbose says, since an agent reads progress from the stream itself.
func TestVerboseWritesOneProgressLinePerCheck(t *testing.T) {
	tests := []struct {
		name      string
		args      []string
		wantLines bool
	}{
		{"with --verbose", []string{"health", "site-a1b2c3", "--verbose"}, true},
		{"without --verbose", []string{"health", "site-a1b2c3"}, false},
		{"with --json", []string{"health", "site-a1b2c3", "--json"}, false},
		{"with --json and --verbose", []string{"health", "site-a1b2c3", "--json", "--verbose"}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, _ := testDeps(t)
			writeTestRecord(t, d, "site-a1b2c3", "example.org", "example")

			stdout, stderr, err := execTree(t, d, tt.args...)
			if err != nil {
				t.Fatalf("%v: %v", tt.args, err)
			}

			got := progressLines(stderr)
			switch {
			case tt.wantLines && len(got) == 0:
				t.Errorf("stderr = %q, want one line per check", stderr)
			case !tt.wantLines && len(got) > 0:
				t.Errorf("stderr = %q, want no progress lines", stderr)
			}
			if tt.wantLines && len(got) != len(healthCheckIDs()) {
				t.Errorf("progress lines = %v, want one per check (%d)", got, len(healthCheckIDs()))
			}
			for _, line := range progressLines(stdout) {
				t.Errorf("stdout carries the progress line %q; stdout is the payload", line)
			}
		})
	}
}

// progressLines returns the "<check-id> <word>" lines in s. The rendered body carries the same
// pair per check, so the match is on a bare check id: a rendered row writes its id with a
// trailing colon, and a progress line writes it plain.
func progressLines(s string) []string {
	ids := healthCheckIDs()
	var found []string
	for line := range strings.SplitSeq(s, "\n") {
		fields := strings.Fields(line)
		if len(fields) != 2 || !slices.Contains(ids, fields[0]) {
			continue
		}
		switch fields[1] {
		case "pass", "fail", "held", "skip", "unknown":
			found = append(found, line)
		}
	}
	return found
}

// TestTheScrubSkipNoticeIsDisclosedOnceUnderVerbose covers the disclosure half of the
// minimum-length rule: a credential too short to redact safely is left as written, and the operator is told so
// rather than left believing the output was scrubbed.
func TestTheScrubSkipNoticeIsDisclosedOnceUnderVerbose(t *testing.T) {
	d, _ := testDeps(t)
	d.scrubSkipped = 1
	writeTestRecord(t, d, "site-a1b2c3", "example.org", "example")

	_, verbose, err := execTree(t, d, "sites", "list", "--verbose")
	if err != nil {
		t.Fatalf("sites list --verbose: %v", err)
	}
	if strings.Count(verbose, "does not scrub them") != 1 {
		t.Errorf("stderr = %q, want the notice exactly once", verbose)
	}

	_, quiet, err := execTree(t, d, "sites", "list")
	if err != nil {
		t.Fatalf("sites list: %v", err)
	}
	if strings.Contains(quiet, "does not scrub them") {
		t.Errorf("stderr = %q, want no notice without --verbose", quiet)
	}
}

// TestTheAccountIDIsNotScrubbed holds the deliberate gap in the scrub's needle set. The account
// id is an identifier the tool prints on purpose, in `adopt list` and in `auth probe`'s own
// output, so registering it would blank diagnostic text without protecting a secret. The line
// below carries all three values through the chokepoint the process streams run on.
func TestTheAccountIDIsNotScrubbed(t *testing.T) {
	const (
		accountID = "sentinel-account-ccccccccdddddddd"
		cfToken   = "sentinel-cf-value-aaaaaaaabbbbbbbb" // secret-guard-allow: a test sentinel
		ghToken   = "sentinel-gh-value-eeeeeeeeffffffff" // secret-guard-allow: a test sentinel
	)

	d, _ := testDeps(t)
	d.env = fakeEnv(map[string]string{
		varCFAccountID: accountID,
		varCFReadToken: cfToken,
		varGHReadToken: ghToken,
	})

	var buf bytes.Buffer
	w := logx.New(&buf, scrubTargets(d))
	if _, err := w.Write([]byte("cairn: account " + accountID + " token " + cfToken + " " + ghToken + "\n")); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := w.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}

	got := buf.String()
	if !strings.Contains(got, accountID) {
		t.Errorf("the account id was redacted: %q", got)
	}
	for _, token := range []string{cfToken, ghToken} {
		if strings.Contains(got, token) {
			t.Errorf("output carries a token: %q", got)
		}
	}
}

// TestASentinelCredentialReachesNoStream is the byte-level end of the scrub. It drives the two
// JSON payloads, a log line through the chokepoint, and an error wrapping a Credential, all with
// sentinel values in the environment, and then reads the registry file the same run wrote.
//
// The record sentinel is what makes the credential half meaningful. Without it the test could
// pass on a run that did nothing, so the record sentinel proves the pipeline really produced the
// output the credential sentinel is absent from.
func TestASentinelCredentialReachesNoStream(t *testing.T) {
	const (
		credSentinel   = "sentinel-credential-aaaaaaaabbbbbbbb"
		recordSentinel = "sentinel-site.example.org"
	)

	d, _ := testDeps(t)
	// The account id carries no part of the credential sentinel. An id built from it would
	// satisfy every assertion below whether or not the scrub ran on the tokens at all.
	d.env = fakeEnv(map[string]string{
		varCFAccountID: "sentinel-account-ccccccccdddddddd",
		varCFReadToken: credSentinel,
		varGHReadToken: credSentinel,
	})
	writeTestRecord(t, d, "site-a1b2c3", recordSentinel, "example")

	var out, errOut bytes.Buffer
	creds := []providers.Credential{providers.NewCredential(credSentinel)}
	stdout := logx.New(&out, creds)
	stderr := logx.New(&errOut, creds)

	for _, args := range [][]string{
		{"sites", "list", "--json", "--verbose"},
		{"health", "site-a1b2c3", "--json"},
	} {
		cmd := newRootCmd(d)
		cmd.SetOut(stdout)
		cmd.SetErr(stderr)
		cmd.SetArgs(args)
		if err := cmd.Execute(); err != nil {
			t.Fatalf("%v: %v", args, err)
		}
	}

	resolved, _ := loadEnv(d.env)
	if _, err := stderr.Write([]byte("cairn: sending " + credSentinel + " to cloudflare\n")); err != nil {
		t.Fatalf("log line: %v", err)
	}
	wrapped := fmt.Errorf("providers: verify token: %v", resolved.cfToken())
	if _, err := stderr.Write([]byte(wrapped.Error() + "\n")); err != nil {
		t.Fatalf("error wrap: %v", err)
	}
	if err := stdout.Close(); err != nil {
		t.Fatalf("close stdout: %v", err)
	}
	if err := stderr.Close(); err != nil {
		t.Fatalf("close stderr: %v", err)
	}

	for name, stream := range map[string]string{"stdout": out.String(), "stderr": errOut.String()} {
		if strings.Contains(stream, credSentinel) {
			t.Errorf("%s carries the credential sentinel: %q", name, stream)
		}
	}
	if !strings.Contains(out.String(), recordSentinel) {
		t.Fatalf("stdout does not carry the record sentinel, so the run produced nothing to redact: %q", out.String())
	}

	dir, err := d.registryDir()
	if err != nil {
		t.Fatalf("registryDir: %v", err)
	}
	stored := readRegistryBytes(t, dir)
	if !strings.Contains(stored, recordSentinel) {
		t.Errorf("the registry file does not carry the record store.Save wrote")
	}
	if strings.Contains(stored, credSentinel) {
		t.Error("the registry file carries a credential value; the store holds records alone")
	}
}

// readRegistryBytes returns every byte under the registry directory, concatenated, so a leak
// anywhere under it fails the assertion regardless of which file it landed in.
func readRegistryBytes(t *testing.T, dir string) string {
	t.Helper()
	var all strings.Builder
	err := filepath.WalkDir(dir, func(path string, entry os.DirEntry, err error) error {
		if err != nil || entry.IsDir() {
			return err
		}
		body, readErr := os.ReadFile(path)
		if readErr != nil {
			return readErr
		}
		all.Write(body)
		return nil
	})
	if err != nil {
		t.Fatalf("walk %s: %v", dir, err)
	}
	return all.String()
}

// requestsPerCheck reads the "Requests per check" table out of the published exit-codes page. The
// test below measures the arithmetic from what the doc says rather than from a second table in Go,
// so the page an operator sizes a scheduler against and the budget the tool ships cannot drift.
func requestsPerCheck(t *testing.T) map[string]int {
	t.Helper()
	body := readRepoFile(t, exitCodesPage)
	row := regexp.MustCompile(`(?m)^\| ` + "`" + `([a-z-]+)` + "`" + ` \| (\d+) \|`)

	counts := map[string]int{}
	for _, m := range row.FindAllStringSubmatch(body, -1) {
		n, err := strconv.Atoi(m[2])
		if err != nil {
			t.Fatalf("parse %q: %v", m[2], err)
		}
		counts[m[1]] = n
	}
	if len(counts) == 0 {
		t.Fatalf("%s publishes no per-check request counts", exitCodesPage)
	}
	return counts
}

// healthCheckIDs returns the check ids the shipped sweep runs, in report order.
func healthCheckIDs() []string {
	ids := make([]string, 0, len(health.All))
	for _, c := range health.All {
		ids = append(ids, c.ID())
	}
	return ids
}

// TestTheSingleSiteBudgetFitsTheRequestArithmetic is the arithmetic an operator sizes a
// scheduler's own cap against: every check the sweep runs is published with a maximum request
// count, and the worst case where every request runs to its own 15-second timeout still fits
// inside one site's default budget.
func TestTheSingleSiteBudgetFitsTheRequestArithmetic(t *testing.T) {
	counts := requestsPerCheck(t)

	total := 0
	for _, id := range healthCheckIDs() {
		n, ok := counts[id]
		if !ok {
			t.Errorf("%s publishes no request count for the %s check", exitCodesPage, id)
			continue
		}
		total += n
	}
	for id := range counts {
		if !strings.Contains(strings.Join(healthCheckIDs(), " "), id) {
			t.Errorf("%s publishes a count for %q, which is not a check the sweep runs", exitCodesPage, id)
		}
	}

	worst := time.Duration(total) * providers.RequestTimeout
	if worst > defaultTimeout {
		t.Errorf("worst case is %v over %d requests, above the %v single-site budget", worst, total, defaultTimeout)
	}
}

// TestTheSweepCapIsThePublishedOne pins the two numbers the multi-site formula on the
// exit-codes page is written from, so the worked examples on that page stay arithmetic rather
// than assertion.
func TestTheSweepCapIsThePublishedOne(t *testing.T) {
	body := readRepoFile(t, exitCodesPage)

	formula := "min(" + strconv.Itoa(int(defaultTimeout.Seconds())) + " seconds x sites, " +
		strconv.Itoa(int(maxSweepTimeout.Seconds())) + " seconds)"
	if !strings.Contains(body, formula) {
		t.Errorf("%s does not carry the formula %q", exitCodesPage, formula)
	}
}

// TestEveryUsageErrorCarriesTwoLines covers the second half of catalogue section 3.8's usage
// row, which the exit-code table above does not: a usage error states the refusal, then where to
// read what the tool does accept. `cairn frobnicate` printed only the first until 2026-09-21,
// because cobra's own NoArgs message is one line.
func TestEveryUsageErrorCarriesTwoLines(t *testing.T) {
	for _, args := range falsificationTable {
		t.Run(strings.Join(args, " "), func(t *testing.T) {
			_, stderr, _ := runBinary(t, args...)
			if got := len(strings.Split(strings.TrimRight(stderr, "\n"), "\n")); got < 2 {
				t.Errorf("stderr = %q, %d line(s); a usage error names where to read usage", stderr, got)
			}
		})
	}
}

// TestAFirstRunWithNoRegistryListsNothing covers an operator's very first command. The registry
// directory does not exist yet, and reporting "no such file or directory" tells them nothing they
// can act on: an absent registry is an empty registry, and `cairn adopt` creates the directory
// when it writes the first record.
func TestAFirstRunWithNoRegistryListsNothing(t *testing.T) {
	for _, args := range [][]string{{"sites", "list"}, {"adopt", "list"}} {
		t.Run(strings.Join(args, " "), func(t *testing.T) {
			_, stderr, _ := runBinary(t, args...)
			if strings.Contains(stderr, "no such file or directory") || strings.Contains(stderr, "cannot find the") {
				t.Errorf("stderr = %q; an absent registry is reported as a filesystem fault", stderr)
			}
		})
	}
}
