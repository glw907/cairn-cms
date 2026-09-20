package providers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

// TestExportedMethodsTakeContextFirst is the reflection test the task names for the threaded
// context: it walks every exported method on Cloudflare, GitHub, NPM, and Probe and asserts its
// first parameter is context.Context, so a method added later cannot omit it.
func TestExportedMethodsTakeContextFirst(t *testing.T) {
	ctxType := reflect.TypeFor[context.Context]()
	types := []reflect.Type{
		reflect.TypeFor[*Cloudflare](),
		reflect.TypeFor[*GitHub](),
		reflect.TypeFor[*NPM](),
		reflect.TypeFor[*Probe](),
	}
	for _, typ := range types {
		for m := range typ.Methods() {
			// m.Func's signature carries the receiver as In(0), so the method's own first
			// parameter is In(1).
			sig := m.Func.Type()
			if sig.NumIn() < 2 || sig.In(1) != ctxType {
				t.Errorf("%s.%s: first parameter is not context.Context", typ, m.Name)
			}
		}
	}
}

// TestNoContextBackgroundInNonTestFiles asserts no non-test file under this package calls
// context.Background(): every request derives its context from a caller-supplied one via
// context.WithTimeout, never one this package invents.
func TestNoContextBackgroundInNonTestFiles(t *testing.T) {
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatal(err)
	}
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(".", name))
		if err != nil {
			t.Fatal(err)
		}
		if strings.Contains(string(data), "context.Background()") {
			t.Errorf("%s calls context.Background(); every request must derive its context from a caller-supplied one", name)
		}
	}
}

// TestContextCancellationStopsInFlightRequest covers the 2.0 seam kept on purpose: canceling the
// caller's context mid-request returns the context's error rather than the response, for one
// method on each of the four clients this package exports.
func TestContextCancellationStopsInFlightRequest(t *testing.T) {
	tests := []struct {
		name string
		call func(ctx context.Context, u *url.URL) error
	}{
		{"cloudflare", func(ctx context.Context, u *url.URL) error {
			cf := NewCloudflare("acct123", Credential{}, rewriteHostTransport{target: u.Host})
			_, err := cf.VerifyToken(ctx)
			return err
		}},
		{"github", func(ctx context.Context, u *url.URL) error {
			gh := NewGitHub(Credential{}, rewriteHostTransport{target: u.Host})
			_, err := gh.HeadSHA(ctx, "owner", "repo", "main")
			return err
		}},
		{"npm", func(ctx context.Context, u *url.URL) error {
			n := NewNPM(rewriteHostTransport{target: u.Host})
			_, err := n.Latest(ctx, "@glw907/cairn-cms")
			return err
		}},
		{"probe", func(ctx context.Context, u *url.URL) error {
			p := NewProbe(http.DefaultTransport, &fakeResolver{})
			_, err := p.Get(ctx, "http://"+u.Host+"/")
			return err
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				time.Sleep(500 * time.Millisecond)
				w.WriteHeader(http.StatusOK)
			}))
			defer srv.Close()
			u, err := url.Parse(srv.URL)
			if err != nil {
				t.Fatal(err)
			}

			ctx, cancel := context.WithCancel(context.Background())
			go func() {
				time.Sleep(50 * time.Millisecond)
				cancel()
			}()

			done := make(chan error, 1)
			go func() { done <- tt.call(ctx, u) }()

			select {
			case callErr := <-done:
				if !errors.Is(callErr, context.Canceled) {
					t.Errorf("err = %v, want context.Canceled", callErr)
				}
			case <-time.After(2 * time.Second):
				t.Fatal("did not return within 2s of cancellation; the request is hanging")
			}
		})
	}
}
