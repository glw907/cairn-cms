package doctor

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// enginePackageJSONFixture is a minimal installed @glw907/cairn-cms/package.json, its peer
// ranges matching the real ones asserted in src/tests/unit/doctor-check-floors.test.ts's
// readEnginePeers suite: svelte ^5.56.10, @sveltejs/kit ^2.70, and @anthropic-ai/sdk marked
// optional in peerDependenciesMeta (finding 6).
const enginePackageJSONFixture = `{
  "peerDependencies": {
    "@anthropic-ai/sdk": ">=0.105.0 <1",
    "@sveltejs/kit": "^2.70",
    "svelte": "^5.56.10"
  },
  "peerDependenciesMeta": {
    "@anthropic-ai/sdk": { "optional": true }
  }
}`

// npmLockFixture writes a lockfileVersion 3 package-lock.json body naming the given resolved
// versions, the same shape lockV3 builds in the TypeScript corpus.
func npmLockFixture(versions map[string]string) string {
	var b strings.Builder
	b.WriteString(`{"name":"site","lockfileVersion":3,"packages":{"":{"version":"0.0.0"}`)
	for dep, version := range versions {
		b.WriteString(`,"node_modules/`)
		b.WriteString(dep)
		b.WriteString(`":{"version":"`)
		b.WriteString(version)
		b.WriteString(`"}`)
	}
	b.WriteString("}}")
	return b.String()
}

// pnpmLockFixture writes a pnpm-lock.yaml v9 body whose root importer resolves the given
// versions, the same shape pnpmLockV9 builds in the TypeScript corpus.
func pnpmLockFixture(versions map[string]string) string {
	var b strings.Builder
	b.WriteString("lockfileVersion: '9.0'\nimporters:\n  .:\n    devDependencies:\n")
	for dep, version := range versions {
		b.WriteString("      '" + dep + "':\n")
		b.WriteString("        specifier: ^" + version + "\n")
		b.WriteString("        version: " + version + "\n")
	}
	return b.String()
}

// yarnLockFixture writes a classic yarn.lock body naming the given resolved versions, the same
// shape yarnLockClassic builds in the TypeScript corpus.
func yarnLockFixture(versions map[string]string) string {
	var b strings.Builder
	for dep, version := range versions {
		b.WriteString(`"` + dep + `@^` + version + `":` + "\n")
		b.WriteString(`  version "` + version + `"` + "\n")
		b.WriteString(`  resolved "https://example.invalid/` + dep + `"` + "\n\n")
	}
	return b.String()
}

