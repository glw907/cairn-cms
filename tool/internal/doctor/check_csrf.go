package doctor

import (
	"regexp"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

const (
	// uncheckedCsrfDetail is config.csrf-disable's unchecked detail: neither candidate config
	// file exists, so the check has nothing to read.
	uncheckedCsrfDetail = "neither svelte.config.js nor vite.config.ts was found, so the CSRF handoff could not be checked"
	// failCsrfNoDisable is config.csrf-disable's fail detail when neither config file carries an
	// uncommented checkOrigin: false disable.
	failCsrfNoDisable = "no checkOrigin: false found in svelte.config.js or vite.config.ts (heuristic text read)"
	// failCsrfNoGuard is config.csrf-disable's fail detail when the disable is present but
	// createAuthGuard is not wired in src/hooks.server.ts (or .js).
	failCsrfNoGuard = "checkOrigin is off but no cairn guard found in src/hooks.server.ts; the site may have no CSRF protection"
	// passCsrfWired is config.csrf-disable's pass detail: the disable and the guard both found.
	passCsrfWired = "checkOrigin: false found (svelte.config.js or vite.config.ts) and the hooks file wires the cairn guard (heuristic text read)"
)

// checkOriginDisablePattern matches SvelteKit's csrf.checkOrigin: false disable, in whatever
// object-literal spacing a site writes it with.
var checkOriginDisablePattern = regexp.MustCompile(`checkOrigin\s*:\s*false`)

// cairnMentionPattern and handleMentionPattern back wiresCairnGuard's loose fallback: a case
// insensitive mention of cairn alongside the word handle, for a site that wraps createAuthGuard
// in its own module rather than importing it directly.
var (
	cairnMentionPattern  = regexp.MustCompile(`(?i)cairn`)
	handleMentionPattern = regexp.MustCompile(`handle`)
)

// hooksCandidatePaths are the two spellings a site's hooks module might use, .ts checked first.
var hooksCandidatePaths = []string{"src/hooks.server.ts", "src/hooks.server.js"}

// hasUncommentedDisable ports checks-local.ts's own helper (checks-local.ts:76-84): a line whose
// trimmed start is a comment marker cannot disable anything, so a commented-out
// checkOrigin: false never green-lights the handoff.
func hasUncommentedDisable(text string) bool {
	for line := range strings.SplitSeq(text, "\n") {
		trimmed := strings.TrimLeft(line, " \t")
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "*") || strings.HasPrefix(trimmed, "/*") {
			continue
		}
		if checkOriginDisablePattern.MatchString(trimmed) {
			return true
		}
	}
	return false
}

// wiresCairnGuard ports checks-local.ts's own helper (checks-local.ts:89-92). The tutorial's
// hooks file imports createAuthGuard from @glw907/cairn-cms and hands it the exported handle,
// which the first clause matches directly; a site that wraps the guard in its own module still
// mentions cairn beside a handle.
func wiresCairnGuard(text string) bool {
	if strings.Contains(text, "@glw907/cairn-cms") {
		return true
	}
	return cairnMentionPattern.MatchString(text) && handleMentionPattern.MatchString(text)
}

// readHooksSource reads the site's hooks module under either spelling, .ts preferred, returning
// the path it read from alongside the text so a failure can name the file. found is false when
// neither candidate exists.
func readHooksSource(s Snapshot) (text, path string, found bool, err error) {
	for _, candidate := range hooksCandidatePaths {
		body, ok, readErr := s.ReadFile(candidate)
		if readErr != nil {
			return "", "", false, readErr
		}
		if ok {
			return string(body), candidate, true, nil
		}
	}
	return "", "", false, nil
}

// ConfigCsrfDisable ports checks-local.ts's configCsrfDisable (checks-local.ts:94-127): the
// framework's csrf: { checkOrigin: false } disable must be paired with createAuthGuard wired in
// src/hooks.server.ts (or .js), the pair that keeps admin form POSTs protected once the
// framework's own check steps aside. The disable alone proves nothing: with checkOrigin: false
// set and no cairn guard in the hooks, the admin form POSTs have no CSRF protection at all.
var ConfigCsrfDisable = Check{
	ID:        "config.csrf-disable",
	Condition: spine.ConditionConfigCSRFDisableMissing,
	Run: func(s Snapshot) Result {
		svelteConfig, svelteFound, err := s.ReadFile("svelte.config.js")
		if err != nil {
			return uncheckedResult("config.csrf-disable", err.Error())
		}
		// A bare `sv create` scaffold writes no svelte.config.js at all, wiring the adapter (and
		// any csrf: { checkOrigin: false }) inside vite.config.ts's plugin call instead, so both
		// files are read.
		viteConfig, viteFound, err := s.ReadFile("vite.config.ts")
		if err != nil {
			return uncheckedResult("config.csrf-disable", err.Error())
		}
		if !svelteFound && !viteFound {
			return uncheckedResult("config.csrf-disable", uncheckedCsrfDetail)
		}

		var combined strings.Builder
		if svelteFound {
			combined.Write(svelteConfig)
			combined.WriteByte('\n')
		}
		if viteFound {
			combined.Write(viteConfig)
		}
		if !hasUncommentedDisable(combined.String()) {
			return failResult("config.csrf-disable", spine.ConditionConfigCSRFDisableMissing, failCsrfNoDisable)
		}

		hooks, _, hooksFound, err := readHooksSource(s)
		if err != nil {
			return uncheckedResult("config.csrf-disable", err.Error())
		}
		if !hooksFound || !wiresCairnGuard(hooks) {
			return failResult("config.csrf-disable", spine.ConditionConfigCSRFDisableMissing, failCsrfNoGuard)
		}
		return passResult("config.csrf-disable", passCsrfWired)
	},
}
