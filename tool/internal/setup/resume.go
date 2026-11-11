package setup

import (
	"context"
	"errors"
	"net/http"
	"slices"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/secrets"
)

// errGrantSpent reports a stored Cloudflare grant that no longer refreshes.
var errGrantSpent = errors.New("setup: the stored Cloudflare grant no longer works")

// refreshGrant trades the stored refresh token for a new pair and stores that pair before
// either token is used, since a refresh revokes the access token it replaces. A grant
// Cloudflare calls spent, or one the keyring no longer holds, returns errGrantSpent.
func (r *run) refreshGrant(ctx context.Context) error {
	if r.pair.Refresh == "" {
		pair, err := r.cfg.Vault.Pair()
		if errors.Is(err, secrets.ErrNotFound) {
			return errGrantSpent
		}
		if err != nil {
			return r.failure(ReasonKeyring, "Setup couldn't read its Cloudflare approval from the keyring.",
				"Unlock the keyring, and then run cairn new again.", err)
		}
		r.registerValue(pair.Access, pair.Refresh)
		r.pair = pair
	}
	tok, err := r.cfg.CloudflareOAuth.Refresh(ctx, r.pair.Refresh)
	if oe, ok := errors.AsType[*providers.OAuthError](err); ok && (oe.Code == "invalid_grant" || oe.Status == http.StatusUnauthorized) {
		return errGrantSpent
	}
	if err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	return r.keepPair(tok)
}

// freshGrant refreshes the Cloudflare grant once its access token nears the end of its hour,
// so no watch step starts on a token about to lapse.
func (r *run) freshGrant(ctx context.Context) error {
	if r.tokenRun || r.cfg.Now().Sub(r.grantAt) < grantRefresh {
		return nil
	}
	err := r.refreshGrant(ctx)
	if errors.Is(err, errGrantSpent) {
		return r.failure(ReasonGrantSpent, "Cloudflare no longer accepts setup's approval.",
			"Run cairn new again. On the Cloudflare page, turn on API Tokens Write under Sensitive scopes, and then select Authorize.", err)
	}
	return err
}

// cloudflare runs approval 1 and the account checks, or restores them on a resume. A resume
// that stopped after approval 1 and before the checks recorded the account refreshes the stored
// grant and runs the checks, so the owner is not asked again. A token run takes the supplied
// token in place of approval 1 on a new run, and needs nothing restored on a resume.
func (r *run) cloudflare(ctx context.Context) error {
	if r.tokenRun {
		r.access = r.cfg.CloudflareToken
	}
	if r.rec.Cloudflare.AccountID != "" && r.rec.Cloudflare.ZoneID != "" {
		return r.resumeCloudflare(ctx)
	}
	if r.tokenRun {
		r.useToken()
		return r.cloudflareChecks(ctx)
	}
	err := errGrantSpent
	if r.resumed && slices.Contains(r.rec.Setup.KeyringEntries, r.cfg.Vault.Entry(secrets.EntryCloudflareRefresh)) {
		err = r.refreshGrant(ctx)
	}
	if errors.Is(err, errGrantSpent) {
		state := WaitCloudflare
		if r.resumed && r.pair.Refresh != "" {
			state = WaitCloudflareReconsent
		}
		r.pair = secrets.OAuthPair{}
		err = r.approveCloudflare(ctx, state)
	}
	if err != nil {
		return err
	}
	return r.cloudflareChecks(ctx)
}

// resumeCloudflare restores approval 1 and the account checks for a resumed run. The stored
// grant is refreshed; one Cloudflare calls spent reruns approval 1 alone, under its own waiting
// state. A token run refreshes nothing. Either way the credential must still reach the recorded
// account and zone.
func (r *run) resumeCloudflare(ctx context.Context) error {
	if !r.tokenRun {
		err := r.refreshGrant(ctx)
		if errors.Is(err, errGrantSpent) {
			r.pair = secrets.OAuthPair{}
			err = r.approveCloudflare(ctx, WaitCloudflareReconsent)
		}
		if err != nil {
			return err
		}
	}
	r.step = StepCloudflareChecks
	rec := r.rec
	accounts, err := r.cfg.Cloudflare("", r.access).Accounts(ctx)
	if err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	i := slices.IndexFunc(accounts, func(a providers.Account) bool { return a.ID == rec.Cloudflare.AccountID })
	if i < 0 {
		return r.failure(ReasonAccountMissing, "The Cloudflare approval doesn't reach the account this setup began in.",
			"Run cairn new again, and on the Cloudflare page approve the same account as before.", nil)
	}
	r.account = accounts[i]
	r.cf = r.cfg.Cloudflare(r.account.ID, r.access)
	zones, err := r.cf.ActiveZones(ctx)
	if err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	j := slices.IndexFunc(zones, func(z providers.Zone) bool { return z.ID == rec.Cloudflare.ZoneID })
	if j < 0 {
		return r.failure(ReasonNoZones, "The domain "+rec.Domain+" is no longer active on your Cloudflare account.",
			"Check the domain in Cloudflare, and then run cairn new again.", nil)
	}
	r.zone, r.zoneChosen = zones[j], len(zones) > 1
	r.email, r.host = rec.Setup.OwnerEmail, rec.Setup.Address
	r.addresses, _ = addresses(r.zone.Name, r.host)
	if rec.Setup.Intents.Repo == "" {
		return r.freeNames(ctx, 0)
	}
	return nil
}
