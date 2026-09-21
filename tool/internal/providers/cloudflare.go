package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// cloudflareHost is the only host a Cloudflare client will ever send a request to. There is no
// base-URL variable and no environment override, unlike the Node client this ports from
// (CAIRN_CLOUDFLARE_API_BASE): the RoundTripper passed to NewCloudflare is this client's only
// test seam.
const cloudflareHost = "api.cloudflare.com"

// cloudflareBase is cloudflareHost's v4 API path, prefixed onto every request this client sends.
const cloudflareBase = "https://" + cloudflareHost + "/client/v4"

// Cloudflare is the tool's read-only Cloudflare API v4 client: the calls the health checks need
// to read a site's Worker, custom domain, zone, Builds, and Email Sending state.
type Cloudflare struct {
	accountID string
	client    *client
}

// NewCloudflare returns a Cloudflare client for accountID, authenticating with cred and sending
// every request through rt.
func NewCloudflare(accountID string, cred Credential, rt http.RoundTripper) *Cloudflare {
	return &Cloudflare{accountID: accountID, client: newClient(cloudflareHost, cred, rt)}
}

// v4Error is one entry of a v4 envelope's "errors" array. It carries no Message field: no code
// path under tool/ reads a v4 error's message text.
type v4Error struct {
	Code int `json:"code"`
}

// resultInfo is a v4 list route's pagination metadata, present on the envelope's "result_info"
// field whenever the route paginates. Cloudflare does not fill the same fields on every route:
// a live capture on 2026-09-21 found /zones and /zones/{id}/dns_records carrying total_pages,
// /accounts/{id}/workers/domains carrying per_page and total_count and no total_pages at all,
// and /accounts/{id}/workers/scripts, /zones/{id}/settings, and the Email Sending subdomains
// route carrying no result_info whatsoever. morePages reads whichever of them arrived; the
// recorded bodies are in packages/create-cairn-site/fixtures/cloudflare.
type resultInfo struct {
	TotalPages int `json:"total_pages"`
	TotalCount int `json:"total_count"`
	PerPage    int `json:"per_page"`
}

// v4Envelope is the Cloudflare API v4 response shape every route below returns.
type v4Envelope struct {
	Success    bool            `json:"success"`
	Errors     []v4Error       `json:"errors"`
	Result     json.RawMessage `json:"result"`
	ResultInfo *resultInfo     `json:"result_info"`
}

// APIError reports a Cloudflare v4 API call that did not succeed: a non-2xx status, or a 2xx
// whose envelope carries "success": false. Status and Code carry the raw HTTP status and the
// envelope's first error code (0 when the body carried none, or was not JSON at all), for a
// caller that wants to log the specifics; Reason is what a health check branches on.
type APIError struct {
	Status int
	Code   int
	Reason Reason
}

// Error implements the error interface.
func (e *APIError) Error() string {
	return fmt.Sprintf("cloudflare: %s (status %d, code %d)", e.Reason, e.Status, e.Code)
}

// ClassifiedReason implements ProviderError.
func (e *APIError) ClassifiedReason() Reason { return e.Reason }

// HTTPStatus implements ProviderError.
func (e *APIError) HTTPStatus() int { return e.Status }

// classifyReason maps an HTTP status and a v4 envelope's errors onto a Reason, the way
// throwMapped and throwBuildsMapped do for the Node CLI. Four codes are specific enough to
// classify on their own regardless of status or position: the two Builds authorization refusals
// and the two Email Sending sender-readiness codes are matched against every entry of errs, not
// just the first, the same way the Node client's errors.some(...) does (api.mjs), since a
// warning ahead of the refusal must not make the row fall through to the status-only fallback.
// HTTP 400 with code 6003 also classifies as ReasonUnauthorized, the second half of the Node
// client's throwIfTokenInvalid (api.mjs: 400/6003 and 401/10000 both mean the token
// itself is unusable). There is no code for ReasonBuildsNotConnected here (see that constant's
// own doc comment); everything else falls back to reasonForStatus, which is how a plain
// unauthenticated, underscoped, or rate-limited request classifies.
func classifyReason(status int, errs []v4Error, header http.Header) Reason {
	for _, e := range errs {
		switch e.Code {
		case 8000008:
			return ReasonBuildsAppNotAuthorized
		case 8000012:
			return ReasonBuildsRepoNotSelected
		case 10203, 10204:
			return ReasonSenderNotConfigured
		}
	}
	if status == http.StatusBadRequest && len(errs) > 0 && errs[0].Code == 6003 {
		return ReasonUnauthorized
	}
	return reasonForStatus(status, header)
}

