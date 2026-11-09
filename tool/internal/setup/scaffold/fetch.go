package scaffold

import (
	"context"
	"crypto/sha512"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	registryHost = "registry.npmjs.org"
	// engineDoc is the engine package's packument path. The scope separator stays escaped, the
	// form the registry documents.
	engineDoc = "https://" + registryHost + "/@glw907%2fcairn-cms"
	// templatePrefix is where the engine tarball keeps the template; npm roots every tarball at
	// "package/".
	templatePrefix = "package/template/"
	// acceptPackument asks for the registry's abbreviated document, which still carries
	// dist-tags and each version's dist; any server that ignores it answers the full one.
	acceptPackument = "application/vnd.npm.install-v1+json, application/json;q=0.8"

	maxPackument = 32 << 20
	maxTarball   = 256 << 20
	maxFile      = 16 << 20
	maxExtracted = 128 << 20

	packumentTimeout = 15 * time.Second
	tarballTimeout   = 2 * time.Minute
)

var (
	// ErrIntegrity reports a tarball whose SHA-512 digest differs from the registry's. It is
	// never retried: a second download that differs again proves nothing, and one that matches
	// would hide a tampered first.
	ErrIntegrity = errors.New("scaffold: tarball digest does not match the registry's integrity")
	// ErrUnsafeEntry reports a template entry that escapes the target or is not a plain file or
	// directory.
	ErrUnsafeEntry = errors.New("scaffold: unsafe template entry")
)

// entry is one extracted template file or directory.
type entry struct {
	dir  bool
	exec bool
	data []byte
}

// Template is the site template held in memory, verified and checked entry by entry. Nothing
// reaches disk until Scaffold writes it.
type Template struct {
	// Version is the engine version the template came from.
	Version string
	// Integrity is that version's SRI digest, "sha512-...", as the registry reported it.
	Integrity string

	entries map[string]entry
}

// Fetcher downloads the engine tarball and reads the template out of it.
type Fetcher struct {
	client *http.Client
}

// NewFetcher returns a Fetcher sending every request through rt, or http.DefaultTransport when
// rt is nil. Requests to any host but the npm registry, or over anything but https, fail before
// they reach rt, and a redirect is never followed.
func NewFetcher(rt http.RoundTripper) *Fetcher {
	if rt == nil {
		rt = http.DefaultTransport
	}
	return &Fetcher{client: &http.Client{
		Transport: pinned{next: rt},
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}}
}

// pinned refuses a request to anything but the registry host.
type pinned struct{ next http.RoundTripper }

func (p pinned) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.URL.Scheme != "https" || req.URL.Hostname() != registryHost {
		return nil, fmt.Errorf("scaffold: refusing a request to %s", req.URL.Redacted())
	}
	return p.next.RoundTrip(req)
}

type packument struct {
	DistTags map[string]string `json:"dist-tags"`
	Versions map[string]struct {
		Dist struct {
			Tarball   string `json:"tarball"`
			Integrity string `json:"integrity"`
		} `json:"dist"`
	} `json:"versions"`
}

// Fetch resolves the dist-tag (latest when tag is empty) to a version and returns that
// version's template.
func (f *Fetcher) Fetch(ctx context.Context, tag string) (*Template, error) {
	if tag == "" {
		tag = "latest"
	}
	doc, err := f.packument(ctx)
	if err != nil {
		return nil, err
	}
	version, ok := doc.DistTags[tag]
	if !ok || version == "" {
		return nil, fmt.Errorf("scaffold: the engine has no dist-tag %q", tag)
	}
	return f.fetchVersion(ctx, doc, version, "")
}

// FetchVersion returns the template of one published version, for a resumed run. A non-empty
// integrity must equal the registry's, so a version republished under the same number is
// refused.
func (f *Fetcher) FetchVersion(ctx context.Context, version, integrity string) (*Template, error) {
	doc, err := f.packument(ctx)
	if err != nil {
		return nil, err
	}
	return f.fetchVersion(ctx, doc, version, integrity)
}

func (f *Fetcher) packument(ctx context.Context) (*packument, error) {
	body, err := f.get(ctx, engineDoc, acceptPackument, maxPackument, packumentTimeout)
	if err != nil {
		return nil, err
	}
	var doc packument
	if err := json.Unmarshal(body, &doc); err != nil {
		return nil, fmt.Errorf("scaffold: decode the engine packument: %w", err)
	}
	return &doc, nil
}

func (f *Fetcher) fetchVersion(ctx context.Context, doc *packument, version, wantIntegrity string) (*Template, error) {
	v, ok := doc.Versions[version]
	if !ok {
		return nil, fmt.Errorf("scaffold: the engine has no version %s", version)
	}
	dist := v.Dist
	if dist.Tarball == "" || dist.Integrity == "" {
		return nil, fmt.Errorf("scaffold: version %s lists no tarball or integrity", version)
	}
	if wantIntegrity != "" && dist.Integrity != wantIntegrity {
		return nil, fmt.Errorf("scaffold: version %s is now published with a different integrity than the recorded one", version)
	}
	want, err := sha512Digests(dist.Integrity)
	if err != nil {
		return nil, fmt.Errorf("scaffold: version %s: %w", version, err)
	}
	body, err := f.get(ctx, dist.Tarball, "", maxTarball, tarballTimeout)
	if err != nil {
		return nil, err
	}
	if !matchesDigest(body, want) {
		return nil, ErrIntegrity
	}
	entries, err := extract(body)
	if err != nil {
		return nil, err
	}
	return &Template{Version: version, Integrity: dist.Integrity, entries: entries}, nil
}

// sha512Digests returns the SHA-512 digests an SRI string lists. A string with none, such as a
// legacy sha1-only value, is refused: the digest is the only authentication the tarball has.
func sha512Digests(integrity string) ([][]byte, error) {
	var out [][]byte
	for token := range strings.FieldsSeq(integrity) {
		b64, ok := strings.CutPrefix(token, "sha512-")
		if !ok {
			continue
		}
		sum, err := base64.StdEncoding.DecodeString(b64)
		if err != nil || len(sum) != sha512.Size {
			return nil, fmt.Errorf("integrity %q is not a valid sha512 digest", token)
		}
		out = append(out, sum)
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("integrity %q lists no sha512 digest", integrity)
	}
	return out, nil
}

func matchesDigest(body []byte, want [][]byte) bool {
	got := sha512.Sum512(body)
	for _, w := range want {
		if subtle.ConstantTimeCompare(got[:], w) == 1 {
			return true
		}
	}
	return false
}

// get fetches rawURL and returns its body, which may not exceed limit bytes.
func (f *Fetcher) get(ctx context.Context, rawURL, accept string, limit int64, timeout time.Duration) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("scaffold: parse %q: %w", rawURL, err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("scaffold: build request: %w", err)
	}
	if accept != "" {
		req.Header.Set("Accept", accept)
	}
	resp, err := f.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("scaffold: GET %s: %w", u.Redacted(), err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("scaffold: GET %s: status %d", u.Redacted(), resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, limit+1))
	if err != nil {
		return nil, fmt.Errorf("scaffold: read %s: %w", u.Redacted(), err)
	}
	if int64(len(data)) > limit {
		return nil, fmt.Errorf("scaffold: %s is larger than %d bytes", u.Redacted(), limit)
	}
	return data, nil
}
