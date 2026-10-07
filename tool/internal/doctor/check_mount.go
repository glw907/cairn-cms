package doctor

import (
	"regexp"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// adminMountPaths are the candidate files of the four-file /admin mount. There is no directory
// listing on Snapshot, so the check reads these known paths; a route file can be .ts or .js, so
// both spellings are probed.
var adminMountPaths = []string{
	"src/routes/admin/+layout.server.ts",
	"src/routes/admin/+layout.server.js",
	"src/routes/admin/+layout.svelte",
	"src/routes/admin/[...path]/+page.server.ts",
	"src/routes/admin/[...path]/+page.server.js",
	"src/routes/admin/[...path]/+page.svelte",
}

// adminMountGuidance is the one-line guidance an info result carries: the expected files plus the
// fix, naming the two mount signals verbatim, CairnAdminShell and .shellLoad.
const adminMountGuidance = "no wired /admin mount detected; mount the shared /admin/+layout that renders CairnAdminShell and calls createCairnAdmin({ runtime }).shellLoad, and the /admin/[...path] catch-all rendering CairnAdmin"

// passAdminMountWired is the pass detail when both mount signals are found in the candidate
// files (a heuristic text read, not proof of a working mount).
const passAdminMountWired = "the /admin mount wires shellLoad and renders CairnAdminShell (heuristic text read)"

// cairnAdminShellMentionPattern and shellLoadCallPattern back the mount-shape heuristic, loose so a
// renamed or wrapped composer still reads as wired. A .shellLoad
// member-access on any identifier (not a literal admin.shellLoad) proves the layout calls the
// composer's load; a CairnAdminShell mention anywhere under /admin proves the shared chrome
// renders.
var (
	cairnAdminShellMentionPattern = regexp.MustCompile(`CairnAdminShell`)
	shellLoadCallPattern          = regexp.MustCompile(`\.\s*shellLoad\b`)
)

func wiresAdminShell(text string) bool {
	return cairnAdminShellMentionPattern.MatchString(text)
}

func callsShellLoad(text string) bool {
	return shellLoadCallPattern.MatchString(text)
}

// readAdminMountText reads every candidate mount file that exists and joins their bodies, so the
// two signals can be found across whichever files the site keeps them in. found is false when
// none of adminMountPaths exists.
func readAdminMountText(s Snapshot) (text string, found bool, err error) {
	var bodies []string
	for _, path := range adminMountPaths {
		body, ok, readErr := s.readFile(path)
		if readErr != nil {
			return "", false, readErr
		}
		if ok {
			bodies = append(bodies, string(body))
		}
	}
	if len(bodies) == 0 {
		return "", false, nil
	}
	return strings.Join(bodies, "\n"), true, nil
}

// adminMountShape is a best-effort, non-blocking nudge over the /admin mount that calls
// createCairnAdmin's .shellLoad and renders CairnAdminShell. It never returns a fail: a fail is a
// hard deploy gate, and a warning-severity heuristic that could not see an unconventionally wired
// site must never go falsely red, so an unreadable or partial mount reports info with guidance
// instead.
var adminMountShape = Check{
	ID:        "admin.mount-shape",
	Condition: spine.ConditionAdminMountIncomplete,
	Run: func(s Snapshot) Result {
		text, found, err := readAdminMountText(s)
		if err != nil {
			return uncheckedResult(err.Error())
		}
		if !found {
			return infoResult(adminMountGuidance)
		}
		if callsShellLoad(text) && wiresAdminShell(text) {
			return passResult(passAdminMountWired)
		}
		return infoResult(adminMountGuidance)
	},
}
