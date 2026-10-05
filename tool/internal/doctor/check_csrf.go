package doctor

import (
	"fmt"
	"net/url"
	"regexp"
	"slices"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

const (
	// tmplCsrfNoViteConfig is the unchecked detail when no readable Vite config exists. The
	// three names are the files this check reads.
	tmplCsrfNoViteConfig = "none of %s was found, so csrf.trustedOrigins could not be checked"
	// detailCsrfSvelteConfigMoved is the unchecked detail for a site that still carries a
	// svelte.config.js: SvelteKit 3 reads its config from the sveltekit() call in the Vite config
	// and no longer from the old file, so a csrf key there cannot be checked.
	detailCsrfSvelteConfigMoved = "svelte.config.js is still present, so a csrf key in it could not be checked; move the SvelteKit config into the sveltekit() call in the Vite config and delete the file"
	// tmplCsrfUnreadable is the unchecked detail when a csrf or trustedOrigins value is not a
	// literal the text read can follow.
	tmplCsrfUnreadable = "csrf.trustedOrigins in %s could not be read: the value is not a literal array of strings (an identifier, a spread, a call, or an escaped entry), so the entries were not checked"
	// tmplCsrfFail is the fail detail, filled with the config file and the offending entries'
	// clauses.
	tmplCsrfFail = "csrf.trustedOrigins in %s bypasses SvelteKit's origin check: %s (heuristic text read)"
	// tmplCsrfPassNoKey is the pass detail for a config that sets no csrf.trustedOrigins entries.
	tmplCsrfPassNoKey = "no csrf.trustedOrigins entries in %s, so SvelteKit's default origin check covers every route (heuristic text read)"
	// tmplCsrfPassEntries is the pass detail when entries are listed: each one widens the check on
	// /admin as well as on the site's own forms.
	tmplCsrfPassEntries = "csrf.trustedOrigins in %s lists %s; every entry widens SvelteKit's origin check on /admin too (heuristic text read)"
	// tmplCsrfPlainHTTP is the clause appended to a pass detail for an http entry on a public host.
	tmplCsrfPlainHTTP = "; %s is plain http, so it also admits a network attacker on that origin"

	// clauseCsrfWildcard and clauseCsrfNull explain why each failing entry fails.
	clauseCsrfWildcard = `"*" turns the check off on every route, /admin included`
	clauseCsrfNull     = `"null" admits every POST from an opaque origin (a sandboxed iframe or a data: page can send one) on every route, /admin included`
)

// viteConfigCandidates are the Vite config spellings this check reads, in the order Vite itself
// resolves them. A vite.config.mjs, .cjs, or .cts is not read, so a site carrying only one of
// those reports unchecked rather than passing.
var viteConfigCandidates = []string{"vite.config.js", "vite.config.ts", "vite.config.mts"}

// csrfKeyPattern and trustedOriginsKeyPattern find an object-literal property named csrf or
// trustedOrigins in the code view of a config, where the name may be bare, quoted with either
// quote, or a computed string key in brackets. Group 1 is the key token and group 2 is the
// terminator, which says whether the property has a value (":") or is a shorthand or the last in
// its object (",", "}"). A match is only a property when keyMatches confirms it sits outside a
// string and a comment.
var (
	csrfKeyPattern           = regexp.MustCompile(`(?:^|[{,])\s*(csrf|'csrf'|"csrf"|\[\s*'csrf'\s*\]|\[\s*"csrf"\s*\])\s*([:,}])`)
	trustedOriginsKeyPattern = regexp.MustCompile(`(?:^|[{,])\s*(trustedOrigins|'trustedOrigins'|"trustedOrigins"|\[\s*'trustedOrigins'\s*\]|\[\s*"trustedOrigins"\s*\])\s*([:,}])`)
)

// keyMatches returns the submatch indices of every property key the pattern finds in code that
// is real syntax. A key token spelled inside a string or a comment is blanked or quote-stripped
// in masked, so only a match whose first byte is the same in both views counts. masked and code
// must be the same length, so a slice of both can be searched.
func keyMatches(pattern *regexp.Regexp, masked, code string) [][]int {
	var out [][]int
	for _, loc := range pattern.FindAllStringSubmatchIndex(code, -1) {
		if masked[loc[2]] == code[loc[2]] {
			out = append(out, loc)
		}
	}
	return out
}

// blankJSComments scans JavaScript or TypeScript source once and returns two views of it that
// keep every byte offset. Comments become spaces in both. In masked the interior of every string
// literal is blanked too, so a key name or a bracket inside a string never reads as syntax; in
// code the strings stay, so an entry's text can be read back at the offsets masked found.
// Newlines survive in both. A backtick string is scanned to its closing backtick without
// following ${} nesting, which a trustedOrigins value never needs.
func blankJSComments(src string) (masked, code string) {
	m := []byte(src)
	c := []byte(src)
	blank := func(b []byte, i int) {
		if b[i] != '\n' {
			b[i] = ' '
		}
	}
	for i := 0; i < len(src); {
		switch {
		case strings.HasPrefix(src[i:], "//"):
			for i < len(src) && src[i] != '\n' {
				blank(m, i)
				blank(c, i)
				i++
			}
		case strings.HasPrefix(src[i:], "/*"):
			end := strings.Index(src[i+2:], "*/")
			stop := len(src)
			if end >= 0 {
				stop = i + 2 + end + 2
			}
			for ; i < stop; i++ {
				blank(m, i)
				blank(c, i)
			}
		case src[i] == '\'' || src[i] == '"' || src[i] == '`':
			quote := src[i]
			i++
			for i < len(src) && src[i] != quote {
				if src[i] == '\\' && i+1 < len(src) {
					blank(m, i)
					i++
				}
				blank(m, i)
				i++
			}
			i++
		default:
			i++
		}
	}
	return string(m), string(c)
}

// closingIndex returns the index of the bracket closing the one at masked[open], or -1 when the
// text ends first. masked must come from blankJSComments, so no string or comment holds a bracket.
func closingIndex(masked string, open int) int {
	openCh := masked[open]
	closeCh := byte('}')
	if openCh == '[' {
		closeCh = ']'
	}
	depth := 0
	for i := open; i < len(masked); i++ {
		switch masked[i] {
		case openCh:
			depth++
		case closeCh:
			depth--
			if depth == 0 {
				return i
			}
		}
	}
	return -1
}

// skipSpace returns the index of the first non-space byte of s at or after i.
func skipSpace(s string, i int) int {
	for i < len(s) && (s[i] == ' ' || s[i] == '\t' || s[i] == '\n' || s[i] == '\r') {
		i++
	}
	return i
}

// literalEntries reads a comma-separated list of plain string literals from code, the text
// between a pair of brackets. ok is false for anything else: an identifier, a spread, a call, a
// template with ${}, an entry holding a backslash escape, or an empty slot.
func literalEntries(code string) (entries []string, ok bool) {
	i := skipSpace(code, 0)
	for i < len(code) {
		quote := code[i]
		if quote != '\'' && quote != '"' && quote != '`' {
			return nil, false
		}
		end := strings.IndexByte(code[i+1:], quote)
		if end < 0 {
			return nil, false
		}
		entry := code[i+1 : i+1+end]
		if strings.ContainsRune(entry, '\\') || (quote == '`' && strings.Contains(entry, "${")) {
			return nil, false
		}
		entries = append(entries, entry)
		i = skipSpace(code, i+1+end+1)
		if i >= len(code) {
			break
		}
		if code[i] != ',' {
			return nil, false
		}
		i = skipSpace(code, i+1)
	}
	return entries, true
}

// readTrustedOrigins collects every literal csrf.trustedOrigins entry in a Vite config's text.
// readable is false when a csrf or trustedOrigins value is anything but an object or array
// literal the scan can follow, so the caller reports unchecked rather than guessing.
func readTrustedOrigins(text string) (entries []string, readable bool) {
	masked, code := blankJSComments(text)
	for _, loc := range keyMatches(csrfKeyPattern, masked, code) {
		if masked[loc[4]] != ':' {
			return nil, false
		}
		open := skipSpace(masked, loc[5])
		if open >= len(masked) || masked[open] != '{' {
			return nil, false
		}
		end := closingIndex(masked, open)
		if end < 0 {
			return nil, false
		}
		block, blockCode := masked[open:end+1], code[open:end+1]
		for _, key := range keyMatches(trustedOriginsKeyPattern, block, blockCode) {
			if block[key[4]] != ':' {
				return nil, false
			}
			start := skipSpace(block, key[5])
			if start >= len(block) || block[start] != '[' {
				return nil, false
			}
			stop := closingIndex(block, start)
			if stop < 0 {
				return nil, false
			}
			got, ok := literalEntries(blockCode[start+1 : stop])
			if !ok {
				return nil, false
			}
			entries = append(entries, got...)
		}
	}
	return entries, true
}

// isLocalOrigin reports whether an origin entry names a loopback host, the one place plain http
// stays safe.
func isLocalOrigin(u *url.URL) bool {
	host := u.Hostname()
	return host == "localhost" || host == "127.0.0.1" || host == "::1"
}

// csrfVerdict turns a config's entries into the check's Result.
func csrfVerdict(path string, entries []string, svelteConfigFound bool) Result {
	var failing []string
	if slices.Contains(entries, "*") {
		failing = append(failing, clauseCsrfWildcard)
	}
	if slices.Contains(entries, "null") {
		failing = append(failing, clauseCsrfNull)
	}
	if len(failing) > 0 {
		return failResult(spine.ConditionConfigCSRFTrustedOriginsWildcard,
			fmt.Sprintf(tmplCsrfFail, path, strings.Join(failing, "; ")))
	}
	if svelteConfigFound {
		return uncheckedResult(detailCsrfSvelteConfigMoved)
	}
	if len(entries) == 0 {
		return passResult(fmt.Sprintf(tmplCsrfPassNoKey, path))
	}
	var detail strings.Builder
	fmt.Fprintf(&detail, tmplCsrfPassEntries, path, strings.Join(entries, ", "))
	for _, entry := range entries {
		if u, err := url.Parse(entry); err == nil && u.Scheme == "http" && !isLocalOrigin(u) {
			fmt.Fprintf(&detail, tmplCsrfPlainHTTP, entry)
		}
	}
	return passResult(detail.String())
}

// ConfigCsrfTrustedOrigins reads the csrf key in the site's Vite config and fails on a
// trustedOrigins entry of "*" or "null". SvelteKit compares the raw Origin string against each
// entry, so "*" turns the check off on every route and "null" admits every opaque-origin POST,
// which a sandboxed iframe sends. Any other entry passes with a note that it widens /admin too.
//
// A state the text read cannot see never passes: no Vite config, a value that is not a literal,
// and a leftover svelte.config.js all report unchecked. A definite failure outranks unchecked.
var ConfigCsrfTrustedOrigins = Check{
	ID:        "config.csrf-trusted-origins",
	Condition: spine.ConditionConfigCSRFTrustedOriginsWildcard,
	Run: func(s Snapshot) Result {
		_, svelteConfigFound, err := s.ReadFile("svelte.config.js")
		if err != nil {
			return uncheckedResult(err.Error())
		}
		for _, path := range viteConfigCandidates {
			body, found, err := s.ReadFile(path)
			if err != nil {
				return uncheckedResult(err.Error())
			}
			if !found {
				continue
			}
			entries, readable := readTrustedOrigins(string(body))
			if !readable {
				return uncheckedResult(fmt.Sprintf(tmplCsrfUnreadable, path))
			}
			return csrfVerdict(path, entries, svelteConfigFound)
		}
		if svelteConfigFound {
			return uncheckedResult(detailCsrfSvelteConfigMoved)
		}
		return uncheckedResult(fmt.Sprintf(tmplCsrfNoViteConfig, strings.Join(viteConfigCandidates, ", ")))
	},
}
