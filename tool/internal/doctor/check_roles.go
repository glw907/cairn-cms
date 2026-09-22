package doctor

import (
	"fmt"
	"regexp"
	"slices"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

const (
	// skipNoCustomRoles is auth.role-wiring's skip detail: no role beyond the implicit
	// owner/editor pair is declared, so the guard's own fallback already matches the
	// vocabulary.
	skipNoCustomRoles = "no custom roles declared; the guard fallback owner/editor already matches the vocabulary"
	// infoRoleWiringNoHooksFile is auth.role-wiring's info detail when neither hooks file
	// spelling exists.
	infoRoleWiringNoHooksFile = "src/hooks.server.ts not found, so the guard role wiring cannot be checked"
	// infoRoleWiringAbsent is auth.role-wiring's info detail when no createAuthGuard call is
	// found at all: the guard may be wired in another module the doctor cannot see.
	infoRoleWiringAbsent = "no createAuthGuard call found in src/hooks.server.ts (heuristic text read); the guard may be wired in another module"
	// infoRoleWiringIndirect is auth.role-wiring's info detail when createAuthGuard's argument
	// is a bare identifier the doctor cannot read into: that object may carry roles, so failing
	// it would not be a high-confidence positive.
	infoRoleWiringIndirect = "createAuthGuard is passed an options object the doctor cannot read (heuristic text read); verify the guard receives the declared roles"
	// tmplRoleWiringUnwired is auth.role-wiring's fail detail template, filled with the joined
	// custom role names.
	tmplRoleWiringUnwired = "the adapter declares custom roles (%s) but createAuthGuard in src/hooks.server.ts is not passed { roles }; the running guard falls back to owner/editor and resolves those roles to none capability (heuristic text read)"
	// passRoleWiringWired is auth.role-wiring's pass detail.
	passRoleWiringWired = "createAuthGuard is passed the declared role vocabulary (heuristic text read)"
)

// defaultRoleNames are DEFAULT_ROLES (src/lib/auth/roles.ts:24), the implicit pair every guard
// falls back to, filtered out of a site's declared vocabulary before deciding whether wiring
// matters: a role in this set resolves the same whether or not the guard receives it.
var defaultRoleNames = map[string]struct{}{"owner": {}, "editor": {}}

// customRoleNames ports checks-local.ts's own helper (:409-412): the roles a site declares
// beyond the implicit owner/editor pair, exactly the roles a guard on the default fallback would
// resolve to none. Sorted for a deterministic message, since the JSON roles map this reads from
// carries no ordering of its own.
func customRoleNames(roles []string) []string {
	var custom []string
	for _, name := range roles {
		if _, isDefault := defaultRoleNames[name]; !isDefault {
			custom = append(custom, name)
		}
	}
	slices.Sort(custom)
	return custom
}

// createAuthGuardCallPattern captures createAuthGuard's own argument list, non-greedy so a
// second call later in the file does not widen the capture. Ported from
// checks-local.ts's guardRoleWiring (:421-428).
var createAuthGuardCallPattern = regexp.MustCompile(`createAuthGuard\s*\(([\s\S]*?)\)`)

// rolesWordPattern matches a bare `roles` word in createAuthGuard's argument list, the wiring
// signal a `{ roles }` or `{ roles: siteRoles }` object literal both carry.
var rolesWordPattern = regexp.MustCompile(`\broles\b`)

// guardWiring is guardRoleWiring's own four-value result.
type guardWiring int

// The four outcomes checks-local.ts's guardRoleWiring distinguishes.
const (
	// guardWiringAbsent means no createAuthGuard call was found in the text at all.
	guardWiringAbsent guardWiring = iota
	// guardWiringUnwired means createAuthGuard was called with no roles argument: the running
	// guard falls back to owner/editor, the one outcome this check fails.
	guardWiringUnwired
	// guardWiringIndirect means createAuthGuard's argument is a bare identifier the doctor
	// cannot read into, such as createAuthGuard(guardOpts).
	guardWiringIndirect
	// guardWiringWired means the call's argument list mentions roles.
	guardWiringWired
)

// guardRoleWiring ports checks-local.ts's own helper (:421-428): read the createAuthGuard call
// in text and report whether it is passed a roles argument. absent and indirect are both
// reported as info rather than fail, since a wrapped or dynamically built guard reading either
// way is not a high-confidence positive: a positive fail should never be a false red.
func guardRoleWiring(text string) guardWiring {
	match := createAuthGuardCallPattern.FindStringSubmatch(text)
	if match == nil {
		return guardWiringAbsent
	}
	args := strings.TrimSpace(match[1])
	if rolesWordPattern.MatchString(args) {
		return guardWiringWired
	}
	if args != "" && !strings.Contains(args, "{") {
		return guardWiringIndirect
	}
	return guardWiringUnwired
}

// AuthRoleWiring ports checks-local.ts's roleWiring (:430-462): a site declaring custom roles
// must pass createAuthGuard the same vocabulary, or every editor whose role sits outside the
// implicit owner/editor pair resolves to none capability. It reads siteFacts for the declared
// vocabulary, so it reports unchecked with factsAbsentDetail when site-facts.json is absent.
var AuthRoleWiring = Check{
	ID:        "auth.role-wiring",
	Condition: spine.ConditionAuthRoleWiringMissing,
	Run: func(s Snapshot) Result {
		facts, found, err := readSiteFacts(s)
		if err != nil {
			return uncheckedResult(err.Error())
		}
		if !found {
			return uncheckedResult(factsAbsentDetail)
		}
		custom := customRoleNames(facts.Roles)
		if len(custom) == 0 {
			return skipResult(skipNoCustomRoles)
		}
		hooks, _, hooksFound, err := readHooksSource(s)
		if err != nil {
			return uncheckedResult(err.Error())
		}
		if !hooksFound {
			return infoResult(infoRoleWiringNoHooksFile)
		}
		switch guardRoleWiring(hooks) {
		case guardWiringAbsent:
			return infoResult(infoRoleWiringAbsent)
		case guardWiringIndirect:
			return infoResult(infoRoleWiringIndirect)
		case guardWiringUnwired:
			return failResult(spine.ConditionAuthRoleWiringMissing,
				fmt.Sprintf(tmplRoleWiringUnwired, strings.Join(custom, ", ")))
		default:
			return passResult(passRoleWiringWired)
		}
	},
}