// maxPaginatedPages bounds getPaginated's page walk defensively, so a route that keeps
// reporting more pages than it actually has cannot loop forever; a real account's Workers,
// zone settings, and Email Sending subdomains stay far below this in practice.
const maxPaginatedPages = 100

// get performs a GET against path (resolved against cloudflareBase) and decodes a successful
// envelope's result into out.
func (cf *Cloudflare) get(ctx context.Context, path string, out any) error {
	return cf.getPage(ctx, path, out, nil)
}

// getPage performs a GET like get, additionally decoding the envelope's "result_info" into info
// when info is non-nil, the seam getPaginated uses to walk every page of a list route.
func (cf *Cloudflare) getPage(ctx context.Context, path string, out any, info *resultInfo) error {
	reqCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, cloudflareBase+path, nil)
	if err != nil {
		return fmt.Errorf("providers: build request for %s: %w", path, err)
	}
	return cf.do(req, out, info)
}

// getPaginated walks every page of a v4 list route via its "result_info", appending "page=N" to
// path, and returns the concatenated result arrays. Type parameter T is one page's element type,
// so a caller reads a typed slice straight out rather than a []any it would have to re-decode.
// The walk stops after maxPaginatedPages pages whatever the metadata claims.
func getPaginated[T any](ctx context.Context, cf *Cloudflare, path string) ([]T, error) {
	sep := "?"
	if strings.Contains(path, "?") {
		sep = "&"
	}
	var results []T
	for page := 1; page <= maxPaginatedPages; page++ {
		var items []T
		var info resultInfo
		pagePath := fmt.Sprintf("%s%spage=%d", path, sep, page)
		if err := cf.getPage(ctx, pagePath, &items, &info); err != nil {
			return nil, err
		}
		results = append(results, items...)
		if !morePages(info, page, len(items)) {
			break
		}
	}
	return results, nil
}

// morePages reports whether the route has a page after the one just read, from whichever
// pagination fields the route filled in. Reading total_pages alone is what made discovery see
// one of the account's seven Worker custom domains: that route reports per_page and total_count
// and no total_pages, so a total_pages of zero has to mean "this route does not report it",
// never "there is one page". The clauses are in order of how much they prove:
//
//   - An empty page ends the walk whatever the metadata says. Cloudflare answers the page after
//     the last with an empty result rather than an error, so this alone terminates the walk even
//     if every count were wrong.
//   - total_pages, when the route reports it, is exact.
//   - total_count with per_page gives the same answer by arithmetic.
//   - per_page alone means a full page might have a successor and a short one cannot.
//   - No result_info at all means the route returned everything it has in one body.
func morePages(info resultInfo, page, got int) bool {
	switch {
	case got == 0:
		return false
	case info.TotalPages > 0:
		return page < info.TotalPages
	case info.TotalCount > 0 && info.PerPage > 0:
		return page*info.PerPage < info.TotalCount
	case info.PerPage > 0:
		return got >= info.PerPage
	default:
		return false
	}
}

// post performs a POST against path with body marshaled as JSON, decoding a successful
// envelope's result into out the same way get does.
func (cf *Cloudflare) post(ctx context.Context, path string, body, out any) error {
	reqCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("providers: encode body for %s: %w", path, err)
	}
	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, cloudflareBase+path, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("providers: build request for %s: %w", path, err)
	}
	req.Header.Set("Content-Type", "application/json")
	return cf.do(req, out, nil)
}

