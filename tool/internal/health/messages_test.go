package health

import (
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"time"
)

// maxCheckBodyLiteral is the longest string literal a check_*.go file may carry outside a
// messages.go table entry, tool/docs/design/copy-standard.md's own production rule (section 4.1):
// a linter cannot find prose scattered across many files, so a check body earns no exception past
// this length.
const maxCheckBodyLiteral = 40

// isErrorConstructorCall reports whether fun is a call to errors.New or fmt.Errorf, the two
// exceptions criterion 1 of this task names by name.
func isErrorConstructorCall(fun ast.Expr) bool {
	sel, ok := fun.(*ast.SelectorExpr)
	if !ok {
		return false
	}
	pkg, ok := sel.X.(*ast.Ident)
	if !ok {
		return false
	}
	return (pkg.Name == "errors" && sel.Sel.Name == "New") || (pkg.Name == "fmt" && sel.Sel.Name == "Errorf")
}

// excludedLiterals returns every *ast.BasicLit in file that criterion 1 exempts from the
// length limit: a struct tag, and an argument to errors.New or fmt.Errorf.
func excludedLiterals(file *ast.File) map[*ast.BasicLit]bool {
	excluded := make(map[*ast.BasicLit]bool)
	ast.Inspect(file, func(n ast.Node) bool {
		if field, ok := n.(*ast.Field); ok && field.Tag != nil {
			excluded[field.Tag] = true
		}
		call, ok := n.(*ast.CallExpr)
		if !ok || !isErrorConstructorCall(call.Fun) {
			return true
		}
		for _, arg := range call.Args {
			ast.Inspect(arg, func(m ast.Node) bool {
				if lit, ok := m.(*ast.BasicLit); ok && lit.Kind == token.STRING {
					excluded[lit] = true
				}
				return true
			})
		}
		return true
	})
	return excluded
}

// TestCheckFilesCarryNoLongProseLiterals asserts no check_*.go file (excluding _test.go files)
// contains a string literal longer than maxCheckBodyLiteral characters, outside a struct tag or
// an errors.New/fmt.Errorf argument: every longer operator-facing string must live in messages.go
// or fixes.go instead. An import path is also excluded implicitly: it is never a *ast.BasicLit
// reached by this walk outside an *ast.ImportSpec, which this test does not inspect.
func TestCheckFilesCarryNoLongProseLiterals(t *testing.T) {
	matches, err := filepath.Glob("check_*.go")
	if err != nil {
		t.Fatalf("glob check_*.go: %v", err)
	}
	if len(matches) == 0 {
		t.Fatal("found no check_*.go files; the glob is broken")
	}

	fset := token.NewFileSet()
	for _, path := range matches {
		if strings.HasSuffix(path, "_test.go") {
			continue
		}
		f, err := parser.ParseFile(fset, path, nil, 0)
		if err != nil {
			t.Fatalf("parse %s: %v", path, err)
		}
		excluded := excludedLiterals(f)

		for _, imp := range f.Imports {
			excluded[imp.Path] = true
		}

		ast.Inspect(f, func(n ast.Node) bool {
			lit, ok := n.(*ast.BasicLit)
			if !ok || lit.Kind != token.STRING || excluded[lit] {
				return true
			}
			s, err := strconv.Unquote(lit.Value)
			if err != nil {
				return true
			}
			if len(s) > maxCheckBodyLiteral {
				t.Errorf("%s:%d: string literal %q is %d characters, over the %d-character limit; move it to messages.go",
					path, fset.Position(lit.Pos()).Line, s, len(s), maxCheckBodyLiteral)
			}
			return true
		})
	}
}

