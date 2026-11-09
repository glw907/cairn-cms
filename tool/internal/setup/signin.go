package setup

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
)

// tokenTTL is how long a sign-in link lives, the engine's TOKEN_TTL_MS (src/lib/auth/crypto.ts).
const tokenTTL = 10 * time.Minute

// signInPoll spaces the reads that watch for the tab's link to be used.
const signInPoll = 5 * time.Second

// The sign-in batch, as one D1 transaction: the wizard's three statements
// (packages/create-cairn-site/src/cloudflare/bootstrap.mjs) with the engine's issueToken sweep
// (src/lib/auth/store.ts). The owner row is written only into an empty editor table, and the
// token row only for an address the table holds. The token row carries no nonce_hash, so it is
// unbound and any browser can confirm it, the path the engine keeps for a hand-seeded row.
const (
	sqlInsertOwner = "INSERT INTO editor (email, display_name, role, created_at) SELECT ?, ?, 'owner', ? WHERE NOT EXISTS (SELECT 1 FROM editor)"
	sqlSweepTokens = "DELETE FROM magic_token WHERE email = ? OR expires_at <= ?"
	sqlInsertToken = "INSERT INTO magic_token (token_hash, email, expires_at, created_at) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM editor WHERE email = ?)"
	sqlTokenLive   = "SELECT token_hash FROM magic_token WHERE token_hash = ?"
)

// The engine deletes a consumed row, and its issueToken deletes a live one when the owner asks
// the sign-in page for a link, so a gone row alone does not show a sign-in. The confirm writes
// a session for the email right after the consume (src/lib/sveltekit/auth-routes.ts), and that
// session is the proof. Both reads compare D1's own created_at values, never this computer's
// clock.
const (
	sqlLatestSession = "SELECT MAX(created_at) AS latest FROM session WHERE email = ?"
	sqlNewSession    = "SELECT 1 AS one FROM session WHERE email = ? AND created_at > ?"
)

// newToken draws a sign-in token the way the engine's generateToken does: 32 random bytes in
// unpadded base64url.
func newToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// hashToken is the engine's hashToken: the lowercase hex SHA-256 of the token string, the only
// form the magic_token table stores.
func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// signInBatch is the batch that seeds the owner and one unbound link for email, which must be
// normalized already.
func signInBatch(email, tokenHash string, now time.Time) []providers.D1Statement {
	ms, expires := now.UnixMilli(), now.Add(tokenTTL).UnixMilli()
	name := email[:strings.Index(email, "@")]
	return []providers.D1Statement{
		{SQL: sqlInsertOwner, Params: []any{email, name, ms}},
		{SQL: sqlSweepTokens, Params: []any{email, ms}},
		{SQL: sqlInsertToken, Params: []any{tokenHash, email, expires, ms, email}},
	}
}

// issued is one sign-in link setup wrote.
type issued struct {
	url     string
	hash    string
	expires time.Time
}

// issueLink writes one sign-in row and returns its link. ok is false when the editor table holds
// other editors and not the owner's address, so no row was written.
func (r *run) issueLink(ctx context.Context) (link issued, ok bool, err error) {
	token, err := newToken()
	if err != nil {
		return issued{}, false, err
	}
	link = issued{
		url:     "https://" + r.host + "/admin/auth/confirm?token=" + url.QueryEscape(token),
		hash:    hashToken(token),
		expires: r.cfg.Now().Add(tokenTTL),
	}
	r.registerValue(token, link.url)
	res, err := r.cf.D1Query(ctx, r.rec.Setup.IDs.D1, signInBatch(r.ownerKey(), link.hash, r.cfg.Now()))
	if err != nil {
		return issued{}, false, r.fail(ctx, err, "Cloudflare")
	}
	return link, len(res) == 3 && res[2].Meta.Changes == 1, nil
}

