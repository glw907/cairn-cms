package main

import (
	"go/ast"
	"go/parser"
	"go/token"
	"regexp"
	"strconv"
	"strings"
	"testing"

	"github.com/spf13/cobra"
)

// maxCommandBodyLiteral is criterion 1's own threshold: the longest string literal a cmd/cairn
// file outside messages.go may carry, skipping a struct tag, a flag's own long name, and a
// cobra.Command field key (an import path, caught the same way health's own
// TestCheckFilesCarryNoLongProseLiterals excludes one).
const maxCommandBodyLiteral = 30

// probeDumpFiles hold auth probe's own raw diagnostic dump: endpoint labels, HTTP methods, and
// JSON key-shape summaries for whoever is minting the three credentials. probe_token.go's own
// Long text states the design this codifies: "auth probe's whole output is identifiers
// (endpoints, statuses, and repository names)", the same reason copy-standard.md section 3.9
// keeps a log line's field values verbatim rather than routing them through the prose table.
// probe_token.go's own genuine prose (Short, Long, Example, and its two skipped-credential
// notices) is still moved into messages.go despite this exemption; TestAuthProbeStringsLiveInMessages
// covers that half directly.
var probeDumpFiles = map[string]bool{
	"probe_cloudflare.go": true,
	"probe_github.go":     true,
	"probe_token.go":      true,
}

// excludedCommandLiterals returns every *ast.BasicLit a cmd/cairn file exempts from
// maxCommandBodyLiteral: a struct tag, the same exemption health's own literal-length test
// grants.
func excludedCommandLiterals(file *ast.File) map[*ast.BasicLit]bool {
	excluded := make(map[*ast.BasicLit]bool)
	ast.Inspect(file, func(n ast.Node) bool {
		if field, ok := n.(*ast.Field); ok && field.Tag != nil {
			excluded[field.Tag] = true
		}
		return true
	})
	return excluded
}

// TestNoLongProseLiteralOutsideMessages asserts no cmd/cairn file outside messages.go and auth
// probe's own diagnostic dump (probeDumpFiles) carries a string literal longer than
// maxCommandBodyLiteral characters, outside a struct tag or an import path: every longer
// operator-facing string, an error message, a command's Short/Long/Example, or a flag's help
// text, must live in messages.go instead.
func TestNoLongProseLiteralOutsideMessages(t *testing.T) {
	for _, rel := range toolGoFiles(t) {
		if !strings.HasPrefix(rel, "cmd/cairn/") {
			continue
		}
		base := strings.TrimPrefix(rel, "cmd/cairn/")
		if base == "messages.go" || strings.HasSuffix(base, "_test.go") || probeDumpFiles[base] {
			continue
		}

		fset := token.NewFileSet()
		f, err := parser.ParseFile(fset, base, nil, 0)
		if err != nil {
			t.Fatalf("parse %s: %v", rel, err)
		}
		excluded := excludedCommandLiterals(f)
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
			if len(s) > maxCommandBodyLiteral {
				t.Errorf("%s:%d: string literal %q is %d characters, over the %d-character limit; move it to messages.go",
					rel, fset.Position(lit.Pos()).Line, s, len(s), maxCommandBodyLiteral)
			}
			return true
		})
	}
}

// TestAuthProbeStringsLiveInMessages pins the half of probe_token.go's own prose the
// probeDumpFiles exemption above does not cover: its Short, Long, Example, and its two
// skipped-credential notices are still messages.go constants, not literals reintroduced at the
// call site.
func TestAuthProbeStringsLiveInMessages(t *testing.T) {
	cmd := newAuthProbeCmd(mustDeps(t))
	if cmd.Short != shortAuthProbe {
		t.Errorf("auth probe Short = %q, want messages.go's shortAuthProbe", cmd.Short)
	}
	if cmd.Long != longAuthProbe {
		t.Errorf("auth probe Long does not match messages.go's longAuthProbe")
	}
	if cmd.Example != exampleAuthProbe {
		t.Errorf("auth probe Example = %q, want messages.go's exampleAuthProbe", cmd.Example)
	}
}