// kebabToken matches a bare hyphenated token with no space, catalogue section 4.4's own
// structural rule: a Detail matching it in full is a machine token sitting in a prose field
// rather than a sentence.
var kebabToken = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)+$`)

// assertDetailIsProseOrEmpty holds the two invariants criterion 5 of this task names: detail is
// either empty or reads as a fragment of prose rather than a machine token. A bare kebab token
// (`hsts-off`) is caught by kebabToken directly; a bare non-hyphenated token (`unauthorized`,
// `forbidden`) carries no hyphen at all, so kebabToken alone would miss it, which is exactly why
// this function also requires a space: a fragment with no space at all is a single word, never a
// sentence.
func assertDetailIsProseOrEmpty(t *testing.T, label, detail string) {
	t.Helper()
	if detail == "" {
		return
	}
	if kebabToken.MatchString(detail) {
		t.Errorf("%s: Detail %q is a bare kebab token, not prose", label, detail)
	}
	if !strings.Contains(detail, " ") {
		t.Errorf("%s: Detail %q carries no space; it reads as a single token, not a sentence", label, detail)
	}
}

// TestMessagesAreProseOrEmpty drives every messages.go function that takes no argument, and a
// representative call for each that does, asserting each result is either empty or prose-shaped.
// This is the messages table's own half of criterion 5; the check bodies that consume these
// functions are exercised by each check's own test file.
func TestMessagesAreProseOrEmpty(t *testing.T) {
	fixedExpiry := time.Date(2026, 9, 26, 0, 0, 0, 0, time.UTC)
	fixedNow := fixedExpiry.Add(-6 * 24 * time.Hour)

	cases := map[string]string{
		"detailHTTPSAlwaysUseHTTPSOff":          detailHTTPSAlwaysUseHTTPSOff(),
		"detailHTTPSHSTSOff":                    detailHTTPSHSTSOff(),
		"detailHTTPSBothOff":                    detailHTTPSBothOff(),
		"detailHTTPSNoAlwaysUseHTTPSSetting":    detailHTTPSNoAlwaysUseHTTPSSetting(),
		"detailDelegationWrongNameservers":      detailDelegationWrongNameservers(),
		"detailDelegationNoAssignedNS":          detailDelegationNoAssignedNS(),
		"detailDelegationNoZone":                detailDelegationNoZone(),
		"detailServingHostnameMismatch":         detailServingHostnameMismatch(),
		"detailServingNotCairn":                 detailServingNotCairn(),
		"detailEmailDMARCMissing":               detailEmailDMARCMissing(),
		"detailEmailDMARCPolicyNone":            detailEmailDMARCPolicyNone(),
		"detailEmailDMARCNoPolicy":              detailEmailDMARCNoPolicy(),
		"detailEmailSPFMissing":                 detailEmailSPFMissing(cloudflareSPFInclude),
		"detailEmailDKIMMissing":                detailEmailDKIMMissing(),
		"detailEmailSenderNotOnboarded":         detailEmailSenderNotOnboarded(),
		"detailDeployWorkerNotFound":            detailDeployWorkerNotFound(),
		"detailDeployBuildsNotConnected":        detailDeployBuildsNotConnected(),
		"detailDeployBuildFailed":               detailDeployBuildFailed(),
		"detailPublishNothingWaiting":           detailPublishNothingWaiting(),
		"detailNoRepoRecorded":                  detailNoRepoRecorded(),
		"detailPublishStaleBranches(1)":         detailPublishStaleBranches(1),
		"detailPublishStaleBranches(3)":         detailPublishStaleBranches(3),
		"detailEngineCurrent":                   detailEngineCurrent("0.78.0"),
		"detailEngineBehind":                    detailEngineBehind("0.71.0", "0.78.0", 7),
		"detailEngineBehindActionable":          detailEngineBehindActionable("0.71.0", "0.78.0", 7),
		"detailEngineNoCairnDependency":         detailEngineNoCairnDependency(),
		"detailEngineVersionNotFound":           detailEngineVersionNotFound(),
		"detailErrorsObservabilityOff":          detailErrorsObservabilityOff(),
		"detailErrorsCount":                     detailErrorsCount(0, false, time.Hour*24),
		"detailErrorsCount(truncated)":          detailErrorsCount(1000, true, time.Hour*24),
		"detailErrorsAboveThreshold":            detailErrorsAboveThreshold(31, false, time.Hour*24, 10),
		"detailErrorsAboveThreshold(truncated)": detailErrorsAboveThreshold(1000, true, time.Hour*24, 10),
		"detailCredsGitHubNoExpiry":             detailCredsGitHubNoExpiry(),
		"detailCredsGitHubExpiring":             detailCredsGitHubExpiring(fixedExpiry, fixedNow),
		"detailCredsUnauthorized":               detailCredsUnauthorized(),
		"detailCredsForbidden":                  detailCredsForbidden(),
	}
	for label, detail := range cases {
		assertDetailIsProseOrEmpty(t, label, detail)
	}
}

// allCatalogueStrings returns every string this package's own messages and fix tables carry, the
// same union `cmd/copylist` builds its golden from, for the three superseded-rows tests below.
func allCatalogueStrings() []string {
	return append(Catalogue(), FixLines()...)
}

// cairnCommandsCredsGrammarAllows is the literal allow-list criterion 8 of this task calls for:
// checked against the real cobra tree once Task 19a-i lands it, and by this list until then. The
// two cairn commands this package's own fix table names are "cairn auth set" and "cairn adopt",
// which the ruled grammar (docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md, Task
// 19a-i's "Produces") gives as `auth set <name>` and `adopt`.
var cairnCommandsCredsGrammarAllows = []string{"cairn auth set", "cairn adopt"}

// cairnCommandPattern matches a "cairn <word...>" fragment inside a catalogue string, so
// TestNoMessageNamesAnUnknownCairnCommand can find every command mention without a human having
// to read the whole table by eye.
var cairnCommandPattern = regexp.MustCompile("`cairn [a-z ]+`|\\bcairn auth set\\b")

// TestNoCAIRNPrefixedLiteralOutsideCredentialVars asserts no string in this package's messages or
// fix tables names a CAIRN_-prefixed environment variable. Task 19a-ii's `credentialVars` is the
// single spelling every such literal must belong to; until it exists, this task's own rule is
// that no table entry names one at all, which is also why 3.8's rate-limited and no-credentials
// rewrites (which do name one) are not reproduced here.
func TestNoCAIRNPrefixedLiteralOutsideCredentialVars(t *testing.T) {
	for _, s := range allCatalogueStrings() {
		if strings.Contains(s, "CAIRN_") {
			t.Errorf("catalogue entry %q names a CAIRN_-prefixed variable; see Task 19a-ii's credentialVars", s)
		}
	}
}

// TestNoMessageNamesAnUnknownCairnCommand asserts every "cairn ..." command this package's
// tables name is on cairnCommandsCredsGrammarAllows, the literal allow-list criterion 8 calls
// for until Task 19a-i's cobra tree exists to check against directly.
func TestNoMessageNamesAnUnknownCairnCommand(t *testing.T) {
	allowed := make(map[string]bool, len(cairnCommandsCredsGrammarAllows))
	for _, c := range cairnCommandsCredsGrammarAllows {
		allowed[c] = true
	}
	for _, s := range allCatalogueStrings() {
		for _, m := range cairnCommandPattern.FindAllString(s, -1) {
			name := strings.Trim(m, "`")
			if !allowed[name] {
				t.Errorf("catalogue entry %q names command %q, not on the allow-list %v", s, name, cairnCommandsCredsGrammarAllows)
			}
		}
	}
}

