package doctor

import "testing"

// TestAuthRoleWiring is table-driven over the no-custom-roles skip plus all four guardRoleWiring
// outcomes: wired (pass), unwired (fail), indirect (info), and absent (info), five cases in
// total.
func TestAuthRoleWiring(t *testing.T) {
	factsCustomRole := `{"version": 1, "roles": {"owner": "owner", "editor": "editor", "contributor": "editor"}}`
	factsNoCustomRole := `{"version": 1, "roles": {"owner": "owner", "editor": "editor"}}`

	tests := []struct {
		name       string
		files      map[string]string
		wantStatus Status
		wantDetail string
	}{
		{
			name: "skip: no custom roles beyond the default owner/editor pair",
			files: map[string]string{
				"src/content/.cairn/site-facts.json": factsNoCustomRole,
			},
			wantStatus: StatusSkip,
			wantDetail: skipNoCustomRoles,
		},
		{
			name: "info: hooks file not found",
			files: map[string]string{
				"src/content/.cairn/site-facts.json": factsCustomRole,
			},
			wantStatus: StatusInfo,
			wantDetail: infoRoleWiringNoHooksFile,
		},
		{
			name: "info: absent, no createAuthGuard call found",
			files: map[string]string{
				"src/content/.cairn/site-facts.json": factsCustomRole,
				"src/hooks.server.ts":                `export const handle = () => {};`,
			},
			wantStatus: StatusInfo,
			wantDetail: infoRoleWiringAbsent,
		},
		{
			name: "info: indirect, options passed as a bare identifier",
			files: map[string]string{
				"src/content/.cairn/site-facts.json": factsCustomRole,
				"src/hooks.server.ts":                `export const handle = createAuthGuard(guardOpts);`,
			},
			wantStatus: StatusInfo,
			wantDetail: infoRoleWiringIndirect,
		},
		{
			name: "fail: unwired, called with no roles argument",
			files: map[string]string{
				"src/content/.cairn/site-facts.json": factsCustomRole,
				"src/hooks.server.ts":                `export const handle = createAuthGuard({ from: 'x' });`,
			},
			wantStatus: StatusFail,
			wantDetail: "the adapter declares custom roles (contributor) but createAuthGuard in src/hooks.server.ts is not passed { roles }; the running guard falls back to owner/editor and resolves those roles to none capability (heuristic text read)",
		},
		{
			name: "pass: wired, called with a roles argument",
			files: map[string]string{
				"src/content/.cairn/site-facts.json": factsCustomRole,
				"src/hooks.server.ts":                `export const handle = createAuthGuard({ roles });`,
			},
			wantStatus: StatusPass,
			wantDetail: passRoleWiringWired,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := snapshotWithFiles(t, tt.files)
			result := AuthRoleWiring.Run(s)
			if result.Status != tt.wantStatus {
				t.Fatalf("Status = %v, want %v (detail %q)", result.Status, tt.wantStatus, result.Detail)
			}
			if result.Detail != tt.wantDetail {
				t.Errorf("Detail = %q, want %q", result.Detail, tt.wantDetail)
			}
		})
	}
}

// TestCustomRoleNamesFiltersDefaultsAndSorts asserts customRoleNames drops DEFAULT_ROLES (owner,
// editor) and returns the rest sorted, since the JSON roles map it reads from carries no
// ordering of its own.
func TestCustomRoleNamesFiltersDefaultsAndSorts(t *testing.T) {
	got := customRoleNames([]string{"editor", "reviewer", "owner", "contributor"})
	want := []string{"contributor", "reviewer"}
	if len(got) != len(want) {
		t.Fatalf("customRoleNames = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("customRoleNames = %v, want %v", got, want)
		}
	}
}

// TestGuardRoleWiring is table-driven over guardRoleWiring's own four outcomes directly, the
// heuristic auth.role-wiring's fail path relies on.
func TestGuardRoleWiring(t *testing.T) {
	tests := []struct {
		name string
		text string
		want guardWiring
	}{
		{"no call at all", `export const handle = () => {};`, guardWiringAbsent},
		{"bare identifier argument", `createAuthGuard(guardOpts)`, guardWiringIndirect},
		{"empty argument list", `createAuthGuard()`, guardWiringUnwired},
		{"object literal with no roles key", `createAuthGuard({ from: 'x' })`, guardWiringUnwired},
		{"object literal naming roles", `createAuthGuard({ roles })`, guardWiringWired},
		{"object literal naming roles as a value", `createAuthGuard({ roles: siteRoles })`, guardWiringWired},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := guardRoleWiring(tt.text); got != tt.want {
				t.Errorf("guardRoleWiring(%q) = %v, want %v", tt.text, got, tt.want)
			}
		})
	}
}
