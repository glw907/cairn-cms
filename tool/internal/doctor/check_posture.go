package doctor

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// aiCrawlerTokens are AI_CRAWLERS's own tokens (src/lib/delivery/ai-crawlers.ts), lowercased for
// RFC 9309 section 2.2.1's case-insensitive product-token match.
var aiCrawlerTokens = map[string]struct{}{
	"amazonbot":          {},
	"applebot-extended":  {},
	"ccbot":              {},
	"claudebot":          {},
	"google-extended":    {},
	"gptbot":             {},
	"meta-externalagent": {},
}

// The two Content-Signal values buildRobots emits (src/lib/delivery/robots.ts:22-25), the
// postures a served file's own directive states rather than what the adapter declares.
const (
	contentSignalDecline = "ai-train=no"
	contentSignalInvite  = "search=yes, ai-train=yes"
)

// whitespacePattern backs canonicalizeSignal, folding a Content-Signal value's comma-spacing.
var whitespacePattern = regexp.MustCompile(`\s+`)

// canonicalizeSignal ports check-posture.ts's own helper: strip whitespace and case so a
// comparison never hinges on comma-spacing.
func canonicalizeSignal(value string) string {
	return strings.ToLower(whitespacePattern.ReplaceAllString(value, ""))
}

// signalPostures maps each canonicalized Content-Signal value buildRobots can emit to the
// posture it states.
var signalPostures = map[string]string{
	canonicalizeSignal(contentSignalDecline): "decline",
	canonicalizeSignal(contentSignalInvite):  "invite",
}

var (
	robotsUserAgentLinePattern     = regexp.MustCompile(`(?i)^user-agent:\s*(.+)$`)
	robotsContentSignalLinePattern = regexp.MustCompile(`(?i)^content-signal:\s*(.+)$`)
	robotsDisallowLinePattern      = regexp.MustCompile(`(?i)^disallow:\s*(.+)$`)
	robotsLineSplitPattern         = regexp.MustCompile(`\r?\n`)
)

// parsedRobots is the structural facts evaluatePosture's case decision needs off any RFC
// 9309 shaped file, including one cairn did not write.
type parsedRobots struct {
	// userAgentStarCount is how many "User-agent: *" lines the file carries; cairn's own
	// output writes exactly one.
	userAgentStarCount int
	// foreignContentSignal reports whether a Content-Signal line's value matches neither of
	// cairn's own two shapes.
	foreignContentSignal bool
	// signalPosture is the posture stated by the one Content-Signal line that matches a cairn
	// shape, when any does.
	signalPosture string
	// hasSignalPosture reports whether signalPosture was set.
	hasSignalPosture bool
	// declinesAIToken reports whether any aiCrawlerTokens entry carries its own
	// User-agent/Disallow: / group.
	declinesAIToken bool
}

// parseRobots ports check-posture.ts's own parseRobots (:93-132). Consecutive User-agent lines
// share one rule set (RFC 9309 section 2.2.1), so a file naming seven agents above a single
// Disallow: / declines all seven; crediting only the last would report a declining site as
// contradicting itself. Product tokens match case-insensitively, as that same section
// requires.
func parseRobots(text string) parsedRobots {
	var parsed parsedRobots
	// groupNamesAIToken and groupHasRule track whether the group being read names a
	// crawler-table token, and whether a rule has closed it. A User-agent line after a rule
	// starts a new group; one directly after another joins the current group, so a token named
	// anywhere above the group's Disallow: / counts.
	var groupNamesAIToken, groupHasRule bool

	for _, raw := range robotsLineSplitPattern.Split(text, -1) {
		line := strings.TrimSpace(raw)

		if match := robotsUserAgentLinePattern.FindStringSubmatch(line); match != nil {
			if groupHasRule {
				groupNamesAIToken = false
				groupHasRule = false
			}
			token := strings.TrimSpace(match[1])
			if token == "*" {
				parsed.userAgentStarCount++
			} else if _, ok := aiCrawlerTokens[strings.ToLower(token)]; ok {
				groupNamesAIToken = true
			}
			continue
		}

		if match := robotsContentSignalLinePattern.FindStringSubmatch(line); match != nil {
			if posture, ok := signalPostures[canonicalizeSignal(match[1])]; ok {
				parsed.signalPosture = posture
				parsed.hasSignalPosture = true
			} else {
				parsed.foreignContentSignal = true
			}
			groupHasRule = true
			continue
		}

		match := robotsDisallowLinePattern.FindStringSubmatch(line)
		if match == nil {
			continue
		}
		groupHasRule = true
		if strings.TrimSpace(match[1]) == "/" && groupNamesAIToken {
			parsed.declinesAIToken = true
		}
	}

	return parsed
}

