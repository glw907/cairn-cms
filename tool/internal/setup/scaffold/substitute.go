package scaffold

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"unicode/utf8"

	"go.yaml.in/yaml/v3"

	"github.com/glw907/cairn-cms/tool/v2/internal/cairnsite"
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
// file is touched. The database id is checked only when needDB is set, since the first pass runs
// before the database exists.
func (s Site) validate(needDB bool) error {
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
		if c.field == "DatabaseID" && !needDB {
			continue
		}
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

// The two passes of edits. The first needs only what the approvals and the summary settled; the
// second writes the settings that name the Cloudflare resources, which exist only after the
// first pass has run. The site record is written in the first pass, since only that pass has
// the engine version, and its deploy values are written again in the second.
var (
	firstPass  = []func(string, Site, string) error{editPackageJSON, editSiteConfig, editSiteRecord, editDeploy, editSiteFacts, restoreGitignore}
	secondPass = []func(string, Site, string) error{editRecordDeploy, editWrangler}
)

// substitute applies steps to the site tree at dir. Each edit names its file and the anchor it
// could not find, so a template that moved fails here, not in the site's first build.
func substitute(dir string, s Site, engineVersion string, steps []func(string, Site, string) error) error {
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

// neutralDescription is the description a new site starts with. The home page shows it under
// its heading, so it says nothing the owner did not write but that the site is new.
const neutralDescription = "A new site built with cairn."

// editSiteConfig writes the site name and replaces the template's sample description with
// neutralDescription. The description is set at its value's position in the parsed document, so
// every other line of the file stays byte for byte as the template has it. A second top-level
// description key, which every YAML parser rejects, fails here rather than in the first build.
func editSiteConfig(dir string, s Site, _ string) error {
	return edit(dir, targets.SiteConfig, func(c string) (string, error) {
		c, err := replaceExact(c, "siteName: Waymark", "siteName: "+quote(s.Name), targets.SiteConfig)
		if err != nil {
			return "", err
		}
		return setDescription(c, quote(neutralDescription), targets.SiteConfig)
	})
}

// setDescription replaces the one-line value of the top-level description key with value, which
// must be a valid YAML scalar. It never re-encodes the document, which would re-indent comments.
func setDescription(content, value, rel string) (string, error) {
	var doc yaml.Node
	if err := yaml.Unmarshal([]byte(content), &doc); err != nil {
		return "", fmt.Errorf("scaffold: parse %s: %w", rel, err)
	}
	if len(doc.Content) == 0 || doc.Content[0].Kind != yaml.MappingNode {
		return "", fmt.Errorf("scaffold: expected %s to be a mapping, but it is not", rel)
	}
	var found []*yaml.Node
	m := doc.Content[0]
	for i := 0; i+1 < len(m.Content); i += 2 {
		if m.Content[i].Value == "description" {
			found = append(found, m.Content[i+1])
		}
	}
	switch {
	case len(found) == 0:
		return "", fmt.Errorf("scaffold: expected to find a top-level description in %s, but it is missing", rel)
	case len(found) > 1:
		return "", fmt.Errorf("scaffold: %s would carry %d top-level description keys after the site name is written", rel, len(found))
	}
	v := found[0]
	if v.Kind != yaml.ScalarNode || v.Style&(yaml.LiteralStyle|yaml.FoldedStyle) != 0 || strings.Contains(v.Value, "\n") {
		return "", fmt.Errorf("scaffold: expected the description in %s to be a one-line value", rel)
	}
	lines := strings.SplitAfter(content, "\n")
	if v.Line < 1 || v.Line > len(lines) {
		return "", fmt.Errorf("scaffold: the description in %s is at line %d, which is out of range", rel, v.Line)
	}
	line := lines[v.Line-1]
	body := strings.TrimRight(line, "\r\n")
	ending := line[len(body):]
	start := 0
	for range v.Column - 1 {
		_, n := utf8.DecodeRuneInString(body[start:])
		if n == 0 {
			return "", fmt.Errorf("scaffold: the description in %s is at column %d, which is out of range", rel, v.Column)
		}
		start += n
	}
	lines[v.Line-1] = body[:start] + value + ending
	return strings.Join(lines, ""), nil
}

// siteDeploy is the deploy section of the record for s.
func siteDeploy(s Site) cairnsite.Deploy {
	return cairnsite.Deploy{
		PublicOrigin: "https://" + s.Address,
		EmailFrom:    s.EmailFrom,
		GitHub: cairnsite.GitHub{
			Owner: s.Owner, Repo: s.Repo, Branch: s.DefaultBranch,
			AppID: s.AppID, InstallationID: s.InstallationID,
		},
	}
}

// editRecord decodes the site record under dir, applies fn, and writes it back through the
// record's own encoder, so it is the only code that writes the file.
func editRecord(dir string, fn func(*cairnsite.Record)) error {
	return edit(dir, targets.SiteRecord, func(c string) (string, error) {
		r, err := cairnsite.Decode([]byte(c))
		if err != nil {
			return "", err
		}
		fn(&r)
		out, err := cairnsite.Encode(r)
		if err != nil {
			return "", err
		}
		return string(out), nil
	})
}

// editSiteRecord writes the posture, the engine version the site installs, and the deploy values
// into the template's record.
func editSiteRecord(dir string, s Site, engineVersion string) error {
	return editRecord(dir, func(r *cairnsite.Record) {
		r.AIPosture = s.Posture
		r.Scaffold.Engine = engineVersion
		r.Deploy = siteDeploy(s)
	})
}

// editRecordDeploy writes the record's deploy values again once the second pass has the final
// App identity.
func editRecordDeploy(dir string, s Site, _ string) error {
	return editRecord(dir, func(r *cairnsite.Record) { r.Deploy = siteDeploy(s) })
}

// editInstallation writes the App identity over the one a finalized site's record holds.
func editInstallation(dir string, s Site) error {
	return editRecord(dir, func(r *cairnsite.Record) { r.Deploy.GitHub = siteDeploy(s).GitHub })
}

// templatePublicOrigin is the template's PUBLIC_ORIGIN entry, swapped as exact text so the
// file's comments survive.
const templatePublicOrigin = `"PUBLIC_ORIGIN": "http://localhost:4173"`

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
		swaps = append(swaps, struct{ anchor, repl string }{templatePublicOrigin, `"PUBLIC_ORIGIN": "https://` + s.Address + `"`})
		var err error
		for _, sw := range swaps {
			if c, err = replaceExact(c, sw.anchor, sw.repl, rel); err != nil {
				return "", err
			}
		}
		return c, nil
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
// written into the site record and not here fails the site's first build.
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
