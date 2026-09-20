package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// cloudflareHost is the only host a Cloudflare client will ever send a request to. There is no
// base-URL variable and no environment override, unlike the Node client this ports from
// (CAIRN_CLOUDFLARE_API_BASE): the RoundTripper passed to NewCloudflare is this client's only
// test seam.
const cloudflareHost = "api.cloudflare.com"

// cloudflareBase is cloudflareHost's v4 API path, prefixed onto every request this client sends.
const cloudflareBase = "https://" + cloudflareHost + "/client/v4"

// Cloudflare is the tool's read-only Cloudflare API v4 client: the calls the health checks
// (Task 12 onward) need to read a site's Worker, custom domain, zone, Builds, and Email Sending
// state.
type Cloudflare struct {
	accountID string
	client    *client
}

// NewCloudflare returns a Cloudflare client for accountID, authenticating with cred and sending
// every request through rt.
func NewCloudflare(accountID string, cred Credential, rt http.RoundTripper) *Cloudflare {
	c := newClient(cloudflareHost, cred)
	c.httpClient.Transport = rt
	return &Cloudflare{accountID: accountID, client: c}
}

// v4Error is one entry of a v4 envelope's "errors" array.
type v4Error struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// v4Envelope is the Cloudflare API v4 response shape every route below returns.
type v4Envelope struct {
	Success bool            `json:"success"`
	Errors  []v4Error       `json:"errors"`
	Result  json.RawMessage `json:"result"`
}

// get performs a GET against path (resolved against cloudflareBase) and decodes a successful
// envelope's result into out.
func (cf *Cloudflare) get(path string, out any) error {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cloudflareBase+path, nil)
	if err != nil {
		return fmt.Errorf("providers: build request for %s: %w", path, err)
	}
	return cf.do(req, out)
}

// post performs a POST against path with body marshaled as JSON, decoding a successful
// envelope's result into out the same way get does.
func (cf *Cloudflare) post(path string, body, out any) error {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()
	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("providers: encode body for %s: %w", path, err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cloudflareBase+path, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("providers: build request for %s: %w", path, err)
	}
	req.Header.Set("Content-Type", "application/json")
	return cf.do(req, out)
}

// do sends req and either decodes a successful envelope's result into out, or returns an
// *APIError classified by classifyReason. A non-2xx status always yields an *APIError even when
// the body is not valid JSON (a raw-text 429 from Cloudflare's edge, rather than its app layer,
// carries no code), since the status alone still classifies via the fallback branch.
func (cf *Cloudflare) do(req *http.Request, out any) error {
	resp, err := cf.client.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("providers: read response body: %w", err)
	}

	var env v4Envelope
	envErr := json.Unmarshal(data, &env)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 || (envErr == nil && !env.Success) {
		code := 0
		if envErr == nil && len(env.Errors) > 0 {
			code = env.Errors[0].Code
		}
		return &APIError{Status: resp.StatusCode, Code: code, Reason: classifyReason(resp.StatusCode, code)}
	}
	if envErr != nil {
		return fmt.Errorf("providers: parse response body: %w", envErr)
	}
	if out == nil || len(env.Result) == 0 {
		return nil
	}
	if err := json.Unmarshal(env.Result, out); err != nil {
		return fmt.Errorf("providers: decode result: %w", err)
	}
	return nil
}

// VerifyToken returns the token id Cloudflare assigns this client's credential, the value the
// Builds chapter registers as a build token's cloudflare_token_id.
func (cf *Cloudflare) VerifyToken() (string, error) {
	var result struct {
		ID string `json:"id"`
	}
	if err := cf.get("/user/tokens/verify", &result); err != nil {
		return "", err
	}
	return result.ID, nil
}

// Worker is one Workers script in an account, named by its script id.
type Worker struct {
	Name string `json:"id"`
	Tag  string `json:"tag"`
}

// ListWorkers returns every Worker script in this client's account.
func (cf *Cloudflare) ListWorkers() ([]Worker, error) {
	var workers []Worker
	path := fmt.Sprintf("/accounts/%s/workers/scripts", cf.accountID)
	if err := cf.get(path, &workers); err != nil {
		return nil, err
	}
	return workers, nil
}

// WorkerDomain is one custom domain attached to a Worker.
type WorkerDomain struct {
	Hostname string `json:"hostname"`
	Service  string `json:"service"`
	ZoneID   string `json:"zone_id"`
}