// observedPosture ports check-posture.ts's own helper: what the served file itself states, read
// off its Content-Signal or its per-crawler groups. One declined token is enough to read the
// file as declining.
func observedPosture(parsed parsedRobots) (posture string, ok bool) {
	if parsed.hasSignalPosture {
		return parsed.signalPosture, true
	}
	if parsed.declinesAIToken {
		return "decline", true
	}
	return "", false
}

const (
	// tmplPostureManagedLayerNote is describeOutsideLayer's note when the served file carries
	// more than one "User-agent: *" group, the shape a managed robots.txt produces by
	// prepending to the origin's own file.
	tmplPostureManagedLayerNote = `%s carries %d "User-agent: *" groups%s. cairn's own output writes one such group, ` +
		"so a second came from somewhere ahead of it, and this check cannot see what or " +
		"assert why. A managed robots.txt prepending to the origin's is the common source, " +
		"so the zone's robots.txt and AI Crawl Control settings are where to look first."
	// postureManagedLayerForeignSignalClause is appended to tmplPostureManagedLayerNote when a
	// foreign Content-Signal accompanies the second group.
	postureManagedLayerForeignSignalClause = ", along with a Content-Signal directive cairn did not write"
	// tmplPostureForeignSignalNote is describeOutsideLayer's note when the file carries one
	// "User-agent: *" group and an unfamiliar Content-Signal: not the managed-layer shape, but
	// still something other than cairn writing into the file.
	tmplPostureForeignSignalNote = "%s carries a Content-Signal directive cairn did not write, so something other than " +
		"this engine is writing directives into the served file. The file carries one " +
		`"User-agent: *" group, so this is not the prepend shape a managed robots.txt ` +
		"produces, and this check cannot see what wrote it."
)

// describeOutsideLayer ports check-posture.ts's own helper: what the served file shows of a
// layer other than cairn writing into it, or ok false when it shows none. Two User-agent: *
// groups is the shape a managed robots.txt produces by prepending to the origin's own file; a
// single group carrying an unfamiliar Content-Signal is not that shape, so it reports the
// directive without naming a cause.
func describeOutsideLayer(parsed parsedRobots, target *url.URL) (note string, ok bool) {
	if parsed.userAgentStarCount > 1 {
		signal := ""
		if parsed.foreignContentSignal {
			signal = postureManagedLayerForeignSignalClause
		}
		return fmt.Sprintf(tmplPostureManagedLayerNote, target, parsed.userAgentStarCount, signal), true
	}
	if parsed.foreignContentSignal {
		return fmt.Sprintf(tmplPostureForeignSignalNote, target), true
	}
	return "", false
}

const (
	// postureUnsetNote is evaluatePosture's opening clause when the adapter declares no
	// aiPosture at all.
	postureUnsetNote = "no AI posture is stated (aiPosture is unset)"
	// tmplPostureDeclaredMatch is evaluatePosture's pass detail when the served file carries
	// directives consistent with the declared posture.
	tmplPostureDeclaredMatch = "aiPosture is '%s', and %s carries directives consistent with it.%s"
	// tmplPostureDeclaredMismatch is evaluatePosture's fail detail when the served file does
	// not: the one case this check fails.
	tmplPostureDeclaredMismatch = "aiPosture is '%s', but %s carries %s.%s"
	// postureNoDirectivesConsistent fills tmplPostureDeclaredMismatch's carries clause when the
	// file states no posture at all.
	postureNoDirectivesConsistent = "no directives consistent with it"
	// tmplPostureObservedInstead fills tmplPostureDeclaredMismatch's carries clause when the
	// file states the other posture instead.
	tmplPostureObservedInstead = "directives consistent with '%s' instead"
	// tmplPostureUnsetWithOutside is evaluatePosture's pass detail when nothing is declared and
	// the served file shows an outside layer.
	tmplPostureUnsetWithOutside = "%s. %s"
	// tmplPostureUnsetNoDirectives is evaluatePosture's pass detail when nothing is declared and
	// the served file carries no AI-crawler directives either.
	tmplPostureUnsetNoDirectives = "%s. %s carries no AI-crawler directives, consistent with stating nothing."
	// tmplPostureUnsetObserved is evaluatePosture's pass detail when nothing is declared but the
	// served file nonetheless carries directives consistent with one posture.
	tmplPostureUnsetObserved = "%s, but %s carries directives consistent with '%s'. Set aiPosture explicitly if that is deliberate."
)

