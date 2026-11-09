package scaffold_test

import (
	"bytes"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
)

// TestHarnessScaffold is the answer matrix's entry point, not a unit test: the setup-matrix
// workflow runs it once per answer combination, with CAIRN_SCAFFOLD_OUT set, to scaffold a site
// from a packed engine tarball through the same fetch and write path the tool uses. It lives in
// the external test package so it may import setup, which will import scaffold.
//
// Inputs, all environment variables: CAIRN_SCAFFOLD_TARBALL (the packed engine tarball),
// CAIRN_SCAFFOLD_VERSION (its version), CAIRN_SCAFFOLD_OUT (the folder to create), and the
// answers CAIRN_SCAFFOLD_NAME, CAIRN_SCAFFOLD_POSTURE, CAIRN_SCAFFOLD_ZONE, CAIRN_SCAFFOLD_HOST.
func TestHarnessScaffold(t *testing.T) {
	out := os.Getenv("CAIRN_SCAFFOLD_OUT")
	if out == "" {
		t.Skip("CAIRN_SCAFFOLD_OUT is unset: this is the answer matrix's entry point")
	}
	tarball, err := os.ReadFile(os.Getenv("CAIRN_SCAFFOLD_TARBALL"))
	if err != nil {
		t.Fatal(err)
	}
	version := os.Getenv("CAIRN_SCAFFOLD_VERSION")
	sum := sha512.Sum512(tarball)
	integrity := "sha512-" + base64.StdEncoding.EncodeToString(sum[:])
	tarURL := "https://registry.npmjs.org/@glw907/cairn-cms/-/cairn-cms-" + version + ".tgz"
	doc, err := json.Marshal(map[string]any{
		"dist-tags": map[string]string{"latest": version},
		"versions":  map[string]any{version: map[string]any{"dist": map[string]string{"tarball": tarURL, "integrity": integrity}}},
	})
	if err != nil {
		t.Fatal(err)
	}
	rt := roundTrip(func(req *http.Request) (*http.Response, error) {
		body := doc
		if req.URL.String() == tarURL {
			body = tarball
		}
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(bytes.NewReader(body)), Request: req}, nil
	})
	tpl, err := scaffold.NewFetcher(rt).Fetch(t.Context(), "latest")
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}

	zone := os.Getenv("CAIRN_SCAFFOLD_ZONE")
	outline, err := setup.Plan(setup.Answers{
		SiteName:   os.Getenv("CAIRN_SCAFFOLD_NAME"),
		OwnerEmail: "owner@example.test",
		Posture:    setup.Posture(os.Getenv("CAIRN_SCAFFOLD_POSTURE")),
		Zone:       zone,
		Host:       os.Getenv("CAIRN_SCAFFOLD_HOST"),
	})
	if err != nil {
		t.Fatalf("Plan: %v", err)
	}
	n := outline.Names
	_, err = scaffold.Scaffold(t.Context(), scaffold.Config{
		Template: tpl,
		Dir:      out,
		Commit:   scaffold.Commit{AuthorName: "Cairn Setup", AuthorEmail: "setup@cairn.invalid", Message: "Create the site"},
		Site: scaffold.Site{
			Name: os.Getenv("CAIRN_SCAFFOLD_NAME"), Repository: n.Repository, Worker: n.Worker,
			Database: n.Database, Bucket: n.Bucket,
			DatabaseID: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", AccountID: "0123456789abcdef0123456789abcdef",
			Address: os.Getenv("CAIRN_SCAFFOLD_HOST"), EmailFrom: "no-reply@" + zone,
			Posture: os.Getenv("CAIRN_SCAFFOLD_POSTURE"),
			Owner:   "matrix-owner", Repo: n.Repository, DefaultBranch: "main",
			AppID: "424242", InstallationID: "737373",
		},
	})
	if err != nil {
		t.Fatalf("Scaffold: %v", err)
	}
}

type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(req *http.Request) (*http.Response, error) { return f(req) }