// do sends req and either decodes a successful envelope's result into out (and its
// "result_info" into info, when info is non-nil), or returns an *APIError classified by
// classifyReason. A non-2xx status always yields an *APIError even when the body is not valid
// JSON (a raw-text 429 from Cloudflare's edge, rather than its app layer, carries no code),
// since the status alone still classifies via the fallback branch.
func (cf *Cloudflare) do(req *http.Request, out any, info *resultInfo) error {
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
		var errs []v4Error
		if envErr == nil {
			errs = env.Errors
		}
		code := 0
		if len(errs) > 0 {
			code = errs[0].Code
		}
		return &APIError{Status: resp.StatusCode, Code: code, Reason: classifyReason(resp.StatusCode, errs, resp.Header)}
	}
	if envErr != nil {
		return fmt.Errorf("providers: parse response body: %w", envErr)
	}
	if info != nil && env.ResultInfo != nil {
		*info = *env.ResultInfo
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
func (cf *Cloudflare) VerifyToken(ctx context.Context) (string, error) {
	var result struct {
		ID string `json:"id"`
	}
	if err := cf.get(ctx, "/user/tokens/verify", &result); err != nil {
		return "", err
	}
	return result.ID, nil
}

// Worker is one Workers script in an account, named by its script id.
type Worker struct {
	Name string `json:"id"`
	Tag  string `json:"tag"`
}

// ListWorkers returns every Worker script in this client's account, following every page of the
// route's result_info.
func (cf *Cloudflare) ListWorkers(ctx context.Context) ([]Worker, error) {
	path := fmt.Sprintf("/accounts/%s/workers/scripts", cf.accountID)
	return getPaginated[Worker](ctx, cf, path)
}

// WorkerDomain is one custom domain attached to a Worker.
type WorkerDomain struct {
	Hostname string `json:"hostname"`
	Service  string `json:"service"`
	ZoneID   string `json:"zone_id"`
}

// WorkerDomains returns every custom domain attached to a Worker in this client's account,
// following every page of the route's result_info.
func (cf *Cloudflare) WorkerDomains(ctx context.Context) ([]WorkerDomain, error) {
	path := fmt.Sprintf("/accounts/%s/workers/domains", cf.accountID)
	return getPaginated[WorkerDomain](ctx, cf, path)
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
// all"); triggers embed the connection instead. A worker Cloudflare has never registered for
// Builds returns a 200 with an empty slice and no error, confirmed by a live probe; treating an
// empty list as the builds-not-connected condition is the caller's job, not this method's.
func (cf *Cloudflare) BuildsConnections(ctx context.Context, workerTag string) ([]BuildTrigger, error) {
	var triggers []BuildTrigger
	path := fmt.Sprintf("/accounts/%s/builds/workers/%s/triggers", cf.accountID, workerTag)
	if err := cf.get(ctx, path, &triggers); err != nil {
		return nil, err
	}
	return triggers, nil
}

// Build is one Workers Builds run. The field names below match the live shape captured in
// docs/internal/record/2026-08-13-t5-task8-live-e2e.md and the fake server's own
// createBuildKickHandler (packages/create-cairn-site/test/fake-cloudflare.mjs): the commit hash
// nests under "build_trigger_metadata" rather than sitting on the build itself, since that
// object also carries the commit that triggered a push-sourced build.
type Build struct {
	UUID            string    `json:"build_uuid"`
	Status          string    `json:"status"`
	Outcome         string    `json:"build_outcome"`
	CreatedOn       time.Time `json:"created_on"`
	TriggerMetadata struct {
		CommitHash string `json:"commit_hash"`
	} `json:"build_trigger_metadata"`
}

// BuildsLatest returns workerTag's most recent Builds run, or a nil Build with no error when it
// has none yet.
func (cf *Cloudflare) BuildsLatest(ctx context.Context, workerTag string) (*Build, error) {
	var builds []Build
	path := fmt.Sprintf("/accounts/%s/builds/workers/%s/builds", cf.accountID, workerTag)
	if err := cf.get(ctx, path, &builds); err != nil {
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
	// Status is the zone's own activation state ("active" once Cloudflare has finished taking
	// over the domain's DNS, "pending" or "initializing" while that is still in progress).
	Status string `json:"status"`
}

// ZoneByName returns the zone named name, or a nil Zone with no error when the account has none
// by that name.
func (cf *Cloudflare) ZoneByName(ctx context.Context, name string) (*Zone, error) {
	var zones []Zone
	path := "/zones?name=" + url.QueryEscape(name)
	if err := cf.get(ctx, path, &zones); err != nil {
		return nil, err
	}
	if len(zones) == 0 {
		return nil, nil
	}
	return &zones[0], nil
}

// ListZones returns every zone this client's credential can read, following every page of the
// route's result_info. Worker discovery needs it to name a custom domain's zone: the Worker
// domains route reports a zone id and no name, and one listing costs a single request where a
// lookup per zone id costs one apiece.
func (cf *Cloudflare) ListZones(ctx context.Context) ([]Zone, error) {
	return getPaginated[Zone](ctx, cf, "/zones")
}

// BuildsTokens confirms this client's read access to Workers Builds Configuration with no
// worker tag needed: GET /accounts/{id}/builds/tokens is account-scoped, unlike
// BuildsConnections and BuildsLatest, which both need a worker already registered for Builds.
// The route's own body carries no field a caller reads; only whether the call succeeded matters
// here.
func (cf *Cloudflare) BuildsTokens(ctx context.Context) error {
	return cf.get(ctx, fmt.Sprintf("/accounts/%s/builds/tokens", cf.accountID), nil)
}

// DNSRecord is one zone DNS record's name and type, the shape GET /zones/{id}/dns_records
// returns.
type DNSRecord struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

// DNSRecords returns every DNS record Cloudflare reports for zoneID, following every page of the
// route's result_info, confirming this client's read access to the DNS permission group against
// one zone.
func (cf *Cloudflare) DNSRecords(ctx context.Context, zoneID string) ([]DNSRecord, error) {
	path := fmt.Sprintf("/zones/%s/dns_records", zoneID)
	return getPaginated[DNSRecord](ctx, cf, path)
}

// ZoneSetting is one zone setting's id and current value, the shape every entry of
// GET /zones/{id}/settings shares regardless of the setting.
type ZoneSetting struct {
	ID    string `json:"id"`
	Value any    `json:"value"`
}

// ZoneSettings returns every setting Cloudflare reports for zoneID, including
// "always_use_https", the HTTPS-forced check's signal, following every page of the route's
// result_info.
func (cf *Cloudflare) ZoneSettings(ctx context.Context, zoneID string) ([]ZoneSetting, error) {
	path := fmt.Sprintf("/zones/%s/settings", zoneID)
	return getPaginated[ZoneSetting](ctx, cf, path)
}

// SendingSubdomain is one Email Sending subdomain Cloudflare has onboarded for a zone.
type SendingSubdomain struct {
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
}

// EmailSendingSubdomains returns every Email Sending subdomain onboarded for zoneID, following
// every page of the route's result_info.
func (cf *Cloudflare) EmailSendingSubdomains(ctx context.Context, zoneID string) ([]SendingSubdomain, error) {
	path := fmt.Sprintf("/zones/%s/email/sending/subdomains", zoneID)
	return getPaginated[SendingSubdomain](ctx, cf, path)
}

// ObservabilityResult is a Workers Logs telemetry query's "result" object. Its "events" member
// is an object rather than an array, which a live capture on 2026-09-21 established and the
// synthesized fixture this package used to decode did not
// (packages/create-cairn-site/fixtures/cloudflare/observability-telemetry-query.events.200.json).
// "run" and "statistics" sit beside it and carry nothing a caller here reads.
type ObservabilityResult struct {
	// Events is the result's "events" object.
	Events ObservabilityEvents `json:"events"`
}

// ObservabilityEvents is a telemetry query's matching events and their count.
type ObservabilityEvents struct {
	// Events is every matching event, in the order the API returned them.
	Events []ObservabilityEvent `json:"events"`
	// Count is how many events the query matched.
	Count int `json:"count"`
}

// ObservabilityEvent is one matching telemetry event: the platform's own envelope around the
// record a Worker logged.
type ObservabilityEvent struct {
	// Source is the record the Worker itself logged, kept as raw JSON so a caller decodes only
	// the keys it recognizes. For a cairn engine record this is the whole log record, envelope
	// and fields together; for a bare console call it is the platform's own {level, message}.
	Source json.RawMessage `json:"source"`
	// Timestamp is when the platform recorded the event, in milliseconds since the Unix epoch.
	// It is the platform's own clock, not the record's, so it is present even on a record that
	// carries no timestamp of its own.
	Timestamp int64 `json:"timestamp"`
}

// ObservabilityQuery runs a Workers Logs telemetry query against this client's account and
// returns its result.
func (cf *Cloudflare) ObservabilityQuery(ctx context.Context, query map[string]any) (*ObservabilityResult, error) {
	var result ObservabilityResult
	path := fmt.Sprintf("/accounts/%s/workers/observability/telemetry/query", cf.accountID)
	if err := cf.post(ctx, path, query, &result); err != nil {
		return nil, err
	}
	return &result, nil
}