// evaluatePosture ports check-posture.ts's own evaluate (:187-219): decide and report one of the
// three cases, no stance, a contradiction, or an outside layer. The declared posture is compared
// against the served file first, and an outside layer is reported alongside that comparison
// rather than instead of it, since a site declaring invite under a managed robots.txt that
// declines is exactly the incident this check exists for.
func evaluatePosture(hasDeclared bool, declared, body string, target *url.URL) Result {
	parsed := parseRobots(body)
	observed, hasObserved := observedPosture(parsed)
	outside, hasOutside := describeOutsideLayer(parsed, target)
	suffix := ""
	if hasOutside {
		suffix = " " + outside
	}

	if hasDeclared {
		if hasObserved && declared == observed {
			return passResult("ai.posture-effective", fmt.Sprintf(tmplPostureDeclaredMatch, declared, target, suffix))
		}
		carries := postureNoDirectivesConsistent
		if hasObserved {
			carries = fmt.Sprintf(tmplPostureObservedInstead, observed)
		}
		return failResult("ai.posture-effective", spine.ConditionAIPostureNotEffective,
			fmt.Sprintf(tmplPostureDeclaredMismatch, declared, target, carries, suffix))
	}

	if hasOutside {
		return passResult("ai.posture-effective", fmt.Sprintf(tmplPostureUnsetWithOutside, postureUnsetNote, outside))
	}
	if !hasObserved {
		return passResult("ai.posture-effective", fmt.Sprintf(tmplPostureUnsetNoDirectives, postureUnsetNote, target))
	}
	return passResult("ai.posture-effective", fmt.Sprintf(tmplPostureUnsetObserved, postureUnsetNote, target, observed))
}

const (
	// detailPostureNoOrigin is ai.posture-effective's unchecked detail when the snapshot
	// resolved no public origin to probe.
	detailPostureNoOrigin = "no public origin resolved to fetch /robots.txt from; set PUBLIC_ORIGIN in the wrangler vars or the environment"
	// detailPostureBadOrigin is ai.posture-effective's unchecked detail when the resolved
	// origin does not parse as an http or https URL.
	detailPostureBadOrigin = "the resolved public origin does not parse as an http or https URL"
	// detailPostureUnreachable is ai.posture-effective's unchecked detail when the GET itself
	// failed: a timeout, a DNS failure, a refused connection.
	detailPostureUnreachable = "could not reach the resolved origin's /robots.txt"
	// detailPostureNonOK is ai.posture-effective's unchecked detail when the origin answered
	// with a non-200 status, a followed redirect included, since a redirect is never followed.
	detailPostureNonOK = "the resolved origin's /robots.txt did not return 200"
)

// postureRobotsAbsentDetail names why Snapshot.Robots carries no body, for ai.posture-effective's
// unchecked detail. A doctor run offline must not read as an AI-posture problem, so every reason
// here is unknown, never fail.
func postureRobotsAbsentDetail(reason RobotsAbsentReason) string {
	switch reason {
	case RobotsAbsentNoOrigin:
		return detailPostureNoOrigin
	case RobotsAbsentUnparsedOrigin:
		return detailPostureBadOrigin
	case RobotsAbsentNonOK:
		return detailPostureNonOK
	default:
		return detailPostureUnreachable
	}
}

// robotsURL resolves origin's own /robots.txt URL. ok is false when origin does not parse as an
// absolute http or https URL, the one scheme restriction the fetch policy states: any other
// scheme (a file:// origin, for instance) must never be dialed.
func robotsURL(origin string) (target *url.URL, ok bool) {
	u, err := url.Parse(origin)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return nil, false
	}
	return u.ResolveReference(&url.URL{Path: "/robots.txt"}), true
}

// AIPostureEffective ports check-posture.ts's postureEffective (:45-73): a live probe of the
// deployed origin's /robots.txt, compared against the adapter's declared aiPosture. It reads
// SiteFacts for the declared posture, so it reports unchecked with factsAbsentDetail when
// site-facts.json is absent, and it reads Snapshot.Robots for the served body, so it reports
// unchecked with the fetch's own reason when the command layer's GET did not produce one; it
// never dials itself.
var AIPostureEffective = Check{
	ID:        "ai.posture-effective",
	Condition: spine.ConditionAIPostureNotEffective,
	Run: func(s Snapshot) Result {
		facts, found, err := ReadSiteFacts(s)
		if err != nil {
			return uncheckedResult("ai.posture-effective", err.Error())
		}
		if !found {
			return uncheckedResult("ai.posture-effective", factsAbsentDetail)
		}
		if !s.Robots.Present {
			return uncheckedResult("ai.posture-effective", postureRobotsAbsentDetail(s.Robots.Reason))
		}
		target, ok := robotsURL(s.PublicOrigin.Value)
		if !ok {
			return uncheckedResult("ai.posture-effective", detailPostureBadOrigin)
		}
		return evaluatePosture(facts.HasAIPosture, facts.AIPosture, s.Robots.Body, target)
	},
}
