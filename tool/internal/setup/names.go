package setup

import (
	"strconv"
	"strings"
)

// Limits that fix the cuts: R2 bucket names hold 63 characters and the bucket adds "-media";
// a GitHub App name holds 34.
const (
	baseMax   = 57
	appMax    = 34
	appPrefix = "cairn-"
)

// Names is every name setup derives from the answers.
type Names struct {
	// Base is the shared stem of the four resource names.
	Base string
	// Repository is the GitHub repository name.
	Repository string
	// Worker is the Worker name.
	Worker string
	// Database is the D1 database name.
	Database string
	// Bucket is the R2 bucket name.
	Bucket string
	// App is the GitHub App name. A taken App name is fixed by the owner on GitHub's page.
	App string
	// Folder is the local site folder, relative to where setup ran.
	Folder string
}

// slug lowercases s and turns each run of non-ASCII-alphanumerics into one dash, trimming
// dashes at both ends. It matches the scaffolder's rule, so "Café" gives "caf" and a name in
// another script gives "".
func slug(s string) string {
	var b strings.Builder
	dash := false
	for _, r := range strings.ToLower(s) {
		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' {
			if dash && b.Len() > 0 {
				b.WriteByte('-')
			}
			dash = false
			b.WriteRune(r)
			continue
		}
		dash = true
	}
	return b.String()
}

// cut truncates s to n characters and trims a trailing dash the cut may leave.
func cut(s string, n int) string {
	if len(s) > n {
		s = s[:n]
	}
	return strings.TrimRight(s, "-")
}

// deriveNames builds the names for a site name and a taken-name suffix. The suffix joins the
// base after the cut, so the base re-cuts to leave room and "<base>-media" still fits 63.
// The App name never takes the suffix.
func deriveNames(siteName string, suffix int) (Names, error) {
	s := slug(siteName)
	if s == "" {
		return Names{}, errNoSlug
	}
	if suffix != 0 && suffix < 2 {
		return Names{}, errSuffix
	}
	stem := cut(s, baseMax)
	if suffix != 0 {
		tail := "-" + strconv.Itoa(suffix)
		stem = cut(s, baseMax-len(tail)) + tail
	}
	return Names{
		Base:       stem,
		Repository: stem,
		Worker:     stem,
		Database:   stem + "-auth",
		Bucket:     stem + "-media",
		App:        cut(appPrefix+cut(s, baseMax), appMax),
		Folder:     "./" + stem,
	}, nil
}