// TestConfigDependencyFloors is table-driven over config.dependency-floors's reachable
// statuses: pass and fail on each of the three lockfile formats, a prerelease resolved version
// (skip), a non-caret engine range (skip), a below-floor version (fail), an outside-major
// version (fail), an absent node_modules/@glw907/cairn-cms/package.json (unchecked), and no
// lockfile at all (unchecked).
func TestConfigDependencyFloors(t *testing.T) {
	realPeerVersions := map[string]string{"svelte": "5.56.10", "@sveltejs/kit": "2.70.0"}

	tests := []struct {
		name          string
		files         map[string]string
		wantStatus    Status
		wantDetailHas string
	}{
		{
			name: "pass on package-lock.json",
			files: map[string]string{
				enginePackageJSONPath: enginePackageJSONFixture,
				"package-lock.json":   npmLockFixture(realPeerVersions),
			},
			wantStatus:    StatusPass,
			wantDetailHas: "satisfy the engine peer ranges",
		},
		{
			name: "fail on package-lock.json: a below-floor svelte",
			files: map[string]string{
				enginePackageJSONPath: enginePackageJSONFixture,
				"package-lock.json":   npmLockFixture(map[string]string{"svelte": "5.56.0", "@sveltejs/kit": "2.70.0"}),
			},
			wantStatus:    StatusFail,
			wantDetailHas: "svelte resolves to 5.56.0, below the engine floor ^5.56.10",
		},
		{
			name: "pass on pnpm-lock.yaml",
			files: map[string]string{
				enginePackageJSONPath: enginePackageJSONFixture,
				"pnpm-lock.yaml":      pnpmLockFixture(realPeerVersions),
			},
			wantStatus:    StatusPass,
			wantDetailHas: "satisfy the engine peer ranges",
		},
		{
			name: "fail on pnpm-lock.yaml: an outside-major svelte",
			files: map[string]string{
				enginePackageJSONPath: enginePackageJSONFixture,
				"pnpm-lock.yaml":      pnpmLockFixture(map[string]string{"svelte": "6.0.0", "@sveltejs/kit": "2.70.0"}),
			},
			wantStatus:    StatusFail,
			wantDetailHas: "svelte resolves to 6.0.0, outside the engine peer range ^5.56.10",
		},
		{
			name: "pass on yarn.lock",
			files: map[string]string{
				enginePackageJSONPath: enginePackageJSONFixture,
				"yarn.lock":           yarnLockFixture(realPeerVersions),
			},
			wantStatus:    StatusPass,
			wantDetailHas: "satisfy the engine peer ranges",
		},
		{
			name: "fail on yarn.lock: a below-floor kit",
			files: map[string]string{
				enginePackageJSONPath: enginePackageJSONFixture,
				"yarn.lock":           yarnLockFixture(map[string]string{"svelte": "5.56.10", "@sveltejs/kit": "2.11.9"}),
			},
			wantStatus:    StatusFail,
			wantDetailHas: "@sveltejs/kit resolves to 2.11.9, below the engine floor ^2.70",
		},
		{
			name: "skip: a prerelease resolved version",
			files: map[string]string{
				enginePackageJSONPath: enginePackageJSONFixture,
				"package-lock.json":   npmLockFixture(map[string]string{"svelte": "5.57.0-next.2", "@sveltejs/kit": "2.70.0"}),
			},
			wantStatus:    StatusSkip,
			wantDetailHas: "5.57.0-next.2",
		},
		{
			name: "unchecked: node_modules/@glw907/cairn-cms/package.json is absent",
			files: map[string]string{
				"package-lock.json": npmLockFixture(realPeerVersions),
			},
			wantStatus:    StatusUnchecked,
			wantDetailHas: detailEnginePackageJSONNotFound,
		},
		{
			name: "unchecked: no lockfile of any of the three formats exists",
			files: map[string]string{
				enginePackageJSONPath: enginePackageJSONFixture,
			},
			wantStatus:    StatusUnchecked,
			wantDetailHas: detailNoLockfileFound,
		},
		{
			name: "prefers package-lock.json when more than one lockfile exists",
			files: map[string]string{
				enginePackageJSONPath: enginePackageJSONFixture,
				"package-lock.json":   npmLockFixture(map[string]string{"svelte": "5.56.0", "@sveltejs/kit": "2.70.0"}),
				"pnpm-lock.yaml":      pnpmLockFixture(realPeerVersions),
			},
			wantStatus:    StatusFail,
			wantDetailHas: "svelte resolves to 5.56.0",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := snapshotWithFiles(t, tt.files)
			result := ConfigDependencyFloors.Run(s)
			if result.Status != tt.wantStatus {
				t.Fatalf("Status = %v, want %v (detail %q)", result.Status, tt.wantStatus, result.Detail)
			}
			if !strings.Contains(result.Detail, tt.wantDetailHas) {
				t.Errorf("Detail = %q, want it to contain %q", result.Detail, tt.wantDetailHas)
			}
			if tt.wantStatus == StatusFail && result.Condition != ConfigDependencyFloors.Condition {
				t.Errorf("Condition = %v, want %v", result.Condition, ConfigDependencyFloors.Condition)
			}
		})
	}
}