// signIn is watch step 8. With the setup tab open in this run, the tab moves to a sign-in link
// through its one /next answer, and the step watches until a D1 read shows the owner signed in
// from it or it expires. Then, or at once when no tab shows the site, setup writes a second unbound row and
// emails its link to the owner.
func (r *run) signIn(ctx context.Context) error {
	if r.opened && !r.cfg.Apply {
		link, ok, err := r.issueLink(ctx)
		if err != nil {
			return err
		}
		if !ok {
			r.out.NoSignIn = true
			return nil
		}
		since, err := r.latestSession(ctx)
		if err != nil {
			return err
		}
		if err := r.tab.SetNext(link.url); err != nil {
			return err
		}
		used, err := r.watchLink(ctx, link, since)
		if err != nil {
			return err
		}
		r.out.SignedIn = used
	}
	link, ok, err := r.issueLink(ctx)
	if err != nil {
		return err
	}
	if !ok {
		r.out.NoSignIn = true
		return nil
	}
	r.out.Emailed = r.sendLink(ctx, link) == nil
	return nil
}

// ownerKey is the owner's email as the editor and session tables store it.
func (r *run) ownerKey() string { return strings.ToLower(strings.TrimSpace(r.email)) }

// latestSession reads the created_at of the owner's newest session, 0 when there is none.
func (r *run) latestSession(ctx context.Context) (int64, error) {
	res, err := r.cf.D1Query(ctx, r.rec.Setup.IDs.D1, []providers.D1Statement{{SQL: sqlLatestSession, Params: []any{r.ownerKey()}}})
	if err != nil {
		return 0, r.fail(ctx, err, "Cloudflare")
	}
	var row struct {
		Latest *int64 `json:"latest"`
	}
	if len(res) == 1 && len(res[0].Results) == 1 {
		if err := json.Unmarshal(res[0].Results[0], &row); err != nil {
			return 0, r.fail(ctx, err, "Cloudflare")
		}
	}
	if row.Latest == nil {
		return 0, nil
	}
	return *row.Latest, nil
}

// watchLink watches the link until a session for the owner newer than since shows it used, or
// until it expires. A row gone with no new session on two reads running was swept by a request
// on the sign-in page, not used; the second read covers the moment between the engine's
// consume and its session write.
func (r *run) watchLink(ctx context.Context, link issued, since int64) (used bool, err error) {
	gone := false
	for r.cfg.Now().Before(link.expires) {
		res, err := r.cf.D1Query(ctx, r.rec.Setup.IDs.D1, []providers.D1Statement{
			{SQL: sqlTokenLive, Params: []any{link.hash}},
			{SQL: sqlNewSession, Params: []any{r.ownerKey(), since}},
		})
		if err != nil {
			return false, r.fail(ctx, err, "Cloudflare")
		}
		if len(res) != 2 {
			return false, r.fail(ctx, errors.New("setup: the sign-in read returned "+strconv.Itoa(len(res))+" results, want 2"), "Cloudflare")
		}
		if len(res[1].Results) > 0 {
			return true, nil
		}
		if len(res[0].Results) == 0 {
			if gone {
				return false, nil
			}
			gone = true
		}
		if err := r.pause(ctx, signInPoll); err != nil {
			return false, err
		}
	}
	return false, nil
}

// sendLink emails link to the owner through Cloudflare Email Sending, from the site's own
// sender. A failed send is a line on the done screen, since the sign-in page sends another.
func (r *run) sendLink(ctx context.Context, link issued) error {
	name := r.cfg.Answers.SiteName
	_, err := r.cf.SendEmail(ctx, providers.EmailMessage{
		From:    senderFor(r.host),
		To:      r.email,
		Subject: "Sign in to " + name,
		Text: "Your site " + name + " is live at https://" + r.host + ".\n\n" +
			"Use this link to sign in to the admin:\n\n" + link.url + "\n\n" +
			"The link works once, for 10 minutes. If it has expired, request a new link on the sign-in page: https://" + r.host + "/admin/login\n",
	})
	return err
}
