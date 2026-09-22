package doctor

import (
	"encoding/json"
	"fmt"
	"maps"
	"regexp"
	"slices"
	"strconv"
	"strings"

	"go.yaml.in/yaml/v3"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// enginePackageJSONPath is where a resolved npm, pnpm, or yarn install places the engine's own
// package.json, the source of truth for its declared peer ranges (spec :162-164).
const enginePackageJSONPath = "node_modules/@glw907/cairn-cms/package.json"

const (
	detailEnginePackageJSONNotFound = "node_modules/@glw907/cairn-cms/package.json not found"
	detailEnginePackageJSONInvalid  = "node_modules/@glw907/cairn-cms/package.json did not parse"
	detailNoLockfileFound           = "none of package-lock.json, pnpm-lock.yaml, or yarn.lock was found"
	detailNpmLockParseFailed        = "package-lock.json did not parse"
	detailNpmLockNoPackagesMap      = "package-lock.json carries no packages map (lockfile v1; reinstall with a current npm)"
	detailPnpmLockParseFailed       = "pnpm-lock.yaml did not parse"

	tmplCaretRangeSkip   = "%s: the engine range %s is not a simple caret range"
	tmplPrereleaseSkip   = "%s: resolved %s is not a plain x.y.z version"
	tmplBelowFloorFail   = "%s resolves to %s, below the engine floor %s"
	tmplOutsideMajorFail = "%s resolves to %s, outside the engine peer range %s"
	tmplPassSatisfied    = "%s satisfy the engine peer ranges"
	tmplNpmMissingEntry  = "%s: no node_modules/%s entry in package-lock.json"
	tmplPnpmMissingEntry = "%s: no entry for it in pnpm-lock.yaml"
	tmplYarnMissingEntry = "%s: no entry for it in yarn.lock"
)

// semver is a plain major.minor.patch triple, the only shape parseVersion and caretFloor
// produce: no prerelease or build metadata field exists, since both functions return false
// rather than represent one.
type semver struct {
	major, minor, patch int
}

// plainVersionPattern matches a bare x.y.z version. A prerelease or build tag (5.57.0-next.2)
// does not match, so parseVersion reports it unparseable rather than guessing an order for it.
var plainVersionPattern = regexp.MustCompile(`^(\d+)\.(\d+)\.(\d+)$`)

// parseVersion ports check-floors.ts's parseVersion (:22-26): plain x.y.z only.
func parseVersion(text string) (semver, bool) {
	m := plainVersionPattern.FindStringSubmatch(text)
	if m == nil {
		return semver{}, false
	}
	major, _ := strconv.Atoi(m[1])
	minor, _ := strconv.Atoi(m[2])
	patch, _ := strconv.Atoi(m[3])
	return semver{major, minor, patch}, true
}

// caretRangePattern matches the engine's own caret forms: ^x, ^x.y, and ^x.y.z. Any other range
// shape (>=, a bare version, a tilde range) does not match.
var caretRangePattern = regexp.MustCompile(`^\^(\d+)(?:\.(\d+))?(?:\.(\d+))?$`)

// caretFloor ports check-floors.ts's caretFloor (:31-35): the caret forms only. A missing minor
// or patch segment reads as 0, the same short-form the kit peer (^2.70) relies on.
func caretFloor(rng string) (semver, bool) {
	m := caretRangePattern.FindStringSubmatch(rng)
	if m == nil {
		return semver{}, false
	}
	major, _ := strconv.Atoi(m[1])
	var minor, patch int
	if m[2] != "" {
		minor, _ = strconv.Atoi(m[2])
	}
	if m[3] != "" {
		patch, _ = strconv.Atoi(m[3])
	}
	return semver{major, minor, patch}, true
}

// compareVersions ports check-floors.ts's compareVersions (:37-39): negative when a is lower,
// positive when a is higher, zero when equal, comparing major then minor then patch.
func compareVersions(a, b semver) int {
	if d := a.major - b.major; d != 0 {
		return d
	}
	if d := a.minor - b.minor; d != 0 {
		return d
	}
	return a.patch - b.patch
}

// floorsVerdict is judgePeers's own settled outcome, carrying no check ID or condition: the
// caller (configDependencyFloors's Run) attaches both when it wraps a verdict into a Result.
type floorsVerdict struct {
	status Status
	detail string
}

// judgePeers ports check-floors.ts's judgePeers (:58-95): it judges every peer in a fixed,
// sorted order (peers is a Go map, unlike the TypeScript object's own insertion order, so
// sorting by dependency name keeps the joined detail deterministic) against resolve, which looks
// up one dependency's resolved version in whichever lockfile is in play. missingEntry names the
// per-dependency message for a lockfile that carries no entry for it, since each format's
// message names its own file.
func judgePeers(resolve func(dep string) (string, bool), peers map[string]string, missingEntry func(dep string) string) floorsVerdict {
	var failures, skips, passes []string
	for _, dep := range slices.Sorted(maps.Keys(peers)) {
		rng := peers[dep]
		floor, ok := caretFloor(rng)
		if !ok {
			skips = append(skips, fmt.Sprintf(tmplCaretRangeSkip, dep, rng))
			continue
		}
		resolved, ok := resolve(dep)
		if !ok {
			skips = append(skips, missingEntry(dep))
			continue
		}
		version, ok := parseVersion(resolved)
		if !ok {
			skips = append(skips, fmt.Sprintf(tmplPrereleaseSkip, dep, resolved))
			continue
		}
		switch {
		case compareVersions(version, floor) < 0:
			failures = append(failures, fmt.Sprintf(tmplBelowFloorFail, dep, resolved, rng))
		case version.major != floor.major:
			failures = append(failures, fmt.Sprintf(tmplOutsideMajorFail, dep, resolved, rng))
		default:
			passes = append(passes, fmt.Sprintf("%s %s", dep, resolved))
		}
	}
	switch {
	case len(failures) > 0:
		return floorsVerdict{StatusFail, strings.Join(failures, "; ")}
	case len(skips) > 0:
		return floorsVerdict{StatusSkip, strings.Join(skips, "; ")}
	default:
		return floorsVerdict{StatusPass, fmt.Sprintf(tmplPassSatisfied, strings.Join(passes, " and "))}
	}
}

// npmLockedVersion reads dep's resolved version out of a package-lock.json's already-parsed
// packages map, ported from check-floors.ts's lockedVersion (:46-49).
func npmLockedVersion(packages map[string]any, dep string) (string, bool) {
	entry, ok := packages["node_modules/"+dep]
	if !ok {
		return "", false
	}
	m, ok := entry.(map[string]any)
	if !ok {
		return "", false
	}
	version, ok := m["version"].(string)
	return version, ok
}

// npmDependencyFloors ports check-floors.ts's dependencyFloorsResult (:103-125) minus its
// null-lockfile case, which the caller (configDependencyFloors's Run) already resolved by
// choosing to read package-lock.json at all.
func npmDependencyFloors(lockText string, peers map[string]string) floorsVerdict {
	var root map[string]any
	if err := json.Unmarshal([]byte(lockText), &root); err != nil {
		return floorsVerdict{StatusFail, detailNpmLockParseFailed}
	}
	packagesRaw, ok := root["packages"]
	if !ok {
		return floorsVerdict{StatusSkip, detailNpmLockNoPackagesMap}
	}
	packages, _ := packagesRaw.(map[string]any)
	return judgePeers(
		func(dep string) (string, bool) { return npmLockedVersion(packages, dep) },
		peers,
		func(dep string) string { return fmt.Sprintf(tmplNpmMissingEntry, dep, dep) },
	)
}

// pnpmDepVersion reads one pnpm lockfile entry's resolved version, ported from
// check-floors.ts's pnpmDepVersion (:130-140): the entry is either a bare version string or a
// mapping carrying its own "version" key, and either shape can carry a peer-dependency suffix in
// parentheses (e.g. "5.56.10(vite@6.0.0)"), stripped before returning.
func pnpmDepVersion(entry any) (string, bool) {
	var raw string
	switch v := entry.(type) {
	case string:
		raw = v
	case map[string]any:
		s, ok := v["version"].(string)
		if !ok {
			return "", false
		}
		raw = s
	default:
		return "", false
	}
	return strings.SplitN(raw, "(", 2)[0], true
}

// pnpmResolveVersion reads dep's resolved version out of a pnpm-lock.yaml's already-parsed
// document, ported from check-floors.ts's pnpmResolve (:148-156): the root importer's
// dependencies then devDependencies first (lockfileVersion 9), falling back to the legacy
// top-level maps (lockfileVersion 5 and 6).
func pnpmResolveVersion(lock map[string]any, dep string) (string, bool) {
	if importers, ok := lock["importers"].(map[string]any); ok {
		if root, ok := importers["."].(map[string]any); ok {
			for _, section := range []string{"dependencies", "devDependencies"} {
				if deps, ok := root[section].(map[string]any); ok {
					if entry, ok := deps[dep]; ok {
						if version, ok := pnpmDepVersion(entry); ok {
							return version, true
						}
					}
				}
			}
		}
	}
	for _, section := range []string{"dependencies", "devDependencies"} {
		if deps, ok := lock[section].(map[string]any); ok {
			if entry, ok := deps[dep]; ok {
				if version, ok := pnpmDepVersion(entry); ok {
					return version, true
				}
			}
		}
	}
	return "", false
}

// pnpmDependencyFloors ports check-floors.ts's pnpmDependencyFloorsResult (:173-185).
func pnpmDependencyFloors(lockText string, peers map[string]string) floorsVerdict {
	var root any
	if err := yaml.Unmarshal([]byte(lockText), &root); err != nil {
		return floorsVerdict{StatusFail, detailPnpmLockParseFailed}
	}
	lock, _ := root.(map[string]any)
	return judgePeers(
		func(dep string) (string, bool) { return pnpmResolveVersion(lock, dep) },
		peers,
		func(dep string) string { return fmt.Sprintf(tmplPnpmMissingEntry, dep) },
	)
}

// yarnVersionLinePattern matches an indented "version" line in either yarn.lock generation:
// classic's `version "x.y.z"` or Berry's `version: x.y.z`.
var yarnVersionLinePattern = regexp.MustCompile(`^\s+version:?\s+"?([^"\s]+)"?`)

// yarnLockedVersion ports check-floors.ts's yarnLockedVersion (:195-215): a heuristic text read
// over yarn.lock, classic (v1) or Berry, never a grammar. A block opens with one or more
// comma-separated specifiers ending its header line in ":"; the block matching dep is the one
// whose specifier list names it, and the version is read off the first indented "version" line
// that follows.
func yarnLockedVersion(lockText, dep string) (string, bool) {
	lines := strings.Split(lockText, "\n")
	for i := 0; i < len(lines); i++ {
		line := lines[i]
		if strings.TrimSpace(line) == "" || strings.HasPrefix(line, "#") || startsWithSpace(line) {
			continue
		}
		header := strings.TrimRight(line, " \t\r")
		if !strings.HasSuffix(header, ":") {
			continue
		}
		specifiers := strings.Split(header[:len(header)-1], ",")
		namesThisDep := false
		for _, spec := range specifiers {
			spec = strings.Trim(strings.TrimSpace(spec), `"`)
			name := spec
			if at := strings.LastIndex(spec, "@"); at > 0 {
				name = spec[:at]
			}
			if name == dep {
				namesThisDep = true
				break
			}
		}
		if !namesThisDep {
			continue
		}
		for j := i + 1; j < len(lines) && startsWithSpace(lines[j]); j++ {
			if m := yarnVersionLinePattern.FindStringSubmatch(lines[j]); m != nil {
				return m[1], true
			}
		}
	}
	return "", false
}

// startsWithSpace reports whether line's first byte is a space or a tab, the same
// character class JavaScript's /^\s/ tests against an ASCII lockfile line.
func startsWithSpace(line string) bool {
	return len(line) > 0 && (line[0] == ' ' || line[0] == '\t')
}

// yarnDependencyFloors ports check-floors.ts's yarnDependencyFloorsResult (:222-228): yarn.lock
// is not JSON or YAML, so there is no parse-failure branch.
func yarnDependencyFloors(lockText string, peers map[string]string) floorsVerdict {
	return judgePeers(
		func(dep string) (string, bool) { return yarnLockedVersion(lockText, dep) },
		peers,
		func(dep string) string { return fmt.Sprintf(tmplYarnMissingEntry, dep) },
	)
}

// enginePackageJSON is the installed engine's own package.json's relevant shape: its declared
// peer ranges and which of them peerDependenciesMeta marks optional.
type enginePackageJSON struct {
	PeerDependencies     map[string]string `json:"peerDependencies"`
	PeerDependenciesMeta map[string]struct {
		Optional bool `json:"optional"`
	} `json:"peerDependenciesMeta"`
}

// readEnginePeers ports check-floors.ts's readEnginePeers (:238-248), reading
// node_modules/@glw907/cairn-cms/package.json as a plain file under s (spec :162-164) rather
// than through Node's module resolution. found is false when the file does not exist; err is
// non-nil for a containment refusal (a symlinked node_modules escaping s.Dir) or a parse
// failure, both of which the caller reports as unchecked rather than a crash. A peer marked
// optional in peerDependenciesMeta is filtered out: a site that never uses the feature behind
// one (@anthropic-ai/sdk, the tidy action) legitimately does not install it, and counting it
// would read as a skip that masks the framework verdict this check exists to give (finding 6).
func readEnginePeers(s Snapshot) (peers map[string]string, found bool, err error) {
	body, ok, err := s.ReadFile(enginePackageJSONPath)
	if err != nil {
		return nil, false, err
	}
	if !ok {
		return nil, false, nil
	}
	var pkg enginePackageJSON
	if err := json.Unmarshal(body, &pkg); err != nil {
		return nil, false, fmt.Errorf("%s", detailEnginePackageJSONInvalid)
	}
	out := make(map[string]string, len(pkg.PeerDependencies))
	for dep, rng := range pkg.PeerDependencies {
		if meta, ok := pkg.PeerDependenciesMeta[dep]; ok && meta.Optional {
			continue
		}
		out[dep] = rng
	}
	return out, true, nil
}

// resultFromFloorsVerdict wraps a floorsVerdict into config.dependency-floors's Result,
// resolving Severity from the registry only when the verdict is a fail.
func resultFromFloorsVerdict(v floorsVerdict) Result {
	r := Result{ID: "config.dependency-floors", Status: v.status, Detail: v.detail}
	if v.status == StatusFail {
		r.Condition = spine.ConditionConfigDependencyFloorsUnmet
		r.Severity = severityFor(spine.ConditionConfigDependencyFloorsUnmet)
	}
	return r
}

// ConfigDependencyFloors ports checks-local.ts's configDependencyFloors (check-floors.ts
// :250-267): the resolved svelte and @sveltejs/kit versions in whichever lockfile exists,
// judged against the installed engine's own declared peer ranges. package-lock.json, then
// pnpm-lock.yaml, then yarn.lock: the first recognized lockfile that exists is the one judged.
var ConfigDependencyFloors = Check{
	ID:        "config.dependency-floors",
	Condition: spine.ConditionConfigDependencyFloorsUnmet,
	Run: func(s Snapshot) Result {
		peers, found, err := readEnginePeers(s)
		if err != nil {
			return uncheckedResult("config.dependency-floors", err.Error())
		}
		if !found {
			return uncheckedResult("config.dependency-floors", detailEnginePackageJSONNotFound)
		}

		npmLock, ok, err := s.ReadFile("package-lock.json")
		if err != nil {
			return uncheckedResult("config.dependency-floors", err.Error())
		}
		if ok {
			return resultFromFloorsVerdict(npmDependencyFloors(string(npmLock), peers))
		}

		pnpmLock, ok, err := s.ReadFile("pnpm-lock.yaml")
		if err != nil {
			return uncheckedResult("config.dependency-floors", err.Error())
		}
		if ok {
			return resultFromFloorsVerdict(pnpmDependencyFloors(string(pnpmLock), peers))
		}

		yarnLock, ok, err := s.ReadFile("yarn.lock")
		if err != nil {
			return uncheckedResult("config.dependency-floors", err.Error())
		}
		if ok {
			return resultFromFloorsVerdict(yarnDependencyFloors(string(yarnLock), peers))
		}

		return uncheckedResult("config.dependency-floors", detailNoLockfileFound)
	},
}
