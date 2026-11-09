// Package scaffold fetches the site template from the published engine package, writes a site
// from it, and commits the result to a fresh local git repository. It follows ADR-0001's spine
// rule: it prints nothing and prompts for nothing, and it sends HTTP only through the
// RoundTripper it is given.
package scaffold

// targets names every file a substitution edits, once. A later move of one of these files is a
// one-line change here; nothing else in the package spells these paths.
var targets = struct {
	PackageJSON string
	SiteConfig  string
	CairnConfig string
	Wrangler    string
	Deploy      string
	SiteFacts   string
	// GitignoreShipped is the name the template carries the ignore file under, since npm drops
	// any file literally named .gitignore from a tarball.
	GitignoreShipped string
	Gitignore        string
}{
	PackageJSON:      "package.json",
	SiteConfig:       "src/theme/site.config.yaml",
	CairnConfig:      "src/theme/cairn.config.ts",
	Wrangler:         "wrangler.jsonc",
	Deploy:           ".github/workflows/deploy.yml",
	SiteFacts:        "src/content/.cairn/site-facts.json",
	GitignoreShipped: "gitignore",
	Gitignore:        ".gitignore",
}