// verdictWord matches one of the four monitoring-plugin verdict words as a whole word, case
// sensitive: the catalogue's own grammar (2.2) reserves capitalized OK/WARNING/CRITICAL/UNKNOWN
// for a verdict, never a detail or fix line.
var verdictWord = regexp.MustCompile(`\b(OK|WARNING|CRITICAL|UNKNOWN)\b`)

// TestNoMessageAssertsAVerdictWord asserts no detail or fix line in this package's tables claims
// one of the four verdict words: Task 21's exit-code table is the only place that maps a
// condition to a verdict, and a message asserting one here could drift from it silently.
func TestNoMessageAssertsAVerdictWord(t *testing.T) {
	for _, s := range allCatalogueStrings() {
		if verdictWord.MatchString(s) {
			t.Errorf("catalogue entry %q names a verdict word; verdicts are Task 21's exit-code table's alone", s)
		}
	}
}

// TestErrorsWindowFormatsWholeHoursBare asserts errorsWindow renders a whole-hour duration the way
// the catalogue's own count fields do ("24h"), and falls back to Go's own duration string for
// anything else rather than inventing a second notation.
func TestErrorsWindowFormatsWholeHoursBare(t *testing.T) {
	tests := []struct {
		d    time.Duration
		want string
	}{
		{24 * time.Hour, "24h"},
		{time.Hour, "1h"},
		{90 * time.Minute, (90 * time.Minute).String()},
	}
	for _, tt := range tests {
		if got := errorsWindow(tt.d); got != tt.want {
			t.Errorf("errorsWindow(%v) = %q, want %q", tt.d, got, tt.want)
		}
	}
}
