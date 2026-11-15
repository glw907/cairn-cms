package main

import (
	"context"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
)

// permissionScope classifies what confirming one of cairn auth check's permissions needs beyond
// the three credentials themselves. An account-scoped permission is confirmed with credentials
// alone; a site-scoped one additionally needs a registered site's zone or repository, which
// cairn auth check reads from the registry only when the operator names a site.
type permissionScope int

const (
	// scopeAccount permissions are confirmed against the account or the token itself, with no
	// site named.
	scopeAccount permissionScope = iota
	// scopeSite permissions need a site's zone id or repository, and are skipped when the
	// operator names none.
	scopeSite
)

// probeTarget is what one permission's probe reads: the provider clients, and the registered
// site a site-scoped probe is confirmed against. site is the zero value when the operator named
// none, and checkPermission never runs a site-scoped probe in that case.
type probeTarget struct {
	cf   *providers.Cloudflare
	gh   *providers.GitHub
	site checkSite
}

// permission is one row of cairn auth check's permission table: the label the provider's
// token page uses, the credential variable it belongs to, the scope confirming it needs, and the
// call that confirms it.
//
// This is the single source both the command's rows and docs/admin/credentials.md's "Token
// scopes" section read from. Label is a provider-defined name, not prose this package drafts, so
// it carries no entry in messages.go's operator-copy catalogue; permissions_test.go fails when
// this table and the doc's list of labels disagree.
type permission struct {
	Label      string
	Credential string
	Scope      permissionScope
	// probe is the read-only call that confirms the permission.
	probe func(ctx context.Context, t probeTarget) error
}

// permissionTable is cairn auth check's fixed set of nine permissions: the seven Cloudflare
// dashboard-named groups docs/admin/credentials.md's "Cloudflare" list names, and GitHub's
// Contents and Metadata.
//
// Metadata needs no repository: GET /rate_limit confirms the token is usable at all, and every
// fine-grained token carries it by default. Contents reads a file at the site's default branch
// rather than main, because a repository whose default branch is another name answers 404 at any
// other ref, and a held read permission would report as not found.
var permissionTable = []permission{
	{Label: "Workers Scripts", Credential: varCFReadToken, Scope: scopeAccount, probe: func(ctx context.Context, t probeTarget) error {
		_, err := t.cf.ListWorkers(ctx)
		return err
	}},
	{Label: "Workers Builds Configuration", Credential: varCFReadToken, Scope: scopeAccount, probe: func(ctx context.Context, t probeTarget) error {
		return t.cf.BuildsTokens(ctx)
	}},
	{Label: "Workers Observability", Credential: varCFReadToken, Scope: scopeAccount, probe: func(ctx context.Context, t probeTarget) error {
		_, err := t.cf.ObservabilityQuery(ctx, observabilityProbeQuery())
		return err
	}},
	{Label: "Zone", Credential: varCFReadToken, Scope: scopeAccount, probe: func(ctx context.Context, t probeTarget) error {
		_, err := t.cf.ListZones(ctx)
		return err
	}},
	{Label: "Zone Settings", Credential: varCFReadToken, Scope: scopeSite, probe: func(ctx context.Context, t probeTarget) error {
		_, err := t.cf.ZoneSettings(ctx, t.site.zoneID)
		return err
	}},
	{Label: "DNS", Credential: varCFReadToken, Scope: scopeSite, probe: func(ctx context.Context, t probeTarget) error {
		_, err := t.cf.DNSRecords(ctx, t.site.zoneID)
		return err
	}},
	{Label: "Email Sending", Credential: varCFReadToken, Scope: scopeSite, probe: func(ctx context.Context, t probeTarget) error {
		_, err := t.cf.EmailSendingSubdomains(ctx, t.site.zoneID)
		return err
	}},
	{Label: "Contents", Credential: varGHReadToken, Scope: scopeSite, probe: func(ctx context.Context, t probeTarget) error {
		_, err := t.gh.FileAtRef(ctx, t.site.owner, t.site.repo, "package.json", t.site.branch)
		return err
	}},
	{Label: "Metadata", Credential: varGHReadToken, Scope: scopeAccount, probe: func(ctx context.Context, t probeTarget) error {
		_, err := t.gh.TokenExpiry(ctx)
		return err
	}},
}

// observabilityProbeQuery is the one-hour window cairn auth check queries to confirm Workers
// Observability read access. cairn auth probe is a hidden alias of cairn auth check, so an
// invocation under either name runs the identical query.
func observabilityProbeQuery() map[string]any {
	now := time.Now()
	return map[string]any{
		"queryId": "cairn-auth-check",
		"timeframe": map[string]any{
			"from": now.Add(-time.Hour).UnixMilli(),
			"to":   now.UnixMilli(),
		},
		"view":       "events",
		"limit":      1,
		"parameters": map[string]any{"datasets": []string{}},
	}
}