// messageConstants parses messages.go and returns every string-valued package-level const it
// declares, the same extraction cmd/copylist's cairnCatalogue performs for the golden. Reusing
// the same technique here, rather than hand-listing every function's return value the way
// internal/health/messages_test.go does, means a new const is covered by these tests the moment
// it is added, with no second place to remember to update.
func messageConstants(t *testing.T) []string {
	t.Helper()
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, "messages.go", nil, 0)
	if err != nil {
		t.Fatalf("parse messages.go: %v", err)
	}
	var entries []string
	for _, decl := range f.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.CONST {
			continue
		}
		for _, spec := range gen.Specs {
			vs, ok := spec.(*ast.ValueSpec)
			if !ok {
				continue
			}
			for _, val := range vs.Values {
				lit, ok := val.(*ast.BasicLit)
				if !ok || lit.Kind != token.STRING {
					continue
				}
				s, err := strconv.Unquote(lit.Value)
				if err != nil {
					continue
				}
				entries = append(entries, s)
			}
		}
	}
	return entries
}

// TestNoCAIRNPrefixedLiteralOutsideCredentialVars extends Task 19c-i's conflict test over this
// table: every CAIRN_-prefixed literal messages.go carries is a member of authVariables (built
// from credentialVars, env.go), which TestCredentialVariableNamesAreSpelledOnlyInEnvGo already
// exempts this file to allow.
func TestNoCAIRNPrefixedLiteralOutsideCredentialVars(t *testing.T) {
	cairnVarPattern := regexp.MustCompile(`CAIRN_[A-Z_]+`)
	allowed := make(map[string]bool, len(authVariables))
	for _, v := range authVariables {
		allowed[v] = true
	}
	for _, s := range messageConstants(t) {
		for _, m := range cairnVarPattern.FindAllString(s, -1) {
			if !allowed[m] {
				t.Errorf("messages.go entry %q names %q, not a member of authVariables %v", s, m, authVariables)
			}
		}
	}
}

// cairnBacktickCommandPattern matches a backtick-quoted "cairn <word...>" fragment: the shape a
// fix line uses to name a command an operator should run next, health/messages_test.go's own
// pattern generalized from an allow-list check to a real-tree check.
var cairnBacktickCommandPattern = regexp.MustCompile("`cairn [a-z][a-z -]*`")

// TestNoMessageNamesAnUnknownCairnCommand extends Task 19c-i's conflict test the same way,
// checked against the real cobra tree cairn builds rather than an allow-list: every backtick-
// quoted "cairn ..." command mention messages.go carries resolves to a command somewhere in
// newRootCmd's own tree.
func TestNoMessageNamesAnUnknownCairnCommand(t *testing.T) {
	known := knownCommandPaths(t)

	for _, s := range messageConstants(t) {
		for _, m := range cairnBacktickCommandPattern.FindAllString(s, -1) {
			name := commandPathOf(strings.Trim(m, "`"))
			if !known[name] {
				t.Errorf("messages.go entry %q names command %q, absent from the cobra tree", s, name)
			}
		}
	}
}

// commandPathOf returns fragment's own leading command path, dropping a trailing flag word
// (`--help`) so "cairn health --help" is checked as "cairn health" against the real tree rather
// than as a command path of its own.
func commandPathOf(fragment string) string {
	words := strings.Fields(fragment)
	for len(words) > 0 && strings.HasPrefix(words[len(words)-1], "-") {
		words = words[:len(words)-1]
	}
	return strings.Join(words, " ")
}

// knownCommandPaths walks the real cobra tree cairn builds and returns every "cairn <path>"
// string a command in it resolves to.
func knownCommandPaths(t *testing.T) map[string]bool {
	t.Helper()
	root := newRootCmd(mustDeps(t))
	root.InitDefaultHelpCmd()
	root.InitDefaultCompletionCmd()

	known := map[string]bool{}
	walkCommands(root, func(c *cobra.Command) {
		known[c.CommandPath()] = true
	})
	return known
}

