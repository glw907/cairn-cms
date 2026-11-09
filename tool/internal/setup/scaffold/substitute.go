package scaffold

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// Posture values the template's aiPosture field takes. "none" is never written.
const (
	Decline = "decline"
	Invite  = "invite"
)

// Site is everything the substitutions write into the template.
type Site struct {
	// Name is the display name, written as the site's name.
	Name string
	// Repository is the package name.
	Repository string
	// Worker, Database, and Bucket are the Cloudflare resource names.
	Worker, Database, Bucket string
	// DatabaseID is the D1 database's real id.
	DatabaseID string
	// AccountID is the Cloudflare account id, written after the Worker name.
	AccountID string
	// Address is the site's host, without a scheme.
	Address string
	// EmailFrom is the sign-in mail's sender address.
	EmailFrom string
	// Posture is Decline or Invite.
	Posture string
	// Owner and Repo name the GitHub repository; DefaultBranch is its real default branch.
	Owner, Repo, DefaultBranch string
	// AppID and InstallationID are the GitHub App's ids, as decimal strings.
	AppID, InstallationID string
}

var (
	nameRE    = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,62}$`)
	ownerRE   = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9-]{0,38}$`)
	repoRE    = regexp.MustCompile(`^[A-Za-z0-9._-]{1,100}$`)
	branchRE  = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._/-]{0,254}$`)
	digitsRE  = regexp.MustCompile(`^[0-9]{1,20}$`)
	uuidRE    = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
	accountRE = regexp.MustCompile(`^[0-9a-f]{32}$`)
	hostRE    = regexp.MustCompile(`^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$`)
	emailRE   = regexp.MustCompile(`^[A-Za-z0-9._%+-]+@[a-z0-9.-]+$`)
)

// validate refuses any value that could break out of the literal it is written into, before a
// file is touched.
func (s Site) validate() error {
	checks := []struct {
		field string
		value string
		re    *regexp.Regexp
	}{
		{"Repository", s.Repository, nameRE},
		{"Worker", s.Worker, nameRE},
		{"Database", s.Database, nameRE},
		{"Bucket", s.Bucket, nameRE},
		{"DatabaseID", s.DatabaseID, uuidRE},
		{"AccountID", s.AccountID, accountRE},
		{"Address", s.Address, hostRE},
		{"EmailFrom", s.EmailFrom, emailRE},
		{"Owner", s.Owner, ownerRE},
		{"Repo", s.Repo, repoRE},
		{"DefaultBranch", s.DefaultBranch, branchRE},
		{"AppID", s.AppID, digitsRE},
		{"InstallationID", s.InstallationID, digitsRE},
	}
	for _, c := range checks {
		if !c.re.MatchString(c.value) {
			return fmt.Errorf("scaffold: site %s %q is not usable in the files", c.field, c.value)
		}
	}
	if strings.TrimSpace(s.Name) == "" {
		return fmt.Errorf("scaffold: site Name is empty")
	}
	if s.Posture != Decline && s.Posture != Invite {
		return fmt.Errorf("scaffold: site Posture %q must be %q or %q", s.Posture, Decline, Invite)
	}
	return nil
}

// substitute applies every edit to the site tree at dir. Each edit names its file and the anchor
// it could not find, so a template that moved fails here, not in the site's first build.
func substitute(dir string, s Site, engineVersion string) error {
	steps := []func(string, Site, string) error{
		editPackageJSON,
		editSiteConfig,
		editCairnConfig,
		editWrangler,
		editDeploy,
		editSiteFacts,
		restoreGitignore,
	}
	for _, step := range steps {
		if err := step(dir, s, engineVersion); err != nil {
			return err
		}
	}
	return nil
}

// edit reads rel under dir, applies fn, and writes it back.
func edit(dir, rel string, fn func(content string) (string, error)) error {
	file := filepath.Join(dir, filepath.FromSlash(rel))
	raw, err := os.ReadFile(file)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("scaffold: expected to find %s, but it is missing", rel)
		}
		return fmt.Errorf("scaffold: read %s: %w", rel, err)
	}
	next, err := fn(string(raw))
	if err != nil {
		return err
	}
	if err := os.WriteFile(file, []byte(next), 0o644); err != nil {
		return fmt.Errorf("scaffold: write %s: %w", rel, err)
	}
	return nil
}

// replaceExact replaces the first occurrence of anchor, failing with the file's name when it
// is absent.
func replaceExact(content, anchor, repl, rel string) (string, error) {
	before, after, found := strings.Cut(content, anchor)
	if !found {
		return "", fmt.Errorf("scaffold: expected to find %q in %s, but it is missing", anchor, rel)
	}
	return before + repl + after, nil
}

// replacePattern replaces the first match of re, failing with the file's name when there is none.
// The replacement is literal, so a "$" in a value is never a group reference.
func replacePattern(content string, re *regexp.Regexp, repl, rel string) (string, error) {
	loc := re.FindStringIndex(content)
	if loc == nil {
		return "", fmt.Errorf("scaffold: expected to find a match for %s in %s, but there is none", re, rel)
	}
	return content[:loc[0]] + repl + content[loc[1]:], nil
}

// quote returns s as a JSON string, which is also a valid YAML double-quoted scalar and a valid
// TypeScript string, with no HTML escaping.
func quote(s string) string {
	var b bytes.Buffer
	enc := json.NewEncoder(&b)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(s)
	return strings.TrimRight(b.String(), "\n")
}

var (
	pkgNameRE   = regexp.MustCompile(`(?m)^  "name": "[^"]*"`)
	pkgEngineRE = regexp.MustCompile(`"@glw907/cairn-cms": "[^"]*"`)
)

