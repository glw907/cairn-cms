package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"slices"
)

// send performs a write (or any non-GET) against path with body marshaled as JSON, decoding a
// successful envelope's result into out. The transport never retries a non-GET, so a write is
// never sent twice behind the caller's back.
func (cf *Cloudflare) send(ctx context.Context, method, path string, body, out any) error {
	reqCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	var rd io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("providers: encode body for %s: %w", path, err)
		}
		rd = bytes.NewReader(data)
	}
	req, err := http.NewRequestWithContext(reqCtx, method, cloudflareBase+path, rd)
	if err != nil {
		return fmt.Errorf("providers: build request for %s: %w", path, err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return cf.do(req, out, nil)
}

// NameTaken reports whether err is a Cloudflare refusal of a create because the name is already
// in use: an R2 bucket's 409 (code 10004) or a D1 database's duplicate (code 7502). No Reason
// carries it, since the published reason vocabulary has no "already exists" and this is a
// condition the setup runner branches on, not one a health check renders.
func NameTaken(err error) bool {
	var ae *APIError
	if !errors.As(err, &ae) {
		return false
	}
	return ae.Status == http.StatusConflict || ae.Code == 10004 || ae.Code == 7502
}

// Account is one account the credential can reach.
type Account struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Accounts returns every account the credential can reach.
func (cf *Cloudflare) Accounts(ctx context.Context) ([]Account, error) {
	return getPaginated[Account](ctx, cf, "/accounts")
}

// UserEmail returns the signed-in user's email address, the owner address setup seeds.
func (cf *Cloudflare) UserEmail(ctx context.Context) (string, error) {
	var u struct {
		Email string `json:"email"`
	}
	if err := cf.get(ctx, "/user", &u); err != nil {
		return "", err
	}
	return u.Email, nil
}

// ActiveZones returns this account's zones whose status is active, the only zones a custom
// domain can attach to.
func (cf *Cloudflare) ActiveZones(ctx context.Context) ([]Zone, error) {
	q := url.Values{"account.id": {cf.accountID}, "status": {"active"}}
	return getPaginated[Zone](ctx, cf, "/zones?"+q.Encode())
}

// DNSRecordsNamed returns the records of zoneID whose name is exactly name, for the address
// check: any match refuses the address.
func (cf *Cloudflare) DNSRecordsNamed(ctx context.Context, zoneID, name string) ([]DNSRecord, error) {
	q := url.Values{"name": {name}}
	return getPaginated[DNSRecord](ctx, cf, fmt.Sprintf("/zones/%s/dns_records?%s", zoneID, q.Encode()))
}

// WorkerDomainsFor returns the Worker custom domains of this account whose hostname is exactly
// hostname. It filters the response itself as well as in the query, so a route that ignores the
// filter cannot report a stranger's domain as a match.
func (cf *Cloudflare) WorkerDomainsFor(ctx context.Context, hostname string) ([]WorkerDomain, error) {
	q := url.Values{"hostname": {hostname}}
	all, err := getPaginated[WorkerDomain](ctx, cf, fmt.Sprintf("/accounts/%s/workers/domains?%s", cf.accountID, q.Encode()))
	if err != nil {
		return nil, err
	}
	return slices.DeleteFunc(all, func(d WorkerDomain) bool { return d.Hostname != hostname }), nil
}

// WorkerRoute is one route pattern of a zone and the script it runs.
type WorkerRoute struct {
	ID      string `json:"id"`
	Pattern string `json:"pattern"`
	Script  string `json:"script"`
}

// WorkerRoutes returns every Worker route of zoneID. The reference's description is "Returns
// Worker routes for a zone." (GET /zones/{zone_id}/workers/routes, accepting Workers Routes
// Read or Write; https://developers.cloudflare.com/api/resources/workers/subresources/routes/methods/list/).
// A route is an older way to serve a hostname than a custom domain, and either blocks an address.
func (cf *Cloudflare) WorkerRoutes(ctx context.Context, zoneID string) ([]WorkerRoute, error) {
	var routes []WorkerRoute
	if err := cf.get(ctx, fmt.Sprintf("/zones/%s/workers/routes", zoneID), &routes); err != nil {
		return nil, err
	}
	return routes, nil
}

// WorkerExists reports whether this account already has a Worker script named name.
func (cf *Cloudflare) WorkerExists(ctx context.Context, name string) (bool, error) {
	workers, err := cf.ListWorkers(ctx)
	if err != nil {
		return false, err
	}
	return slices.ContainsFunc(workers, func(w Worker) bool { return w.Name == name }), nil
}

// D1Database is one D1 database. UUID is the id every later D1 call takes.
type D1Database struct {
	UUID string `json:"uuid"`
	Name string `json:"name"`
}

// D1DatabaseNamed returns the database named exactly name, or nil when there is none. The list
// route's name filter matches substrings, so the exact match is made here.
func (cf *Cloudflare) D1DatabaseNamed(ctx context.Context, name string) (*D1Database, error) {
	q := url.Values{"name": {name}}
	all, err := getPaginated[D1Database](ctx, cf, fmt.Sprintf("/accounts/%s/d1/database?%s", cf.accountID, q.Encode()))
	if err != nil {
		return nil, err
	}
	for _, d := range all {
		if d.Name == name {
			return &d, nil
		}
	}
	return nil, nil
}

// CreateD1 creates a database named name.
func (cf *Cloudflare) CreateD1(ctx context.Context, name string) (*D1Database, error) {
	var d D1Database
	err := cf.send(ctx, http.MethodPost, fmt.Sprintf("/accounts/%s/d1/database", cf.accountID), map[string]string{"name": name}, &d)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// R2Bucket is one R2 bucket.
type R2Bucket struct {
	Name         string `json:"name"`
	CreationDate string `json:"creation_date"`
}

// R2BucketNamed returns the bucket named name, or nil when this account has none.
func (cf *Cloudflare) R2BucketNamed(ctx context.Context, name string) (*R2Bucket, error) {
	var b R2Bucket
	err := cf.get(ctx, fmt.Sprintf("/accounts/%s/r2/buckets/%s", cf.accountID, url.PathEscape(name)), &b)
	var ae *APIError
	if errors.As(err, &ae) && ae.Reason == ReasonNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

// CreateR2Bucket creates a bucket named name.
func (cf *Cloudflare) CreateR2Bucket(ctx context.Context, name string) (*R2Bucket, error) {
	var b R2Bucket
	err := cf.send(ctx, http.MethodPost, fmt.Sprintf("/accounts/%s/r2/buckets", cf.accountID), map[string]string{"name": name}, &b)
	if err != nil {
		return nil, err
	}
	return &b, nil
}

// Subscription is one billing subscription of the account, decoded loosely: the route's shape is
// only read for the plan's identity.
type Subscription struct {
	ID       string `json:"id"`
	State    string `json:"state"`
	RatePlan struct {
		ID         string `json:"id"`
		PublicName string `json:"public_name"`
	} `json:"rate_plan"`
}

// Subscriptions returns the account's subscriptions. The route has answered code 10000 to every
// token tried, so a 403 is a result and not a failure: available is false and the error is nil,
// and the caller falls back to stating the plan's cost. Any other failure is returned.
func (cf *Cloudflare) Subscriptions(ctx context.Context) (subs []Subscription, available bool, err error) {
	err = cf.get(ctx, fmt.Sprintf("/accounts/%s/subscriptions", cf.accountID), &subs)
	var ae *APIError
	if errors.As(err, &ae) && ae.Status == http.StatusForbidden {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return subs, true, nil
}

// EnsureEmailSendingSubdomain onboards name for Email Sending on zoneID unless the zone already
// lists it, reading before writing so a resumed run never onboards twice. created reports
// whether a POST was sent.
func (cf *Cloudflare) EnsureEmailSendingSubdomain(ctx context.Context, zoneID, name string) (sub SendingSubdomain, created bool, err error) {
	existing, err := cf.EmailSendingSubdomains(ctx, zoneID)
	if err != nil {
		return SendingSubdomain{}, false, err
	}
	for _, s := range existing {
		if s.Name == name {
			return s, false, nil
		}
	}
	err = cf.send(ctx, http.MethodPost, fmt.Sprintf("/zones/%s/email/sending/subdomains", zoneID), map[string]string{"name": name}, &sub)
	if err != nil {
		return SendingSubdomain{}, false, err
	}
	return sub, true, nil
}

// PermissionGroup is one token permission group.
type PermissionGroup struct {
	ID     string   `json:"id"`
	Name   string   `json:"name"`
	Scopes []string `json:"scopes"`
}

// PermissionGroups returns every permission group a user token can carry.
func (cf *Cloudflare) PermissionGroups(ctx context.Context) ([]PermissionGroup, error) {
	var groups []PermissionGroup
	if err := cf.get(ctx, "/user/tokens/permission_groups", &groups); err != nil {
		return nil, err
	}
	return groups, nil
}

// deployKeyGroups names the account-scoped groups the deploy key carries: it publishes the
// Worker, runs its D1 migrations, and writes its media bucket, and nothing else.
var deployKeyGroups = []string{"Workers Scripts Write", "D1 Write", "Workers R2 Storage Write"}

// DeployKeyName is the name a run's deploy key is minted under, so a resumed run finds and
// deletes its own earlier attempt.
func DeployKeyName(runID string) string { return "cairn-deploy-" + runID }

// DeployKey is a minted user token. Value is shown once, at creation.
type DeployKey struct {
	ID    string
	Value Credential
}

// MintDeployKey mints the site's deploy key: Workers Scripts, D1, and R2 write on this account,
// with no expiry, named by DeployKeyName. It reads the permission groups first and fails
// naming a group the account does not offer.
func (cf *Cloudflare) MintDeployKey(ctx context.Context, runID string) (*DeployKey, error) {
	groups, err := cf.PermissionGroups(ctx)
	if err != nil {
		return nil, err
	}
	ids := make([]map[string]string, 0, len(deployKeyGroups))
	for _, want := range deployKeyGroups {
		i := slices.IndexFunc(groups, func(g PermissionGroup) bool {
			return g.Name == want && slices.Contains(g.Scopes, "com.cloudflare.api.account")
		})
		if i < 0 {
			return nil, fmt.Errorf("providers: permission group %q is not offered at account scope", want)
		}
		ids = append(ids, map[string]string{"id": groups[i].ID})
	}
	body := map[string]any{
		"name": DeployKeyName(runID),
		"policies": []map[string]any{{
			"effect":            "allow",
			"resources":         map[string]string{"com.cloudflare.api.account." + cf.accountID: "*"},
			"permission_groups": ids,
		}},
	}
	var res struct {
		ID    string `json:"id"`
		Value string `json:"value"`
	}
	if err := cf.send(ctx, http.MethodPost, "/user/tokens", body, &res); err != nil {
		return nil, err
	}
	return &DeployKey{ID: res.ID, Value: NewCredential(res.Value)}, nil
}

// DeleteUserToken deletes the user token id.
func (cf *Cloudflare) DeleteUserToken(ctx context.Context, id string) error {
	return cf.send(ctx, http.MethodDelete, "/user/tokens/"+url.PathEscape(id), nil, nil)
}

// DeleteUserTokensNamed deletes every user token called name and returns how many it deleted.
// A resumed run calls it with DeployKeyName before minting again, since the earlier attempt may
// have created a token whose id was never recorded.
func (cf *Cloudflare) DeleteUserTokensNamed(ctx context.Context, name string) (int, error) {
	tokens, err := getPaginated[struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}](ctx, cf, "/user/tokens")
	if err != nil {
		return 0, err
	}
	n := 0
	for _, t := range tokens {
		if t.Name != name {
			continue
		}
		if err := cf.DeleteUserToken(ctx, t.ID); err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}

// PutWorkerSecret sets the secret_text secret name on script. The script must exist already.
// The value is sent and never echoed: an error carries the Cloudflare code and nothing else.
func (cf *Cloudflare) PutWorkerSecret(ctx context.Context, script, name, text string) error {
	path := fmt.Sprintf("/accounts/%s/workers/scripts/%s/secrets", cf.accountID, url.PathEscape(script))
	return cf.send(ctx, http.MethodPut, path, map[string]string{"name": name, "text": text, "type": "secret_text"}, nil)
}

// AttachCustomDomain attaches hostname to the Worker service as a custom domain, in the zone
// zoneID. The call is idempotent for the same triple.
func (cf *Cloudflare) AttachCustomDomain(ctx context.Context, hostname, zoneID, service string) (*WorkerDomain, error) {
	var d WorkerDomain
	body := map[string]string{"hostname": hostname, "zone_id": zoneID, "service": service}
	err := cf.send(ctx, http.MethodPut, fmt.Sprintf("/accounts/%s/workers/domains", cf.accountID), body, &d)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// D1Statement is one SQL statement with its positional parameters.
type D1Statement struct {
	SQL    string `json:"sql"`
	Params []any  `json:"params,omitempty"`
}

// D1Result is one statement's outcome within a batch.
type D1Result struct {
	Results []json.RawMessage `json:"results"`
	Success bool              `json:"success"`
	Meta    struct {
		Changes int `json:"changes"`
	} `json:"meta"`
}

// D1Query runs stmts as one batch against the database and returns one result per statement, in
// order. The batch is one transaction, so a failing statement applies none of them.
func (cf *Cloudflare) D1Query(ctx context.Context, databaseUUID string, stmts []D1Statement) ([]D1Result, error) {
	path := fmt.Sprintf("/accounts/%s/d1/database/%s/query", cf.accountID, url.PathEscape(databaseUUID))
	var results []D1Result
	if err := cf.send(ctx, http.MethodPost, path, map[string]any{"batch": stmts}, &results); err != nil {
		return nil, err
	}
	return results, nil
}

// EmailMessage is one plain-text message for Email Sending. From must be an address on an
// onboarded domain.
type EmailMessage struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Subject string `json:"subject"`
	Text    string `json:"text"`
}

// EmailSendResult is the delivery outcome of one send.
type EmailSendResult struct {
	MessageID        string   `json:"message_id"`
	Delivered        []string `json:"delivered"`
	Queued           []string `json:"queued"`
	PermanentBounces []string `json:"permanent_bounces"`
}

// SendEmail sends m through the account's Email Sending. A sender whose domain is not yet
// verified fails as ReasonSenderNotConfigured.
func (cf *Cloudflare) SendEmail(ctx context.Context, m EmailMessage) (*EmailSendResult, error) {
	var r EmailSendResult
	if err := cf.send(ctx, http.MethodPost, fmt.Sprintf("/accounts/%s/email/sending/send", cf.accountID), m, &r); err != nil {
		return nil, err
	}
	return &r, nil
}
