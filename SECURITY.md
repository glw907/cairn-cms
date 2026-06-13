# Security policy

## Supported versions

cairn-cms is `0.x`. Only the latest published minor version receives security fixes. Pin a
caret range and upgrade when a new minor lands. There is no backport branch.

## Reporting a vulnerability

Report privately through GitHub's private vulnerability reporting. Open the repository's
**Security** tab and choose **Report a vulnerability**. That opens a private advisory the
maintainer can see. Please do not file a public issue for a suspected vulnerability.

While the repository stays private, GitHub does not offer private vulnerability reporting, so the
Security-tab flow above is not yet available. Until the repository goes public and that flow turns
on, report privately by email to the maintainer at geoff-login@907.life with the same details.

Include the affected version, a description, and a reproduction if you have one. Expect an
acknowledgement within a few days.

## Security posture

cairn-cms owns its editor authentication. A magic-link login issues an atomic single-use
token, confirms it over POST, and stores opaque session rows in Cloudflare D1. Sessions ride a
`__Host-` cookie over HTTPS. Editor access is an allowlist with two roles, `owner` and
`editor`, and an anti-lockout rule keeps at least one owner in place.

The render path applies a rehype-sanitize floor by default. Author markdown cannot inject raw
HTML or a `javascript:` URL unless a site explicitly opts out. See
[`docs/explanation/security-model.md`](./docs/explanation/security-model.md) for the auth,
commit, and render security model, and [`docs/explanation/data-tiers.md`](./docs/explanation/data-tiers.md)
for where auth state lives.
