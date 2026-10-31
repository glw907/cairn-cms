# The credential mint-and-probe run, 2026-09-19 and 2026-09-20

The evidence log that stood in `credentials.md` until the page moved to the admin track on 2026-10-31. It names the maintainer's sites, so it is a record and not a published page.


Geoff minted both tokens for his five repositories
(`glw907/ecxc-ski`, `glw907/907-life`, `glw907/aksailingclub-org`,
`glw907/xcathletes-org`, and `glw907/cairn-cms`) and stored the values
through the workstation age store, per his own deployment's rules (not
this product's storage path). `cairn auth probe` reached the following
endpoints against the live tokens, with `xcathletes-org` private and the
other four public:

| Endpoint | Status | Reason | Top-level keys |
|---|---|---|---|
| `user/tokens/verify` | 200 | ok | `errors`, `messages`, `result`, `success` (`result`: `id`, `status`) |
| `accounts/{id}/workers/scripts` | 200 | ok | `errors`, `messages`, `result`, `success` |
| `accounts/{id}/workers/domains` | 200 | ok | `errors`, `messages`, `result`, `result_info`, `success` |
| `accounts/{id}/workers/observability/telemetry/query` | 200 | ok | `errors`, `messages`, `result`, `success` (`result`: `events`, `run`, `statistics`) |
| `commits/main` (each of the four site repositories) | 200 | ok | `author`, `comments_url`, `commit`, `committer`, `files`, `html_url`, `node_id`, `parents`, `sha`, `stats`, `url` |
| `contents/package.json` (each of the four site repositories) | 200 | ok | `_links`, `content`, `download_url`, `encoding`, `git_url`, `html_url`, `name`, `path`, `sha`, `size`, `type`, `url` |
| `contents/CHANGELOG.md` (`glw907/cairn-cms`) | 200 | ok | same key set as `contents/package.json` |
| `repos` (each of the five repositories) | 200 | ok | the full GitHub repository object, including `private` and `visibility` |

`auth probe` prints these key sets itself, by names only, through a
recording `http.RoundTripper` that reads each 200 response body once,
records its top-level key names (and, for the Cloudflare v4 envelope, the
`result` field's key names, since the envelope's four keys carry
none of its shape), and hands the provider an identical fresh body; no
response body is written to a file or to this document. Every probed
repository line also reports public or private (`aksailingclub-org`,
`ecxc-ski`, `907-life`, and `cairn-cms` public; `xcathletes-org` private),
which is why this run's GitHub scope counts as confirmed rather than
merely not-rejected.

The zone-scoped Zone Settings endpoints
(`zones/{id}/settings/always_use_https`,
`zones/{id}/settings/security_header`) were verified separately, by a
direct API call against one of the operator's zones rather than
through `auth probe`: 1.0 has no `adopt` yet (Task 18), so no registry
record before this pass carries a zone id `auth probe` could target
generically. Both answered 403 before the Zone Settings group was added
to the token and 200 after, which is the evidence behind the seven-group
scope above.

**A read-level Builds group exists.** `builds/tokens`,
`builds/workers/{tag}/builds`, and `builds/workers/{tag}/triggers` all
answered 200 under Workers Builds Configuration, so Task 15's Builds half
does not degrade for this token.

**Token verification used the user path, not the account path.**
`accounts/{id}/tokens/verify` answered Cloudflare's generic error 1000 for
this user-owned token; `user/tokens/verify` answered `active`. `cairn`'s
Cloudflare client calls the user path for this reason.

### Workers Logs retention

`cairn auth probe`'s Observability query answered 200 for a one-hour
window anywhere in the trailing 7 days, and 0 events (with no error) for
the same one-hour window 8 or more days back, measured by narrowing the
boundary directly: every window fully inside 7 days returned events, and
every window at 8 days or older returned none, with no error from the API
in either case, so the boundary is observed from the data rather than
stated by Cloudflare. **This is the account plan's own retention window,
not a fixed cairn constant.** Task 17 clamps `logs --since` to **7 days**,
the last value this run confirmed still returns events; an operator on a
different Cloudflare plan reads their boundary the same way, since the
API returns no retention value directly.

### GitHub token expiry

The GitHub token minted for this verification run carries a 30-day
expiry.