func editPackageJSON(dir string, s Site, engineVersion string) error {
	return edit(dir, targets.PackageJSON, func(c string) (string, error) {
		c, err := replacePattern(c, pkgNameRE, `  "name": `+quote(s.Repository), targets.PackageJSON)
		if err != nil {
			return "", err
		}
		return replacePattern(c, pkgEngineRE, `"@glw907/cairn-cms": `+quote(engineVersion), targets.PackageJSON)
	})
}

var topDescriptionRE = regexp.MustCompile(`(?m)^description:`)

// editSiteConfig writes the site name. The template carries its own description key; a second
// top-level one, which every YAML parser rejects, fails here rather than in the first build.
func editSiteConfig(dir string, s Site, _ string) error {
	return edit(dir, targets.SiteConfig, func(c string) (string, error) {
		c, err := replaceExact(c, "siteName: Waymark", "siteName: "+quote(s.Name), targets.SiteConfig)
		if err != nil {
			return "", err
		}
		if n := len(topDescriptionRE.FindAllString(c, -1)); n > 1 {
			return "", fmt.Errorf("scaffold: %s would carry %d top-level description keys after the site name is written", targets.SiteConfig, n)
		}
		return c, nil
	})
}

const aiPostureComment = `  // aiPosture?: 'invite' | 'decline' states this site's stance toward AI training crawlers; the
  // site's robots.txt route passes it to buildRobotsResponse, and CairnAdapter.aiPosture
  // documents both values; the cairn-extending-a-site skill helps pick.
  // Left unset here on purpose: an unset posture states nothing, which is itself a legitimate
  // choice, and cairn never guesses one on a site's behalf. Set it once you have decided.`

const githubAppTemplate = "createGithubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' })"

var (
	emailFromRE      = regexp.MustCompile(`email:\s*\{\s*from:\s*'[^']*'\s*\}`)
	publicOriginTSRE = regexp.MustCompile(`export const publicOrigin\s*=\s*'[^']*'`)
)

// editCairnConfig writes the posture block, the GitHub App identity with the repository's real
// default branch, the sender address, and the site's origin.
func editCairnConfig(dir string, s Site, _ string) error {
	return edit(dir, targets.CairnConfig, func(c string) (string, error) {
		block := "  // aiPosture states this site's stance toward AI training crawlers; the site's robots.txt\n" +
			"  // route passes it to buildRobotsResponse, and CairnAdapter.aiPosture\n" +
			"  // documents both values; the cairn-extending-a-site skill helps pick.\n" +
			"  aiPosture: '" + s.Posture + "',"
		c, err := replaceExact(c, aiPostureComment, block, targets.CairnConfig)
		if err != nil {
			return "", err
		}
		app := "createGithubApp({ owner: '" + s.Owner + "', repo: '" + s.Repo + "', branch: '" + s.DefaultBranch +
			"', appId: '" + s.AppID + "', installationId: '" + s.InstallationID + "' })"
		if c, err = replaceExact(c, githubAppTemplate, app, targets.CairnConfig); err != nil {
			return "", err
		}
		if c, err = replacePattern(c, emailFromRE, "email: { from: '"+s.EmailFrom+"' }", targets.CairnConfig); err != nil {
			return "", err
		}
		return replacePattern(c, publicOriginTSRE, "export const publicOrigin = 'https://"+s.Address+"'", targets.CairnConfig)
	})
}

