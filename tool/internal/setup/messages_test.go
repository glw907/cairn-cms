package setup

import (
	"go/ast"
	"go/parser"
	"go/token"
	"strconv"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup/loopback"
)

// declaredReasons reads failure.go and returns every constant of type Reason with its value, so
// a new reason without an entry fails the test below.
func declaredReasons(t *testing.T) map[string]Reason {
	t.Helper()
	f, err := parser.ParseFile(token.NewFileSet(), "failure.go", nil, 0)
	if err != nil {
		t.Fatal(err)
	}
	got := map[string]Reason{}
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
			id, ok := vs.Type.(*ast.Ident)
			if !ok || id.Name != "Reason" {
				continue
			}
			lit, ok := vs.Values[0].(*ast.BasicLit)
			if !ok {
				t.Fatalf("reason %s is not a string literal", vs.Names[0].Name)
			}
			v, err := strconv.Unquote(lit.Value)
			if err != nil {
				t.Fatal(err)
			}
			got[vs.Names[0].Name] = Reason(v)
		}
	}
	return got
}

func TestEveryReasonHasACompleteEntry(t *testing.T) {
	reasons := declaredReasons(t)
	if len(reasons) < 30 {
		t.Fatalf("read %d reasons from failure.go, want the full list", len(reasons))
	}
	for name, reason := range reasons {
		t.Run(name, func(t *testing.T) {
			e, ok := entries[reason]
			if !ok {
				t.Fatalf("no entry for %s (%q)", name, reason)
			}
			for part, text := range map[string]string{"Happened": e.Happened, "Did": e.Did, "Do": e.Do} {
				if strings.TrimSpace(text) == "" {
					t.Errorf("%s has an empty %s", name, part)
				}
			}
		})
	}
	for reason := range entries {
		found := false
		for _, r := range reasons {
			found = found || r == reason
		}
		if !found {
			t.Errorf("entry for %q has no reason constant", reason)
		}
	}
}

func TestOpeningFailuresCarryAnAnchor(t *testing.T) {
	opening := []Reason{
		ReasonRemote, ReasonGitMissing, ReasonNodeMissing, ReasonNodeOld, ReasonPortInUse,
		ReasonKeyring, ReasonTemplate, ReasonFolderNotEmpty, ReasonNoAccount, ReasonNoZones,
		ReasonZonePending,
	}
	for _, r := range opening {
		if a := entries[r].Anchor; !strings.HasPrefix(a, "#") || len(a) < 2 {
			t.Errorf("%s anchor = %q, want a fragment", r, a)
		}
	}
}

func TestPortLineMatchesTheLoopback(t *testing.T) {
	if got := entries[ReasonPortInUse].Happened; got != loopback.InUseReason {
		t.Errorf("port-in-use copy = %q, want the loopback's reason %q", got, loopback.InUseReason)
	}
}
