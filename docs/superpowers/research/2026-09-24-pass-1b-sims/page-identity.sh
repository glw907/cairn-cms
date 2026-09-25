#!/usr/bin/env bash
# Compares each development-job docs page's blob between pass 1's validation
# commit (b2756399) and 3a7485dd (docs reset pass 1's merge commit on main).
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1

OLD=b2756399
NEW=3a7485dd

pages=(
CONTRIBUTING.md
docs/README.md
docs/admin/README.md
docs/admin/before-you-start.md
docs/admin/invite-editors.md
docs/admin/is-it-working.md
docs/admin/own-your-domain.md
docs/admin/setup-recovery.md
docs/admin/troubleshooting.md
docs/editors/welcome.md
docs/extend/README.md
docs/extend/add-a-custom-admin-screen.md
docs/extend/add-a-second-audience.md
docs/extend/add-cairn-to-a-sveltekit-app.md
docs/extend/build-a-site-by-hand.md
docs/extend/choose-an-ai-posture.md
docs/extend/define-an-adapter-and-schema.md
docs/extend/design-your-site.md
docs/extend/migration-notes.md
docs/extend/organize-your-admin-nav.md
docs/extend/restrict-admin-access.md
docs/extend/rotate-the-github-app-key.md
docs/extend/security-model.md
docs/extend/sign-in-through-your-organization.md
docs/extend/wire-the-delivery-surface.md
docs/reference/admin-routes.md
docs/reference/admin-toolkit.md
docs/reference/cli-cairn-doctor.md
docs/reference/cli-cairn-media-seed.md
docs/reference/cli-cairn-exit-codes.md
docs/reference/cli-cairn-json-output.md
docs/reference/cloudflare.md
docs/reference/sveltekit.md
docs/reference/schema/cairn-health.schema.json
docs/reference/schema/cairn-health-summary.schema.json
docs/reference/schema/cairn-sites-list.schema.json
docs/reference/schema/cairn-logs.schema.json
docs/reference/schema/cairn-adopt-list.schema.json
docs/reference/schema/cairn-auth-check.schema.json
docs/reference/schema/cairn-doctor.schema.json
docs/why-cairn.md
)

echo "count=${#pages[@]}"
diff_count=0
missing_count=0
for p in "${pages[@]}"; do
  old_hash=$(git rev-parse "${OLD}:${p}" 2>/dev/null)
  old_status=$?
  new_hash=$(git rev-parse "${NEW}:${p}" 2>/dev/null)
  new_status=$?
  if [ $old_status -ne 0 ] || [ $new_status -ne 0 ]; then
    echo "MISSING  $p  (old_status=$old_status new_status=$new_status)"
    missing_count=$((missing_count+1))
    continue
  fi
  if [ "$old_hash" != "$new_hash" ]; then
    echo "DIFF     $p  old=$old_hash new=$new_hash"
    diff_count=$((diff_count+1))
  fi
done
echo "diffs=$diff_count missing=$missing_count same=$(( ${#pages[@]} - diff_count - missing_count ))"