// TestEveryCairnPrefixedMessageFollowsTheErrorGrammar covers criterion 3: every messages.go
// string shaped as an error (it starts "cairn: ") carries the standard's own three-part shape
// rather than a raw Go error chain. Short, Long, Example, and flag help text are not error
// messages and are skipped: they never carry the "cairn: " prefix in the first place, which is
// itself how this test tells the two kinds apart with no second list to maintain.
//
// A multi-line message's first line ends with a period, the standard's own 2.7; a single-line
// message does not, staticcheck's ST1005 (a Go error string carries no trailing punctuation) and
// go-conventions winning for the one shape where the two would otherwise collide: a message with
// no second line IS the whole Go error string, so it is graded by ST1005 rather than 2.7 in that
// one case.
func TestEveryCairnPrefixedMessageFollowsTheErrorGrammar(t *testing.T) {
	for _, s := range messageConstants(t) {
		// pasteNotice is a printed notice, never wrapped in an error, so ST1005 does not reach
		// it and its own trailing period is correct UI text rather than a Go error string.
		if !strings.HasPrefix(s, "cairn: ") || s == pasteNotice {
			continue
		}
		firstLine, hasMore, _ := strings.Cut(s, "\n")
		endsInPeriod := strings.HasSuffix(firstLine, ".")
		switch {
		case hasMore == "" && endsInPeriod:
			t.Errorf("message %q ends with a period; a single-line Go error string must not (ST1005)", s)
		case hasMore != "" && !endsInPeriod:
			t.Errorf("message %q's first line %q does not end with a period", s, firstLine)
		}
		if strings.Contains(s, "Error: ") {
			t.Errorf("message %q doubles \"Error: \"", s)
		}
		if strings.Contains(s, "goroutine ") {
			t.Errorf("message %q carries what reads like a stack trace", s)
		}
	}
}

// The eight rows copy-standard.md section 3.8 names, one constructor each, plus the fallback.
// TestEveryEightSection38CaseHasATableEntry exercises each directly so criterion 2's own count
// is proven rather than merely asserted in a comment, and so `unused` never flags the four
// (noCredentialsError, networkDownError, rateLimitedError, crashedCheckError) that carry no
// production call site today (see messages.go's own comment on why).
func TestEveryEightSection38CaseHasATableEntry(t *testing.T) {
	cases := map[string]error{
		"no credentials":                 noCredentialsError(),
		"keyring unavailable":            keyringUnavailableError("CAIRN_CF_READ_TOKEN"),
		"unknown site":                   unknownSiteError("example-a1b2c3"),
		"network down":                   networkDownError(),
		"rate limited, no Retry-After":   rateLimitedError(""),
		"rate limited, with Retry-After": rateLimitedError("5m"),
		"invalid --since":                invalidSinceError("7"),
		"usage error, not a credential":  notACredentialError("NOT_A_REAL_VARIABLE"),
		"usage error, arity":             healthTooManyArgsError(),
		"a crashed check":                crashedCheckError("deploy"),
	}
	for label, err := range cases {
		if err == nil {
			t.Errorf("%s: table entry is nil", label)
			continue
		}
		if !strings.HasPrefix(err.Error(), "cairn: ") {
			t.Errorf("%s: %q does not start with \"cairn: \"", label, err.Error())
		}
		if _, ok := err.(translatedError); !ok {
			t.Errorf("%s: %q is not a translatedError; translateError would wrap it a second time", label, err.Error())
		}
	}
}

// TestTranslateErrorPassesThroughATranslatedMessage asserts translateError never re-wraps a
// message this table already built: the "cairn: cairn: " double-prefix bug a naive boundary
// would reintroduce.
func TestTranslateErrorPassesThroughATranslatedMessage(t *testing.T) {
	err := unknownSiteError("example-a1b2c3")
	got := translateError(err)
	if got.Error() != err.Error() {
		t.Errorf("translateError(%v) = %v, want it unchanged", err, got)
	}
	if strings.Count(got.Error(), "cairn: ") != 1 {
		t.Errorf("translateError(%v) = %q, carries more than one \"cairn: \" prefix", err, got.Error())
	}
}

// TestTranslateErrorPrefixesARawError asserts a raw Go error that never went through this
// table's own constructors still reaches an operator with the cairn: prefix, copy-standard.md
// section 4.2's own fallback.
func TestTranslateErrorPrefixesARawError(t *testing.T) {
	raw := errRaw{"open /home/geoff/.config/cairn/sites: permission denied"}
	got := translateError(raw)
	if !strings.HasPrefix(got.Error(), "cairn: ") {
		t.Errorf("translateError(%v) = %q, does not start with \"cairn: \"", raw, got.Error())
	}
}

// errRaw is a bare error type standing in for a store or filesystem failure that never passed
// through one of this file's own constructors, so it is never a translatedError.
type errRaw struct{ s string }

func (e errRaw) Error() string { return e.s }