var publicOriginJSONRE = regexp.MustCompile(`"PUBLIC_ORIGIN":\s*"[^"]*"`)

// editWrangler names the Worker and its two resources, writes the real database id and the
// origin, and inserts the account id the template lacks after the top-level name.
func editWrangler(dir string, s Site, _ string) error {
	return edit(dir, targets.Wrangler, func(c string) (string, error) {
		rel := targets.Wrangler
		swaps := []struct{ anchor, repl string }{
			{"\n  \"name\": \"cairn-showcase\",\n", "\n  \"name\": \"" + s.Worker + "\",\n  \"account_id\": \"" + s.AccountID + "\",\n"},
			{`"database_name": "cairn-showcase-auth"`, `"database_name": "` + s.Database + `"`},
			{`"database_id": "00000000-0000-0000-0000-000000000000"`, `"database_id": "` + s.DatabaseID + `"`},
			{`"bucket_name": "cairn-showcase-media"`, `"bucket_name": "` + s.Bucket + `"`},
		}
		var err error
		for _, sw := range swaps {
			if c, err = replaceExact(c, sw.anchor, sw.repl, rel); err != nil {
				return "", err
			}
		}
		return replacePattern(c, publicOriginJSONRE, `"PUBLIC_ORIGIN": "https://`+s.Address+`"`, rel)
	})
}

// editDeploy points the deploy workflow's push filter at the repository's default branch.
func editDeploy(dir string, s Site, _ string) error {
	return edit(dir, targets.Deploy, func(c string) (string, error) {
		return replaceExact(c, "branches: [main]", "branches: ["+quote(s.DefaultBranch)+"]", targets.Deploy)
	})
}

// siteFacts is the committed site-facts.json contract, in the engine's key order. The engine
// writes it in formatSiteFacts (src/lib/vite/internal.ts): version first, each adapter-derived
// field omitted when the adapter declares none, one trailing newline.
type siteFacts struct {
	Version            int             `json:"version"`
	MediaBucketBinding string          `json:"mediaBucketBinding,omitempty"`
	Roles              json.RawMessage `json:"roles,omitempty"`
	AIPosture          string          `json:"aiPosture,omitempty"`
}

// editSiteFacts regenerates the committed facts after the posture edit. The engine's
// build-time check compares the file byte for byte against the adapter's facts, so a posture
// written into cairn.config.ts and not here fails the site's first build.
func editSiteFacts(dir string, s Site, _ string) error {
	return edit(dir, targets.SiteFacts, func(c string) (string, error) {
		var facts siteFacts
		if err := json.Unmarshal([]byte(c), &facts); err != nil {
			return "", fmt.Errorf("scaffold: decode %s: %w", targets.SiteFacts, err)
		}
		if facts.Version != 1 {
			return "", fmt.Errorf("scaffold: %s is version %d, and only version 1 is understood", targets.SiteFacts, facts.Version)
		}
		facts.AIPosture = s.Posture
		var b bytes.Buffer
		enc := json.NewEncoder(&b)
		enc.SetEscapeHTML(false)
		enc.SetIndent("", "  ")
		if err := enc.Encode(facts); err != nil {
			return "", fmt.Errorf("scaffold: encode %s: %w", targets.SiteFacts, err)
		}
		return b.String(), nil
	})
}

// restoreGitignore renames the shipped ignore file to its working name. The rename is not
// optional: without .gitignore, .dev.vars is one git add away from the first commit.
func restoreGitignore(dir string, _ Site, _ string) error {
	from := filepath.Join(dir, targets.GitignoreShipped)
	if _, err := os.Stat(from); err != nil {
		return fmt.Errorf("scaffold: expected to find %s, but it is missing", targets.GitignoreShipped)
	}
	if err := os.Rename(from, filepath.Join(dir, targets.Gitignore)); err != nil {
		return fmt.Errorf("scaffold: restore %s: %w", targets.Gitignore, err)
	}
	return nil
}
