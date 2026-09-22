package main

// permissionScope classifies what confirming one of cairn auth check's permissions needs beyond
// the three credentials themselves. An account-scoped permission is confirmed with credentials
// alone; a site-scoped one additionally needs a registered site's own zone or repository, which
// cairn auth check reads from the registry only when the operator names a site.
type permissionScope int

const (
	// scopeAccount permissions are confirmed against the account or the token itself, with no
	// site named.
	scopeAccount permissionScope = iota
	// scopeSite permissions need a site's own zone id or repository, and are skipped when the
	// operator names none.
	scopeSite
)

// permission is one row of cairn auth check's permission table: the label the provider's own
// token page uses, the credential variable it belongs to, and the scope confirming it needs.
//
// This is the single source both the command's rows and tool/docs/credentials.md's "Token
// scopes" section read from. Label is a provider-defined name, not prose this package drafts, so
// it carries no entry in messages.go's operator-copy catalogue; permissions_test.go fails when
// this table and the doc's own list of labels disagree.
type permission struct {
	Label      string
	Credential string
	Scope      permissionScope
}

// permissionTable is cairn auth check's fixed set of nine permissions: the seven Cloudflare
// dashboard-named groups tool/docs/credentials.md's "Cloudflare" list names, and GitHub's
// Contents and Metadata.
var permissionTable = []permission{
	{Label: "Workers Scripts", Credential: varCFReadToken, Scope: scopeAccount},
	{Label: "Workers Builds Configuration", Credential: varCFReadToken, Scope: scopeAccount},
	{Label: "Workers Observability", Credential: varCFReadToken, Scope: scopeAccount},
	{Label: "Zone", Credential: varCFReadToken, Scope: scopeAccount},
	{Label: "Zone Settings", Credential: varCFReadToken, Scope: scopeSite},
	{Label: "DNS", Credential: varCFReadToken, Scope: scopeSite},
	{Label: "Email Sending", Credential: varCFReadToken, Scope: scopeSite},
	{Label: "Contents", Credential: varGHReadToken, Scope: scopeSite},
	{Label: "Metadata", Credential: varGHReadToken, Scope: scopeAccount},
}
