# Rotate the GitHub App private key

One Worker secret, `GITHUB_APP_PRIVATE_KEY_B64`, is what every save and publish signs with. [Set
up the GitHub App](./set-up-the-github-app.md) covers generating it once; this one covers
replacing it without a gap in the App's ability to authenticate. Rotate it on a schedule
you're comfortable with, or the moment you suspect the `.pem` or its base64 form leaked, such as an
accidental commit or an offboarded teammate who once held a copy.

## Before you begin

- Owner access on the account or organization that owns the App, the same access [creating
  it](./set-up-the-github-app.md#create-the-app) required.
- `wrangler` authenticated against the Worker that holds the secret.
- A shell to run `npx cairn-doctor` from, the same one you'd run it from for any other check.

## Generate the new key

1. Go to the App's own settings page and scroll to **Private keys**.
2. Choose **Generate a private key**. GitHub does not revoke the key you're currently running on
   when you do this; an App holds however many keys you've generated until you delete one
   yourself. That's what makes this rotation safe: nothing about the App's ability to sign a
   request changes until you delete a key. That deletion is the final step, below.
3. GitHub downloads a new `.pem`. Leave this settings page open, or note the fingerprint next to
   your current key, so you can find the right one to delete later once two are listed side by
   side.

## Push it to your Worker

Convert the new `.pem` to the single-line base64 string the Worker secret takes, the same
conversion [Store the private key](./set-up-the-github-app.md#store-the-private-key) walks the
first time:

```sh
base64 -w0 your-new-key.pem
```

Paste the result into wrangler:

```sh
npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
```

This replaces the secret directly; you don't need to run `wrangler deploy` afterward for the new
value to take effect. If you also run this site with `wrangler dev`, update the same line in
`.dev.vars`, since local dev reads that file instead of asking Cloudflare for the secret:

```
GITHUB_APP_PRIVATE_KEY_B64=<the new base64 string>
```

Keep the new `.pem` (or its base64 string) somewhere until the next section passes. If the new key
turns out to be bad, that's what you'll use to tell.

## Verify before you retire the old key

Confirm the new key signs before you go near the old one. `cairn-doctor` walks the same chain a save
walks: the key parses and signs, the signature exchanges for an installation token, and the token
reads your repository. `GITHUB_APP_ID` and `GITHUB_APP_INSTALLATION_ID` haven't changed, only the
key has:

```sh
npx cairn-doctor --repo you/your-site
```

with `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, and the new `GITHUB_APP_PRIVATE_KEY_B64` in the
environment. If the site is already deployed, hit its `/healthz` endpoint too; a JSON body whose
top-level `ok` is `true` runs the same signing self-test against the value you just pushed, live.
Past a green doctor run and a green `/healthz`, sign in to `/admin` and save something. The
resulting commit's committer is still the App, `[bot]` suffix and all, which only the new key
could have produced.

## Retire the old key

Once verification passes, go back to the App's **Private keys** section and delete the key whose
fingerprint you noted earlier. This is the step that invalidates the old key, which is why it
comes last.

## If verification fails

Nothing is broken on GitHub's side yet: you haven't deleted the old key, so it's still installed
and still valid. If you kept the old key's base64 string, paste it back with `npx wrangler secret
put GITHUB_APP_PRIVATE_KEY_B64` to restore the working state while you debug. Either way, the
doctor's stage-by-stage output names whether the failure is the key parse, the token mint, or the
repo read. If you didn't keep the old value, generate another new key and repeat the push and
verify steps; nothing is deleted until the final step.

## What's next

[The security model](../explanation/security-model.md) explains why the App holds write access at
all and what a save is and isn't allowed to do with it. [Troubleshooting](./troubleshooting.md)
covers the symptom on the other side of a bad key, a save or publish that fails outright, and the
log event ([Log events](../reference/log-events.md)) that names why.
