package doctor

import (
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// viteConfigWith wraps a csrf option block in the Kit 3 shape: the whole SvelteKit config inside
// the sveltekit() call of a Vite config.
func viteConfigWith(csrf string) string {
	return "import { sveltekit } from '@sveltejs/kit/vite';\n" +
		"export default {\n  plugins: [\n    sveltekit({\n" + csrf + "\n    }),\n  ],\n};\n"
}

// viteConfigNoCsrf is a Vite config that sets no csrf key at all.
const viteConfigNoCsrf = "import { sveltekit } from '@sveltejs/kit/vite';\nexport default { plugins: [sveltekit({})] };\n"

// TestConfigCsrfTrustedOrigins holds the check to every status the plan names: a trustedOrigins
// entry of "*" or "null" fails, any other entry passes with the widening detail, a value the
// check cannot read statically is UNCHECKED, and no readable Vite config is UNCHECKED, never a
// pass.
func TestConfigCsrfTrustedOrigins(t *testing.T) {
	tests := []struct {
		name          string
		files         map[string]string
		wantStatus    Status
		wantDetailHas []string
		wantDetailNot []string
	}{
		{
			name:          "fail: a single-quoted wildcard",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: ['*'] },")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"*"`, "every route", "/admin"},
		},
		{
			name:          "fail: a double-quoted wildcard",
			files:         map[string]string{"vite.config.ts": viteConfigWith(`csrf: { trustedOrigins: ["*"] },`)},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"*"`},
		},
		{
			name:          "fail: a wildcard among other entries",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: ['https://a.example', '*', 'https://b.example'] },")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"*"`},
			wantDetailNot: []string{"a.example", "b.example"},
		},
		{
			name:          "fail: a single-quoted csrf key",
			files:         map[string]string{"vite.config.ts": viteConfigWith("'csrf': { trustedOrigins: ['*'] },")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"*"`},
		},
		{
			name:          "fail: a double-quoted csrf key",
			files:         map[string]string{"vite.config.ts": viteConfigWith(`"csrf": { trustedOrigins: ['*'] },`)},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"*"`},
		},
		{
			name:          "fail: a quoted trustedOrigins key",
			files:         map[string]string{"vite.config.ts": viteConfigWith(`csrf: { "trustedOrigins": ['*'] },`)},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"*"`},
		},
		{
			name:          "fail: a single-quoted trustedOrigins key with a null entry",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { 'trustedOrigins': ['null'] },")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"null"`},
		},
		{
			name:          "fail: both keys quoted",
			files:         map[string]string{"vite.config.ts": viteConfigWith(`"csrf": { 'trustedOrigins': ['*'] },`)},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"*"`},
		},
		{
			name:          "fail: a computed string csrf key",
			files:         map[string]string{"vite.config.ts": viteConfigWith("['csrf']: { trustedOrigins: ['*'] },")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"*"`},
		},
		{
			name:          "fail: a template-literal computed csrf key",
			files:         map[string]string{"vite.config.ts": viteConfigWith("[`csrf`]: { trustedOrigins: ['*'] },")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"*"`},
		},
		{
			name:          "fail: a template-literal computed trustedOrigins key",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { [`trustedOrigins`]: ['*'] },")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"*"`},
		},
		{
			name:          "fail: both keys template-literal computed",
			files:         map[string]string{"vite.config.ts": viteConfigWith("[ `csrf` ]: { [ `trustedOrigins` ]: ['null'] },")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"null"`},
		},
		{
			name:          "unchecked: a quoted shorthand-looking csrf value that is not an object",
			files:         map[string]string{"vite.config.ts": viteConfigWith("'csrf': csrfOptions,")},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"could not be read"},
		},
		{
			name:          "pass: a csrf key spelled inside a string is not a property",
			files:         map[string]string{"vite.config.ts": viteConfigWith("note: \"{ 'csrf': { trustedOrigins: ['*'] } }\",")},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"every route"},
		},
		{
			name:          "fail: a null entry",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: ['null'] },")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"null"`, "opaque origin", "/admin"},
		},
		{
			name:          "fail: a double-quoted null entry",
			files:         map[string]string{"vite.config.ts": viteConfigWith(`csrf: { trustedOrigins: ["null"] },`)},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"null"`},
		},
		{
			name:          "fail: a null entry among other entries",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: ['https://a.example', 'null'] },")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"null"`},
			wantDetailNot: []string{"a.example"},
		},
		{
			name:          "fail: both a wildcard and a null entry are named",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: ['*', 'null'] },")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"*"`, `"null"`},
		},
		{
			name:          "fail: the wildcard on a multi-line list with a trailing comma",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: {\n  trustedOrigins: [\n    'https://a.example',\n    '*',\n  ],\n},")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"*"`},
		},
		{
			name:          "fail: the wildcard still fails when a svelte.config.js remains",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: ['*'] },"), "svelte.config.js": "export default {};\n"},
			wantStatus:    StatusFail,
			wantDetailHas: []string{`"*"`},
		},
		{
			name:          "fail: reads vite.config.js",
			files:         map[string]string{"vite.config.js": viteConfigWith("csrf: { trustedOrigins: ['*'] },")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{"vite.config.js", `"*"`},
		},
		{
			name:          "fail: reads vite.config.mts",
			files:         map[string]string{"vite.config.mts": viteConfigWith("csrf: { trustedOrigins: ['*'] },")},
			wantStatus:    StatusFail,
			wantDetailHas: []string{"vite.config.mts", `"*"`},
		},
		{
			name:          "pass: a lookalike host is not the null entry",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: ['https://null.example'] },")},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"https://null.example", "widens", "/admin"},
		},
		{
			name:          "pass: an https origin passes with the widening detail",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: ['https://a.example'] },")},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"https://a.example", "widens", "/admin"},
			wantDetailNot: []string{"network attacker"},
		},
		{
			name:          "pass: a wildcard inside a host string is not the wildcard entry",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: ['https://*.example'] },")},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"https://*.example"},
		},
		{
			name:          "pass: an http origin for a public host names the network attacker",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: ['http://a.example'] },")},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"http://a.example", "network attacker"},
		},
		{
			name:          "pass: an http origin for a local host does not name the network attacker",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'] },")},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"http://localhost:5173"},
			wantDetailNot: []string{"network attacker"},
		},
		{
			name:          "pass: a url string holding two slashes is not cut as a comment",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: ['https://a.example'] }, // site origin")},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"https://a.example"},
		},
		{
			name:          "pass: no csrf key",
			files:         map[string]string{"vite.config.ts": viteConfigNoCsrf},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"vite.config.ts", "every route"},
		},
		{
			name:          "pass: a line-commented wildcard",
			files:         map[string]string{"vite.config.ts": viteConfigWith("// csrf: { trustedOrigins: ['*'] },")},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"every route"},
		},
		{
			name:          "pass: a wildcard commented out inside the list",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: [\n  // '*',\n  'https://a.example',\n] },")},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"https://a.example"},
		},
		{
			name:          "pass: a block-commented wildcard",
			files:         map[string]string{"vite.config.ts": viteConfigWith("/* csrf: { trustedOrigins: ['*'] }, */")},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"every route"},
		},
		{
			name:          "pass: an empty list",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: [] },")},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"every route"},
			wantDetailNot: []string{"widens"},
		},
		{
			name:          "pass: a csrf block with no trustedOrigins key",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: {},")},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"every route"},
		},
		{
			name:          "pass: an old checkOrigin line is ignored",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { checkOrigin: false },")},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"every route"},
		},
		{
			name:          "unchecked: an identifier",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: allowedOrigins },")},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"vite.config.ts", "could not be read"},
		},
		{
			name:          "unchecked: a spread",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: [...extraOrigins] },")},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"could not be read"},
		},
		{
			name:          "unchecked: an env-derived entry",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: [process.env.EXTRA_ORIGIN] },")},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"could not be read"},
		},
		{
			name:          "unchecked: a template literal with an interpolation",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: [`https://${host}`] },")},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"could not be read"},
		},
		{
			name:          "unchecked: an escaped entry",
			files:         map[string]string{"vite.config.ts": viteConfigWith(`csrf: { trustedOrigins: ['\x2a'] },`)},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"could not be read"},
		},
		{
			name:          "unchecked: a call expression",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: { trustedOrigins: origins() },")},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"could not be read"},
		},
		{
			name:          "unchecked: a csrf value that is not an object literal",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf: csrfConfig,")},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"could not be read"},
		},
		{
			name:          "unchecked: a shorthand csrf property",
			files:         map[string]string{"vite.config.ts": viteConfigWith("csrf,")},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"could not be read"},
		},
		{
			name:          "unchecked: no Vite config",
			files:         map[string]string{},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"vite.config.js", "vite.config.ts", "vite.config.mts"},
		},
		{
			name:          "unchecked: a vite.config.mjs alone is not read",
			files:         map[string]string{"vite.config.mjs": viteConfigWith("csrf: { trustedOrigins: ['*'] },")},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"was found"},
		},
		{
			name:          "unchecked: a remaining svelte.config.js points at the move",
			files:         map[string]string{"vite.config.ts": viteConfigNoCsrf, "svelte.config.js": "export default { kit: { csrf: { trustedOrigins: [] } } };\n"},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"svelte.config.js", "move", "sveltekit()"},
		},
		{
			name:          "unchecked: a svelte.config.js with no Vite config points at the move",
			files:         map[string]string{"svelte.config.js": "export default { kit: {} };\n"},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"svelte.config.js", "move"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := snapshotWithFiles(t, tt.files)
			result := runCheck(configCsrfTrustedOrigins, s).Result
			if result.Status != tt.wantStatus {
				t.Fatalf("Status = %v, want %v (detail %q)", result.Status, tt.wantStatus, result.Detail)
			}
			for _, want := range tt.wantDetailHas {
				if !strings.Contains(result.Detail, want) {
					t.Errorf("Detail = %q, want it to contain %q", result.Detail, want)
				}
			}
			for _, unwanted := range tt.wantDetailNot {
				if strings.Contains(result.Detail, unwanted) {
					t.Errorf("Detail = %q, want it not to contain %q", result.Detail, unwanted)
				}
			}
			if tt.wantStatus == StatusFail && result.Severity != spine.WarningFailure {
				t.Errorf("Severity = %v, want spine.WarningFailure", result.Severity)
			}
		})
	}
}

func TestConfigCsrfTrustedOriginsIdentity(t *testing.T) {
	if configCsrfTrustedOrigins.ID != "config.csrf-trusted-origins" {
		t.Errorf("ID = %q, want config.csrf-trusted-origins", configCsrfTrustedOrigins.ID)
	}
	if string(configCsrfTrustedOrigins.Condition) != "config.csrf-trusted-origins-wildcard" {
		t.Errorf("Condition = %q, want config.csrf-trusted-origins-wildcard", configCsrfTrustedOrigins.Condition)
	}
	if got := conditionText(configCsrfTrustedOrigins.Condition).Severity; got != spine.WarningFailure {
		t.Errorf("registry severity = %v, want spine.WarningFailure", got)
	}
}
