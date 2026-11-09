package spine

import (
	"go/ast"
	"go/parser"
	"go/token"
	"slices"
	"strconv"
	"testing"
)

// declaredConsts returns the string value of every constant of type typeName declared in file,
// read from the source rather than the compiled sets, so a constant a set forgot is caught.
func declaredConsts(t *testing.T, file, typeName string) []string {
	t.Helper()
	parsed, err := parser.ParseFile(token.NewFileSet(), file, nil, 0)
	if err != nil {
		t.Fatalf("parse %s: %v", file, err)
	}
	var values []string
	for _, decl := range parsed.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.CONST {
			continue
		}
		for _, spec := range gen.Specs {
			vs, ok := spec.(*ast.ValueSpec)
			if !ok {
				continue
			}
			ident, ok := vs.Type.(*ast.Ident)
			if !ok || ident.Name != typeName || len(vs.Values) != 1 {
				continue
			}
			lit, ok := vs.Values[0].(*ast.BasicLit)
			if !ok || lit.Kind != token.STRING {
				continue
			}
			value, err := strconv.Unquote(lit.Value)
			if err != nil {
				t.Fatalf("unquote %s: %v", lit.Value, err)
			}
			values = append(values, value)
		}
	}
	slices.Sort(values)
	return values
}

// TestStepConstantsAreAllRegistered holds the record-step vocabulary closed: every Step constant
// declared in step.go is a known step (allSteps) or a setup step, and nothing else is, so a
// constant left out of both lists fails here instead of reading back as unknown from a record
// on disk.
func TestStepConstantsAreAllRegistered(t *testing.T) {
	declared := declaredConsts(t, "step.go", "Step")

	var registered []string
	for s := range allSteps {
		registered = append(registered, string(s))
	}
	for _, s := range setupSteps {
		registered = append(registered, string(s))
	}
	slices.Sort(registered)

	if !slices.Equal(declared, registered) {
		t.Fatalf("declared Step constants and registered steps differ:\ndeclared:   %v\nregistered: %v", declared, registered)
	}
}

func TestParseStep(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  Step
		ok    bool
	}{
		{name: "known step", input: "live", want: StepLive, ok: true},
		{name: "unknown step", input: "not-a-step", want: Step("not-a-step"), ok: false},
		{name: "empty string", input: "", want: Step(""), ok: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := parseStep(tt.input)
			if got != tt.want || ok != tt.ok {
				t.Errorf("parseStep(%q) = (%q, %v), want (%q, %v)", tt.input, got, ok, tt.want, tt.ok)
			}
		})
	}
}

// TestTerminalStepSeams asserts each of the three step-slice functions returns exactly its
// documented steps, in order, which slices.Equal also proves.
func TestTerminalStepSeams(t *testing.T) {
	tests := []struct {
		name string
		got  []Step
		want []Step
	}{
		{name: "terminalSteps", got: terminalSteps(), want: []Step{StepEmailLive, StepPaidPlanDeclined}},
		{name: "chapter3TerminalSteps", got: chapter3TerminalSteps(), want: []Step{StepBuildsLive, StepBuildsConnectDeclined}},
		{name: "chapter3ResumableSteps", got: chapter3ResumableSteps(), want: []Step{StepBuildsConnected, StepConfigReconciled}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !slices.Equal(tt.got, tt.want) {
				t.Errorf("%s() = %v, want %v", tt.name, tt.got, tt.want)
			}
		})
	}
}

func TestSetupStepsAreDistinctFromWizardSteps(t *testing.T) {
	seen := map[Step]bool{}
	for _, s := range setupSteps {
		if allSteps[s] {
			t.Errorf("setup step %q is also a wizard step", s)
		}
		if seen[s] {
			t.Errorf("setup step %q is listed twice", s)
		}
		seen[s] = true
	}
}