// TestConfigDependencyFloorsNonCaretEngineRangeSkips proves the non-caret-range skip arm
// separately, since it needs peers this task controls rather than the fixture package.json's
// real caret ranges: judgePeers skips rather than guesses when the engine's own declared range
// is not a simple caret form.
func TestConfigDependencyFloorsNonCaretEngineRangeSkips(t *testing.T) {
	verdict := npmDependencyFloors(
		npmLockFixture(map[string]string{"svelte": "5.56.10"}),
		map[string]string{"svelte": ">=5.56.10"},
	)
	if verdict.status != StatusSkip {
		t.Fatalf("status = %v, want StatusSkip (detail %q)", verdict.status, verdict.detail)
	}
	if !strings.Contains(verdict.detail, "not a simple caret range") {
		t.Errorf("detail = %q, want it to name the non-caret range", verdict.detail)
	}
}

// TestConfigDependencyFloorsSymlinkedNodeModulesIsUnchecked proves finding 6's own containment
// case: a pnpm or npm-workspace monorepo layout whose node_modules symlinks outside the site
// directory (Task 3's buildSymlinkedNodeModulesDir) makes the containment refusal report
// unchecked, naming the refused relative path, rather than failing the site or crashing the run.
func TestConfigDependencyFloorsSymlinkedNodeModulesIsUnchecked(t *testing.T) {
	site := buildSymlinkedNodeModulesDir(t)
	// Write a real package.json inside the symlink target, so a pass here proves the refusal
	// fired rather than merely finding nothing.
	pkgDir := filepath.Join(filepath.Dir(site), "real-node-modules", "@glw907", "cairn-cms")
	if err := os.MkdirAll(pkgDir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(pkgDir, "package.json"), []byte(enginePackageJSONFixture), 0o644); err != nil {
		t.Fatalf("write package.json: %v", err)
	}

	result := ConfigDependencyFloors.Run(Snapshot{Dir: site})
	if result.Status != StatusUnchecked {
		t.Fatalf("Status = %v, want StatusUnchecked (detail %q)", result.Status, result.Detail)
	}
	if !strings.Contains(result.Detail, enginePackageJSONPath) {
		t.Errorf("Detail = %q, want it to name the refused relative path %q", result.Detail, enginePackageJSONPath)
	}
}

// TestReadEnginePeersFiltersOptionalPeer proves finding 6's whole point: a peer marked optional
// in peerDependenciesMeta (@anthropic-ai/sdk) is filtered out of readEnginePeers's own result
// entirely, rather than surviving to be judged and read as a skip on its own missing lockfile
// entry, which would mask the framework verdict this check exists to give.
func TestReadEnginePeersFiltersOptionalPeer(t *testing.T) {
	s := snapshotWithFiles(t, map[string]string{enginePackageJSONPath: enginePackageJSONFixture})
	peers, found, err := readEnginePeers(s)
	if err != nil {
		t.Fatalf("readEnginePeers: %v", err)
	}
	if !found {
		t.Fatal("found = false, want true")
	}
	if _, ok := peers["@anthropic-ai/sdk"]; ok {
		t.Error("peers carries @anthropic-ai/sdk, want it filtered out as optional")
	}
	if peers["svelte"] != "^5.56.10" {
		t.Errorf(`peers["svelte"] = %q, want "^5.56.10"`, peers["svelte"])
	}
	if peers["@sveltejs/kit"] != "^2.70" {
		t.Errorf(`peers["@sveltejs/kit"] = %q, want "^2.70"`, peers["@sveltejs/kit"])
	}

	// A lockfile carrying no entry for the optional peer must not turn the run into a skip:
	// the two real peers alone must still pass.
	result := ConfigDependencyFloors.Run(snapshotWithFiles(t, map[string]string{
		enginePackageJSONPath: enginePackageJSONFixture,
		"package-lock.json":   npmLockFixture(map[string]string{"svelte": "5.56.10", "@sveltejs/kit": "2.70.0"}),
	}))
	if result.Status != StatusPass {
		t.Errorf("Status = %v, want StatusPass; the optional peer's absence must not read as a skip (detail %q)", result.Status, result.Detail)
	}
}
