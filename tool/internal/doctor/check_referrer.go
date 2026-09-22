package doctor

import (
	"fmt"
	"net/url"
	"regexp"
	"slices"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// headersBlock is one block of a Cloudflare _headers file: an un-indented path line and its
// indented headers.
type headersBlock struct {
	path    string
	headers []string
}

// referrerPolicyLinePattern matches a Referrer-Policy header line and captures its value, which
// may be a comma-separated fallback list.
var referrerPolicyLinePattern = regexp.MustCompile(`(?i)^referrer-policy\s*:\s*(.+)$`)

// referrerPolicyMentionPattern, noReferrerMentionPattern, and scopeGuardPattern back
// hooksSetsBlanketNoReferrer's window scan.
var (
	referrerPolicyMentionPattern = regexp.MustCompile(`(?i)referrer-policy`)
	noReferrerMentionPattern     = regexp.MustCompile(`(?i)no-referrer`)
	scopeGuardPattern            = regexp.MustCompile(`(?i)pathname|route\.id|url\.href`)
)

const (
	// noReferrerRemedy is the fix text both the fail and the skip detail carry.
	noReferrerRemedy = "serve strict-origin-when-cross-origin (or same-origin) as the site default; no-referrer is safe only on a route protected by a double-submit CSRF token (the way /admin is), and a route guarded instead by the origin compare needs same-origin in its place"
	// noReferrerDocsAnchor is the skip detail's pointer to the operator runbook.
	noReferrerDocsAnchor = "docs/admin/is-it-working.md#scope-a-site-wide-no-referrer-policy"
	// tmplNoReferrerSkip is config.no-referrer-blanket's skip detail template, filled with the
	// remedy and the docs anchor.
	tmplNoReferrerSkip = "neither src/hooks.server.ts (or .js) nor static/_headers was found, so the response headers cannot be checked automatically; verify by hand that no site-wide Referrer-Policy: no-referrer is served (%s); see %s"
	// tmplNoReferrerFail is config.no-referrer-blanket's fail detail template, filled with the
	// source file that set the policy and the remedy.
	tmplNoReferrerFail = "%s sets a site-wide Referrer-Policy: no-referrer, which strips the Origin header from a plain same-origin form POST (it arrives as Origin: null) and cairn's strict origin guard rejects it; %s (heuristic text read)"
	// tmplNoReferrerPass is config.no-referrer-blanket's pass detail template, filled with the
	// sources describeNoReferrerSources names.
	tmplNoReferrerPass = "no site-wide Referrer-Policy: no-referrer found (%s, heuristic text read)"
)

// parseHeadersFile ports checks-local.ts's own helper (checks-local.ts:487-505): Cloudflare's
// _headers grammar, a path line starting at column 0 and every indented line below it one of
// that path's headers, until a blank line (or a new path line) ends the block. A line whose
// trimmed text starts with # is a comment: it neither starts nor ends a block, so one interleaved
// between a path line and its headers cannot split the block in two.
func parseHeadersFile(text string) []headersBlock {
	var blocks []headersBlock
	var current *headersBlock
	for raw := range strings.SplitSeq(text, "\n") {
		line := strings.TrimSuffix(raw, "\r")
		if strings.TrimSpace(line) == "" {
			current = nil
			continue
		}
		if strings.HasPrefix(strings.TrimSpace(line), "#") {
			continue
		}
		if len(line) > 0 && (line[0] == ' ' || line[0] == '\t') {
			if current != nil {
				current.headers = append(current.headers, strings.TrimSpace(line))
			}
			continue
		}
		blocks = append(blocks, headersBlock{path: strings.TrimSpace(line)})
		current = &blocks[len(blocks)-1]
	}
	return blocks
}

// isCatchAllHeadersPath ports checks-local.ts's own helper (checks-local.ts:509-517): a
// _headers path line is Cloudflare's catch-all glob either written bare (/*) or as the pathname
// of an absolute URL (https://example.com/*, which Cloudflare also accepts as a path). The
// TypeScript source sniffs the scheme with a regex before parsing the URL; net/url.Parse is the
// idiomatic Go spelling of the same scheme-and-host check and reaches the same verdicts on the
// corpus, so this drops the regex pre-check and parses directly: url.Parse rejects anything that
// is not an absolute URL just as reliably.
func isCatchAllHeadersPath(path string) bool {
	if path == "/*" {
		return true
	}
	u, err := url.Parse(path)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return false
	}
	return u.Path == "/*"
}

// isBlanketNoReferrerHeaderLine ports checks-local.ts's own helper (checks-local.ts:519-523): a
// Referrer-Policy value can be a comma-separated fallback list, judged on its last token
// unconditionally, so no-referrer earlier in the list does not count while no-referrer last does.
func isBlanketNoReferrerHeaderLine(header string) bool {
	match := referrerPolicyLinePattern.FindStringSubmatch(strings.TrimSpace(header))
	if match == nil {
		return false
	}
	tokens := strings.Split(match[1], ",")
	last := strings.ToLower(strings.TrimSpace(tokens[len(tokens)-1]))
	return last == "no-referrer"
}