// WorkerDomains returns every custom domain attached to a Worker in this client's account.
func (cf *Cloudflare) WorkerDomains() ([]WorkerDomain, error) {
	var domains []WorkerDomain
	path := fmt.Sprintf("/accounts/%s/workers/domains", cf.accountID)
	if err := cf.get(path, &domains); err != nil {
		return nil, err
	}
	return domains, nil
}

// RepoConnection names the GitHub repository a BuildTrigger deploys from.
type RepoConnection struct {
	ProviderAccountName string `json:"provider_account_name"`
	RepoName            string `json:"repo_name"`
}

// BuildTrigger is one Workers Builds trigger, embedding the GitHub repository it deploys from.
type BuildTrigger struct {
	UUID           string          `json:"uuid"`
	RepoConnection *RepoConnection `json:"repo_connection"`
}

// BuildsConnections returns workerTag's Builds triggers, each carrying its repo connection.
// Cloudflare has no dedicated connections-list route
// (docs/internal/record/2026-08-13-t5-task8-live-e2e.md: "there is no connections list route at
// all"); triggers embed the connection instead, and a worker Cloudflare has never registered for
// Builds 404s here with the code classifyReason maps to ReasonBuildsNotConnected.
func (cf *Cloudflare) BuildsConnections(workerTag string) ([]BuildTrigger, error) {
	var triggers []BuildTrigger
	path := fmt.Sprintf("/accounts/%s/builds/workers/%s/triggers", cf.accountID, workerTag)
	if err := cf.get(path, &triggers); err != nil {
		return nil, err
	}
	return triggers, nil
}

// Build is one Workers Builds run.
type Build struct {
	UUID       string `json:"uuid"`
	Status     string `json:"status"`
	CommitHash string `json:"commit_hash"`
}

// BuildsLatest returns workerTag's most recent Builds run, or a nil Build with no error when it
// has none yet.
func (cf *Cloudflare) BuildsLatest(workerTag string) (*Build, error) {
	var builds []Build
	path := fmt.Sprintf("/accounts/%s/builds/workers/%s/builds", cf.accountID, workerTag)
	if err := cf.get(path, &builds); err != nil {
		return nil, err
	}
	if len(builds) == 0 {
		return nil, nil
	}
	return &builds[0], nil
}

// Zone is a Cloudflare DNS zone.
type Zone struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// ZoneByName returns the zone named name, or a nil Zone with no error when the account has none
// by that name.
func (cf *Cloudflare) ZoneByName(name string) (*Zone, error) {
	var zones []Zone
	path := "/zones?name=" + url.QueryEscape(name)
	if err := cf.get(path, &zones); err != nil {
		return nil, err
	}
	if len(zones) == 0 {
		return nil, nil
	}
	return &zones[0], nil
}

// ZoneSetting is one zone setting's id and current value, the shape every entry of
// GET /zones/{id}/settings shares regardless of the setting.
type ZoneSetting struct {
	ID    string `json:"id"`
	Value any    `json:"value"`
}

// ZoneSettings returns every setting Cloudflare reports for zoneID, including
// "always_use_https", the HTTPS-forced check's signal.
func (cf *Cloudflare) ZoneSettings(zoneID string) ([]ZoneSetting, error) {
	var settings []ZoneSetting
	path := fmt.Sprintf("/zones/%s/settings", zoneID)
	if err := cf.get(path, &settings); err != nil {
		return nil, err
	}
	return settings, nil
}

// SendingSubdomain is one Email Sending subdomain Cloudflare has onboarded for a zone.
type SendingSubdomain struct {
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
}

// EmailSendingSubdomains returns every Email Sending subdomain onboarded for zoneID.
func (cf *Cloudflare) EmailSendingSubdomains(zoneID string) ([]SendingSubdomain, error) {
	var subdomains []SendingSubdomain
	path := fmt.Sprintf("/zones/%s/email/sending/subdomains", zoneID)
	if err := cf.get(path, &subdomains); err != nil {
		return nil, err
	}
	return subdomains, nil
}

// ObservabilityResult is the count Task 21's error-rate query reads: how many log events
// matched query, over the window query specified.
type ObservabilityResult struct {
	Count int `json:"count"`
}

// ObservabilityQuery runs a Workers Logs telemetry query against this client's account and
// returns its result.
func (cf *Cloudflare) ObservabilityQuery(query map[string]any) (*ObservabilityResult, error) {
	var result ObservabilityResult
	path := fmt.Sprintf("/accounts/%s/workers/observability/telemetry/query", cf.accountID)
	if err := cf.post(path, query, &result); err != nil {
		return nil, err
	}
	return &result, nil
}
