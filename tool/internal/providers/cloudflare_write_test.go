package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"testing"
)

// sentRequest is one request a scripted transport saw.
type sentRequest struct {
	method, host, path, query, body string
	header                          http.Header
}

// scriptedRT answers each request with the next corpus fixture in order and records what was sent.
type scriptedRT struct {
	t      *testing.T
	script []string
	sent   []sentRequest
}

func (rt *scriptedRT) RoundTrip(req *http.Request) (*http.Response, error) {
	var body []byte
	if req.Body != nil {
		body, _ = io.ReadAll(req.Body)
	}
	rt.sent = append(rt.sent, sentRequest{req.Method, req.URL.Host, req.URL.Path, req.URL.RawQuery, string(body), req.Header.Clone()})
	if len(rt.script) == 0 {
		rt.t.Fatalf("unscripted request %s %s", req.Method, req.URL.Path)
	}
	name := rt.script[0]
	rt.script = rt.script[1:]
	status, data := cloudflareFixture(rt.t, name)
	return &http.Response{StatusCode: status, Body: io.NopCloser(bytes.NewReader(data)), Header: make(http.Header), Request: req}, nil
}

// cloudflareFixture reads a corpus body and, for a fixture recorded as a bare result (the older
// live captures), wraps it in the v4 envelope so one decoder path serves both shapes.
func cloudflareFixture(t *testing.T, name string) (int, []byte) {
	t.Helper()
	status, body, err := Corpus("cloudflare", name)
	if err != nil {
		t.Fatal(err)
	}
	var probe map[string]json.RawMessage
	if json.Unmarshal(body, &probe) == nil {
		if _, ok := probe["success"]; !ok && !strings.HasPrefix(name, "oauth_") {
			body, _ = json.Marshal(map[string]any{"success": true, "result": json.RawMessage(body)})
		}
	}
	return status, body
}

func writeClient(t *testing.T, script ...string) (*Cloudflare, *scriptedRT) {
	t.Helper()
	rt := &scriptedRT{t: t, script: script}
	return NewCloudflare("acct1", NewCredential("tok"), rt), rt
}

func wantReq(t *testing.T, got sentRequest, method, path string) {
	t.Helper()
	if got.method != method || got.path != "/client/v4"+path || got.host != "api.cloudflare.com" {
		t.Errorf("request = %s %s%s, want %s api.cloudflare.com/client/v4%s", got.method, got.host, got.path, method, path)
	}
}

