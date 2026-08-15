# Upgrade cairn

Move your site onto a newer `@glw907/cairn-cms` version, and confirm nothing broke.

## Precondition

Read [the stability statement](./README.md#operate-across-versions) first if you haven't: a `0.x`
minor can break a documented seam, so an upgrade is never a blind bump.

## Steps

1. **Bump the version range** in `package.json` and install:

   ```bash
   npm install @glw907/cairn-cms@latest
   ```

   or edit the version range by hand and run `npm install`.

2. **Read every `Consumers must:` line your range crossed**, not just the version you landed on.
   `CHANGELOG.md` ships in the package (`node_modules/@glw907/cairn-cms/CHANGELOG.md`, or the
   repository itself) and carries one dated section per released version, each stating what a
   consumer must do or explicitly stating nothing. A caret range admits only its own minor, so a
   site more than one minor behind crosses several of these lists in one jump, and each applies in
   order. [Migration notes](./migration-notes.md) is the running record of which recent versions
   carried a real action, if you want the short list before opening the full file.

3. **Make the changes each crossed `Consumers must:` line names.** Most are a rename, a type
   widening, or a config addition; a few are structural. Do them in the order the changelog states
   them when a version's own list is ordered, since a later rename sometimes depends on an earlier
   one already compiling.

4. **Run the doctor:**

   ```bash
   npx cairn-doctor --from editor@your-site.com --repo you/your-site
   ```

   A clean run confirms your bindings, your GitHub App, and your site config still resolve the way
   the new version expects. See [`cairn-doctor`](../reference/doctor.md) for what each check
   verifies.

5. **Typecheck and test your own site** before deploying. The doctor checks configuration and
   credentials; it does not typecheck your adapter or your custom routes against the new version's
   types.

## You know it worked when

`npm run check` (or your site's own type-check script) passes, `npx cairn-doctor` reports every
check passed or skipped, and the admin loads and saves an entry without a new error.

## If something goes wrong

A doctor failure names its own condition and remedy. A type error after the bump usually traces
directly to a `Consumers must:` line you haven't applied yet; re-read the changelog section for the
version the error's import or field name last appeared in. See [Debug your site](./debug-your-site.md)
for a runtime symptom that only shows up after deploy.