// headersFileBlanketNoReferrer ports checks-local.ts's own helper (checks-local.ts:534-538): a
// blanket match needs both the catch-all path and a no-referrer value on that block; a path
// scoped to a specific route (/admin/*) never matches here even when it sets the same header.
func headersFileBlanketNoReferrer(text string) bool {
	for _, block := range parseHeadersFile(text) {
		if isCatchAllHeadersPath(block.path) && slices.ContainsFunc(block.headers, isBlanketNoReferrerHeaderLine) {
			return true
		}
	}
	return false
}

// stripComments ports checks-local.ts's own helper (checks-local.ts:543-572): strips // line
// comments and /* */ block comments (including ones spanning multiple lines) from a heuristic
// text read, line count preserved, so a comment merely warning about the policy does not itself
// trip the blanket-write match below.
func stripComments(text string) string {
	var stripped []string
	inBlockComment := false
	for raw := range strings.SplitSeq(text, "\n") {
		line := raw
		if inBlockComment {
			end := strings.Index(line, "*/")
			if end == -1 {
				stripped = append(stripped, "")
				continue
			}
			line = line[end+2:]
			inBlockComment = false
		}
		blockStart := strings.Index(line, "/*")
		for blockStart != -1 {
			blockEnd := strings.Index(line[blockStart+2:], "*/")
			if blockEnd == -1 {
				line = line[:blockStart]
				inBlockComment = true
				break
			}
			blockEnd += blockStart + 2
			line = line[:blockStart] + line[blockEnd+2:]
			blockStart = strings.Index(line, "/*")
		}
		if idx := strings.Index(line, "//"); idx != -1 {
			line = line[:idx]
		}
		stripped = append(stripped, line)
	}
	return strings.Join(stripped, "\n")
}

// hooksSetsBlanketNoReferrer ports checks-local.ts's own helper (checks-local.ts:574-579): the
// heuristic text read for src/hooks.server.ts. A line setting Referrer-Policy to no-referrer
// with no route-scoping reference (pathname, route.id, or url.href) in the six lines above it
// reads as an unconditional, site-wide write.
func hooksSetsBlanketNoReferrer(text string) bool {
	lines := strings.Split(stripComments(text), "\n")
	for i, line := range lines {
		if !referrerPolicyMentionPattern.MatchString(line) || !noReferrerMentionPattern.MatchString(line) {
			continue
		}
		windowStart := max(i-6, 0)
		nearby := strings.Join(lines[windowStart:i+1], "\n")
		if !scopeGuardPattern.MatchString(nearby) {
			return true
		}
	}
	return false
}

// blanketNoReferrerFailDetail is the one failure both header sources report, differing only in
// which file set the policy.
func blanketNoReferrerFailDetail(source string) string {
	return fmt.Sprintf(tmplNoReferrerFail, source, noReferrerRemedy)
}

// describeNoReferrerSources names which of the two header sources the check actually read, and
// which it could not find, so a pass detail never reads as "nothing here" when it really means
// the readable sources looked clean.
func describeNoReferrerSources(hooksPath string, hooksFound, headersFileRead bool) string {
	var read, missing []string
	if hooksFound {
		read = append(read, hooksPath)
	} else {
		missing = append(missing, "src/hooks.server.ts (or .js)")
	}
	if headersFileRead {
		read = append(read, "static/_headers")
	} else {
		missing = append(missing, "static/_headers")
	}
	readPart := "read nothing"
	if len(read) > 0 {
		readPart = "read " + strings.Join(read, " and ")
	}
	missingPart := ""
	if len(missing) > 0 {
		missingPart = "; " + strings.Join(missing, " and ") + " not found"
	}
	return readPart + missingPart
}

// ConfigNoReferrerBlanket ports checks-local.ts's configNoReferrerBlanket (checks-local.ts:
// 638-660): the blanket no-referrer trap. Under a site-wide Referrer-Policy: no-referrer, the
// Fetch spec strips the Origin header from a plain same-origin top-level POST, so it arrives as
// Origin: null and cairn's strict origin guard rejects it, 403ing an otherwise legitimate
// non-admin form. cairn's own /admin responses already scope no-referrer to the token-bearing
// routes it protects; the trap is a site shipping the same policy as its own site-wide default.
var ConfigNoReferrerBlanket = Check{
	ID:        "config.no-referrer-blanket",
	Condition: spine.ConditionConfigNoReferrerBlanket,
	Run: func(s Snapshot) Result {
		hooksText, hooksPath, hooksFound, err := readHooksSource(s)
		if err != nil {
			return uncheckedResult(err.Error())
		}
		headersBody, headersFound, err := s.ReadFile("static/_headers")
		if err != nil {
			return uncheckedResult(err.Error())
		}
		if !hooksFound && !headersFound {
			return skipResult(fmt.Sprintf(tmplNoReferrerSkip, noReferrerRemedy, noReferrerDocsAnchor))
		}
		if hooksFound && hooksSetsBlanketNoReferrer(hooksText) {
			return failResult(spine.ConditionConfigNoReferrerBlanket, blanketNoReferrerFailDetail(hooksPath))
		}
		if headersFound && headersFileBlanketNoReferrer(string(headersBody)) {
			return failResult(spine.ConditionConfigNoReferrerBlanket, blanketNoReferrerFailDetail("static/_headers"))
		}
		return passResult(fmt.Sprintf(tmplNoReferrerPass, describeNoReferrerSources(hooksPath, hooksFound, headersFound)))
	},
}