// TestCloudflareWriteRoutes is one case per route of the write surface: each sends the documented
// request and decodes its recorded or pending body.
func TestCloudflareWriteRoutes(t *testing.T) {
	ctx := context.Background()
	zone := "zone1"

	t.Run("accounts", func(t *testing.T) {
		rt := &scriptedRT{t: t, script: []string{"accounts.list.200.json"}}
		got, err := NewCloudflare("", NewCredential("tok"), rt).Accounts(ctx)
		if err != nil || len(got) != 1 || got[0].Name != "example-account-1" || got[0].ID != "00000000000000000000000000000001" {
			t.Fatalf("Accounts = %+v, %v", got, err)
		}
		wantReq(t, rt.sent[0], "GET", "/accounts")
	})
	t.Run("user email", func(t *testing.T) {
		cf, rt := writeClient(t, "user.get.200.json")
		got, err := cf.UserEmail(ctx)
		if err != nil || got != "editor-redacted" {
			t.Fatalf("UserEmail = %q, %v", got, err)
		}
		wantReq(t, rt.sent[0], "GET", "/user")
	})
	t.Run("active zones", func(t *testing.T) {
		cf, rt := writeClient(t, "zones.active.200.json")
		got, err := cf.ActiveZones(ctx)
		if err != nil || len(got) != 1 || got[0].Status != "active" || got[0].Name != "carin-test.org" {
			t.Fatalf("ActiveZones = %+v, %v", got, err)
		}
		wantReq(t, rt.sent[0], "GET", "/zones")
		q, _ := url.ParseQuery(rt.sent[0].query)
		if q.Get("account.id") != "acct1" || q.Get("status") != "active" {
			t.Errorf("query = %q, want account.id=acct1 and status=active", rt.sent[0].query)
		}
	})
	t.Run("pending zone decodes as pending", func(t *testing.T) {
		cf, _ := writeClient(t, "zones.pending.200.json")
		got, err := cf.ListZones(ctx)
		if err != nil || len(got) != 1 || got[0].Status != "pending" {
			t.Fatalf("ListZones = %+v, %v", got, err)
		}
	})
	t.Run("dns records named", func(t *testing.T) {
		cf, rt := writeClient(t, "zone_dns_records.named.200.json")
		got, err := cf.DNSRecordsNamed(ctx, zone, "carin-test.org")
		if err != nil || len(got) != 3 || got[0].Type != "MX" || got[2].Type != "TXT" || got[2].Name != "carin-test.org" {
			t.Fatalf("DNSRecordsNamed = %+v, %v", got, err)
		}
		wantReq(t, rt.sent[0], "GET", "/zones/zone1/dns_records")
		if q, _ := url.ParseQuery(rt.sent[0].query); q.Get("name") != "carin-test.org" {
			t.Errorf("query = %q, want name=carin-test.org", rt.sent[0].query)
		}
	})
	t.Run("dns records none", func(t *testing.T) {
		cf, _ := writeClient(t, "zone_dns_records.none.200.json")
		got, err := cf.DNSRecordsNamed(ctx, zone, "example.test")
		if err != nil || len(got) != 0 {
			t.Fatalf("DNSRecordsNamed = %+v, %v, want none", got, err)
		}
	})
	t.Run("worker domains filtered by hostname", func(t *testing.T) {
		cf, rt := writeClient(t, "workers_domains.list.200.json")
		got, err := cf.WorkerDomainsFor(ctx, "example-zone-4.org")
		if err != nil || len(got) != 1 || got[0].Service != "example-worker-8" || got[0].ZoneID != "00000000000000000000000000000022" {
			t.Fatalf("WorkerDomainsFor = %+v, %v", got, err)
		}
		wantReq(t, rt.sent[0], "GET", "/accounts/acct1/workers/domains")
		if q, _ := url.ParseQuery(rt.sent[0].query); q.Get("hostname") != "example-zone-4.org" {
			t.Errorf("query = %q, want hostname=example-zone-4.org", rt.sent[0].query)
		}
		cf, _ = writeClient(t, "workers_domains.list.200.json")
		if got, _ := cf.WorkerDomainsFor(ctx, "other.example.test"); len(got) != 0 {
			t.Errorf("a stranger's domain matched: %+v", got)
		}
	})
	t.Run("worker routes", func(t *testing.T) {
		cf, rt := writeClient(t, "zone_workers_routes.one-route.200.json")
		got, err := cf.WorkerRoutes(ctx, zone)
		if err != nil || len(got) != 1 || got[0].Pattern != "www.example.test/*" || got[0].Script != "other-site" {
			t.Fatalf("WorkerRoutes = %+v, %v", got, err)
		}
		wantReq(t, rt.sent[0], "GET", "/zones/zone1/workers/routes")
		cf, _ = writeClient(t, "zone_workers_routes.list.200.json")
		if got, err := cf.WorkerRoutes(ctx, zone); err != nil || len(got) != 0 {
			t.Errorf("a zone with no routes = %+v, %v, want none", got, err)
		}
	})
	t.Run("worker exists", func(t *testing.T) {
		cf, rt := writeClient(t, "workers_scripts.list.200.json")
		got, err := cf.WorkerExists(ctx, "no-such-worker-name")
		if err != nil || got {
			t.Fatalf("WorkerExists = %v, %v, want false", got, err)
		}
		wantReq(t, rt.sent[0], "GET", "/accounts/acct1/workers/scripts")
		cf, _ = writeClient(t, "workers_scripts.list.200.json")
		if got, err := cf.WorkerExists(ctx, "example-worker-3"); err != nil || !got {
			t.Errorf("WorkerExists(a listed script) = %v, %v, want true", got, err)
		}
	})
	t.Run("d1 by name", func(t *testing.T) {
		cf, rt := writeClient(t, "d1_database.list-by-name.200.json")
		got, err := cf.D1DatabaseNamed(ctx, "example-db")
		if err != nil || got == nil || got.UUID != "00000000-0000-0000-0000-0000000000d1" {
			t.Fatalf("D1DatabaseNamed = %+v, %v", got, err)
		}
		wantReq(t, rt.sent[0], "GET", "/accounts/acct1/d1/database")
		cf, _ = writeClient(t, "d1_database.list-by-name.200.json")
		if got, _ := cf.D1DatabaseNamed(ctx, "example"); got != nil {
			t.Errorf("a substring matched: %+v", got)
		}
		cf, rt = writeClient(t, "d1_database.name-check.200.json")
		if got, err := cf.D1DatabaseNamed(ctx, "cairn-rec-tmw8khn73-db"); got != nil || err != nil {
			t.Errorf("a free name = %+v, %v, want nil, nil", got, err)
		}
		if q, _ := url.ParseQuery(rt.sent[0].query); q.Get("name") != "cairn-rec-tmw8khn73-db" || len(rt.sent) != 1 {
			t.Errorf("requests = %+v, want one GET filtered by name", rt.sent)
		}
	})
	t.Run("r2 bucket present and absent", func(t *testing.T) {
		cf, rt := writeClient(t, "r2_bucket.get.200.json")
		got, err := cf.R2BucketNamed(ctx, "example-media")
		if err != nil || got == nil || got.Name != "example-media" {
			t.Fatalf("R2BucketNamed = %+v, %v", got, err)
		}
		wantReq(t, rt.sent[0], "GET", "/accounts/acct1/r2/buckets/example-media")
		cf, _ = writeClient(t, "r2_bucket.name-check.404.json")
		if got, err := cf.R2BucketNamed(ctx, "example-media"); got != nil || err != nil {
			t.Errorf("absent bucket = %+v, %v, want nil, nil", got, err)
		}
	})
	t.Run("subscriptions", func(t *testing.T) {
		cf, rt := writeClient(t, "subscriptions.list.200.json")
		subs, ok, err := cf.Subscriptions(ctx)
		if err != nil || !ok || len(subs) != 1 || subs[0].RatePlan.ID != "workers_paid" {
			t.Fatalf("Subscriptions = %+v, %v, %v", subs, ok, err)
		}
		wantReq(t, rt.sent[0], "GET", "/accounts/acct1/subscriptions")
	})
	t.Run("subscriptions refused is a result", func(t *testing.T) {
		cf, _ := writeClient(t, "subscriptions.list.403.json")
		subs, ok, err := cf.Subscriptions(ctx)
		if err != nil || ok || subs != nil {
			t.Fatalf("Subscriptions = %+v, %v, %v, want absent without error", subs, ok, err)
		}
	})
	t.Run("create d1", func(t *testing.T) {
		cf, rt := writeClient(t, "d1_database.create.200.json")
		got, err := cf.CreateD1(ctx, "cairn-rec-tmw8khn73-db")
		if err != nil || got.UUID != "5143f436-163b-4313-967c-7b478aa2bacd" || got.Name != "cairn-rec-tmw8khn73-db" {
			t.Fatalf("CreateD1 = %+v, %v", got, err)
		}
		wantReq(t, rt.sent[0], "POST", "/accounts/acct1/d1/database")
		if rt.sent[0].body != `{"name":"cairn-rec-tmw8khn73-db"}` {
			t.Errorf("body = %s", rt.sent[0].body)
		}
	})
	t.Run("create r2", func(t *testing.T) {
		cf, rt := writeClient(t, "r2_buckets.create.200.json")
		got, err := cf.CreateR2Bucket(ctx, "cairn-rec-tmw8khn73-bucket")
		if err != nil || got.Name != "cairn-rec-tmw8khn73-bucket" || got.CreationDate != "2026-11-09T01:13:29.016Z" {
			t.Fatalf("CreateR2Bucket = %+v, %v", got, err)
		}
		wantReq(t, rt.sent[0], "POST", "/accounts/acct1/r2/buckets")
		if rt.sent[0].body != `{"name":"cairn-rec-tmw8khn73-bucket"}` {
			t.Errorf("body = %s", rt.sent[0].body)
		}
	})
	t.Run("email subdomain read then write", func(t *testing.T) {
		cf, rt := writeClient(t, "zone_email_sending_subdomains.list.200.json", "email_subdomain_create.success.200.json")
		sub, created, err := cf.EnsureEmailSendingSubdomain(ctx, zone, "carin-test.org")
		if err != nil || !created || sub.Name != "carin-test.org" || !sub.Enabled {
			t.Fatalf("Ensure = %+v, %v, %v", sub, created, err)
		}
		if len(rt.sent) != 2 || rt.sent[0].method != "GET" {
			t.Fatalf("requests = %+v, want a GET then a POST", rt.sent)
		}
		wantReq(t, rt.sent[1], "POST", "/zones/zone1/email/sending/subdomains")
		if rt.sent[1].body != `{"name":"carin-test.org"}` {
			t.Errorf("body = %s", rt.sent[1].body)
		}
	})
	t.Run("email subdomain already listed sends no write", func(t *testing.T) {
		cf, rt := writeClient(t, "zone_email_sending_subdomains.list.200.json")
		_, created, err := cf.EnsureEmailSendingSubdomain(ctx, zone, "carin-test-5.org")
		if err != nil || created || len(rt.sent) != 1 {
			t.Fatalf("created = %v, err = %v, requests = %d, want a read only", created, err, len(rt.sent))
		}
	})
	t.Run("deploy key", func(t *testing.T) {
		cf, rt := writeClient(t, "user_token_permission_groups.list.200.json", "user_tokens.create.200.json")
		key, err := cf.MintDeployKey(ctx, "run1")
		if err != nil || key.ID != "00000000000000000000000000000446" || key.Value.Reveal() != "<REDACTED>" {
			t.Fatalf("MintDeployKey = %+v, %v", key, err)
		}
		wantReq(t, rt.sent[0], "GET", "/user/tokens/permission_groups")
		wantReq(t, rt.sent[1], "POST", "/user/tokens")
		var body struct {
			Name     string `json:"name"`
			Expires  any    `json:"expires_on"`
			Policies []struct {
				Effect    string            `json:"effect"`
				Resources map[string]string `json:"resources"`
				Groups    []struct {
					ID string `json:"id"`
				} `json:"permission_groups"`
			} `json:"policies"`
		}
		if err := json.Unmarshal([]byte(rt.sent[1].body), &body); err != nil {
			t.Fatal(err)
		}
		if body.Name != "cairn-deploy-run1" || body.Expires != nil {
			t.Errorf("name = %q, expires_on = %v", body.Name, body.Expires)
		}
		if len(body.Policies) != 1 || body.Policies[0].Resources["com.cloudflare.api.account.acct1"] != "*" {
			t.Fatalf("policies = %+v", body.Policies)
		}
		var ids []string
		for _, g := range body.Policies[0].Groups {
			ids = append(ids, g.ID)
		}
		if got := strings.Join(ids, ","); got != "00000000000000000000000000000415,00000000000000000000000000000189,00000000000000000000000000000411" {
			t.Errorf("group ids = %s, want Workers Scripts, D1, R2 write only", got)
		}
		if strings.Contains(key.Value.String(), "<REDACTED>") {
			t.Error("the minted value prints through String")
		}
	})
	t.Run("deploy key without a group fails naming it", func(t *testing.T) {
		cf, rt := writeClient(t, "zone_dns_records.none.200.json")
		_, err := cf.MintDeployKey(ctx, "run1")
		if err == nil || !strings.Contains(err.Error(), "Workers Scripts Write") || len(rt.sent) != 1 {
			t.Fatalf("err = %v, requests = %d", err, len(rt.sent))
		}
	})
	t.Run("delete user token", func(t *testing.T) {
		cf, rt := writeClient(t, "user_tokens.delete.200.json")
		if err := cf.DeleteUserToken(ctx, "tok1"); err != nil {
			t.Fatal(err)
		}
		wantReq(t, rt.sent[0], "DELETE", "/user/tokens/tok1")
	})
	t.Run("delete tokens named", func(t *testing.T) {
		cf, rt := writeClient(t, "user_tokens.list.200.json", "user_tokens.delete.200.json")
		n, err := cf.DeleteUserTokensNamed(ctx, DeployKeyName("run1"))
		if err != nil || n != 1 || len(rt.sent) != 2 {
			t.Fatalf("deleted %d, err %v, requests %d", n, err, len(rt.sent))
		}
		wantReq(t, rt.sent[1], "DELETE", "/user/tokens/00000000000000000000000000000t01")
	})
	t.Run("worker secret", func(t *testing.T) {
		cf, rt := writeClient(t, "worker_secrets.put.200.json")
		if err := cf.PutWorkerSecret(ctx, "example-site", "GITHUB_APP_PRIVATE_KEY_B64", "c2VjcmV0"); err != nil {
			t.Fatal(err)
		}
		wantReq(t, rt.sent[0], "PUT", "/accounts/acct1/workers/scripts/example-site/secrets")
		if rt.sent[0].body != `{"name":"GITHUB_APP_PRIVATE_KEY_B64","text":"c2VjcmV0","type":"secret_text"}` {
			t.Errorf("body = %s", rt.sent[0].body)
		}
	})
	t.Run("custom domain", func(t *testing.T) {
		cf, rt := writeClient(t, "workers_domains.put.200.json")
		got, err := cf.AttachCustomDomain(ctx, "www.example.test", "zone1", "example-site")
		if err != nil || got.Hostname != "www.example.test" || got.Service != "example-site" {
			t.Fatalf("AttachCustomDomain = %+v, %v", got, err)
		}
		wantReq(t, rt.sent[0], "PUT", "/accounts/acct1/workers/domains")
		if rt.sent[0].body != `{"hostname":"www.example.test","service":"example-site","zone_id":"zone1"}` {
			t.Errorf("body = %s", rt.sent[0].body)
		}
	})
	t.Run("d1 query batch", func(t *testing.T) {
		cf, rt := writeClient(t, "d1_query.batch.200.json")
		got, err := cf.D1Query(ctx, "db-uuid", []D1Statement{
			{SQL: "INSERT INTO editor (email) VALUES (?)", Params: []any{"a"}},
			{SQL: "DELETE FROM magic_token"},
			{SQL: "SELECT 1 AS n"},
		})
		if err != nil || len(got) != 3 || got[1].Meta.Changes != 2 || len(got[2].Results) != 1 || !got[0].Success {
			t.Fatalf("D1Query = %+v, %v", got, err)
		}
		wantReq(t, rt.sent[0], "POST", "/accounts/acct1/d1/database/db-uuid/query")
		want := `{"batch":[{"sql":"INSERT INTO editor (email) VALUES (?)","params":["a"]},{"sql":"DELETE FROM magic_token"},{"sql":"SELECT 1 AS n"}]}`
		if rt.sent[0].body != want {
			t.Errorf("body = %s", rt.sent[0].body)
		}
	})
	t.Run("d1 query one statement", func(t *testing.T) {
		cf, _ := writeClient(t, "d1_query.success.200.json")
		got, err := cf.D1Query(ctx, "db-uuid", []D1Statement{{SQL: "SELECT 1 AS n"}})
		if err != nil || len(got) != 1 || !got[0].Success || len(got[0].Results) != 1 {
			t.Fatalf("D1Query = %+v, %v", got, err)
		}
		var row struct {
			N int `json:"n"`
		}
		if err := json.Unmarshal(got[0].Results[0], &row); err != nil || row.N != 1 {
			t.Errorf("row = %+v, %v, want n = 1", row, err)
		}
	})
	t.Run("email send", func(t *testing.T) {
		cf, rt := writeClient(t, "email_send.success.200.json")
		got, err := cf.SendEmail(ctx, EmailMessage{From: "noreply", To: "owner", Subject: "s", Text: "t"})
		if err != nil || !strings.HasPrefix(got.MessageID, "<") {
			t.Fatalf("SendEmail = %+v, %v", got, err)
		}
		wantReq(t, rt.sent[0], "POST", "/accounts/acct1/email/sending/send")
		if rt.sent[0].body != `{"from":"noreply","to":"owner","subject":"s","text":"t"}` {
			t.Errorf("body = %s", rt.sent[0].body)
		}
	})
}

// TestCloudflareWriteErrorsMapToReasons asserts a recorded or pending error body classifies to its
// reason and carries the Cloudflare code, never the message.
func TestCloudflareWriteErrorsMapToReasons(t *testing.T) {
	ctx := context.Background()
	tests := []struct {
		name      string
		fixture   string
		call      func(*Cloudflare) error
		reason    Reason
		code      int
		nameTaken bool
	}{
		{"missing scope", "user_tokens.create.missing-scope.403.json", func(cf *Cloudflare) error { _, err := cf.MintDeployKey(ctx, "r"); return err }, ReasonForbidden, 10000, false},
		{"d1 name exists", "d1_database.create.name-exists.400.json", func(cf *Cloudflare) error { _, err := cf.CreateD1(ctx, "n"); return err }, ReasonRequestRejected, 7502, true},
		{"r2 name exists", "r2_buckets.create.name-exists.409.json", func(cf *Cloudflare) error { _, err := cf.CreateR2Bucket(ctx, "n"); return err }, ReasonUnknown, 10004, true},
		{"zone pending", "zone_email_sending_subdomains.create.zone-pending.400.json", func(cf *Cloudflare) error {
			_, _, err := cf.EnsureEmailSendingSubdomain(ctx, "z", "n")
			return err
		}, ReasonRequestRejected, 1118, false},
		{"sender not configured", "email_send.refused-sender-not-configured.403.json", func(cf *Cloudflare) error { _, err := cf.SendEmail(ctx, EmailMessage{}); return err }, ReasonSenderNotConfigured, 10204, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			script := []string{tt.fixture}
			switch tt.name {
			case "missing scope":
				script = []string{"user_token_permission_groups.list.200.json", tt.fixture}
			case "zone pending":
				script = []string{"zone_email_sending_subdomains.list.200.json", tt.fixture}
			}
			cf, _ := writeClient(t, script...)
			err := tt.call(cf)
			var ae *APIError
			if !errors.As(err, &ae) {
				t.Fatalf("err = %v, want *APIError", err)
			}
			if ae.Reason != tt.reason || ae.Code != tt.code {
				t.Errorf("reason = %v code = %d, want %v and %d", ae.Reason, ae.Code, tt.reason, tt.code)
			}
			if NameTaken(err) != tt.nameTaken {
				t.Errorf("NameTaken = %v, want %v", NameTaken(err), tt.nameTaken)
			}
		})
	}
}

// TestCloudflareClientsRefuseOtherHostsBeforeDialing asserts neither client reaches its transport
// for a host outside its pin.
func TestCloudflareClientsRefuseOtherHostsBeforeDialing(t *testing.T) {
	rt := &scriptedRT{t: t}
	apiClient := newClient(cloudflareHost, NewCredential("tok"), rt)
	oauthClient := newClient(cloudflareOAuthHost, Credential{}, rt)
	for _, tt := range []struct {
		name   string
		client *client
		url    string
	}{
		{"api client to the oauth host", apiClient, "https://dash.cloudflare.com/oauth2/token"},
		{"oauth client to the api host", oauthClient, "https://api.cloudflare.com/client/v4/user"},
		{"oauth client to an unrelated host", oauthClient, "https://example.com/oauth2/token"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest(http.MethodPost, tt.url, nil)
			if _, err := tt.client.Do(req); err == nil || !strings.Contains(err.Error(), "refusing request") {
				t.Fatalf("err = %v, want a refusal", err)
			}
		})
	}
	if len(rt.sent) != 0 {
		t.Errorf("transport saw %d requests, want none", len(rt.sent))
	}
}
