#!/usr/bin/env bash
# Kit 3 packed-tarball harness. Usage:
#   HARNESS_PORT=<free port> harness.sh <engine.tgz> <dev.tgz> <scratch-root> [--mode spike|consumer]
#
# spike    : S0 items 1 and 2 against the probe tarballs (cloudflare:workers read, building gate,
#            withEnv from the dev package), under vite dev and under vite build plus wrangler dev.
# consumer : the close's consumer proof against the final tarballs: npm install exit 0 with no flags,
#            the documented wiring and wrangler types, svelte-check 0/0, vite build exit 0,
#            wrangler dev answering GET /admin/login with 200 and cairn's login form marker.
#
# Writes only under <scratch-root> (refuses a path inside the repo or under /tmp). Starts one server
# at a time on $HARNESS_PORT (never 4173 or 4392) and stops it on exit. Prints one RESULT line per
# check: item, mode, command, exit code, echoed value or error. Exit 0 only if every check passed.
set -uo pipefail

usage() { echo "usage: HARNESS_PORT=<port> $0 <engine.tgz> <dev.tgz> <scratch-root> [--mode spike|consumer]" >&2; exit 2; }
[ $# -ge 3 ] || usage
ENGINE=$(realpath "$1"); DEV=$(realpath "$2"); ROOT_IN=$3; shift 3
MODE=spike
while [ $# -gt 0 ]; do
  case "$1" in
    --mode) MODE=${2:-}; shift 2 ;;
    *) usage ;;
  esac
done
case "$MODE" in spike|consumer) ;; *) usage ;; esac
[ -f "$ENGINE" ] && [ -f "$DEV" ] || { echo "tarball missing" >&2; exit 2; }
PORT=${HARNESS_PORT:?set HARNESS_PORT to a free port other than 4173 and 4392}
case "$PORT" in 4173|4392) echo "port $PORT is reserved" >&2; exit 2 ;; esac
if ss -ltn "sport = :$PORT" | grep -q LISTEN; then echo "port $PORT is busy" >&2; exit 2; fi
INSPECT=$((PORT + 1))
if ss -ltn "sport = :$INSPECT" | grep -q LISTEN; then echo "inspector port $INSPECT is busy" >&2; exit 2; fi

mkdir -p "$ROOT_IN"; ROOT=$(realpath "$ROOT_IN")
SELF_REPO=$(git -C "$(dirname "$(realpath "$0")")" rev-parse --show-toplevel 2>/dev/null || true)
case "$ROOT" in /tmp|/tmp/*) echo "scratch root must not be under /tmp" >&2; exit 2 ;; esac
if [ -n "$SELF_REPO" ]; then case "$ROOT/" in "$SELF_REPO"/*) echo "scratch root must not be inside the repo" >&2; exit 2 ;; esac; fi
export TMPDIR=${TMPDIR:-$HOME/.cache/cairn-tmp}; mkdir -p "$TMPDIR"
export WRANGLER_SEND_METRICS=false CI=1 NO_COLOR=1 FORCE_COLOR=0

WORK="$ROOT/$MODE"; APP="$WORK/app"; LOGS="$WORK/logs"
rm -rf "$WORK"; mkdir -p "$LOGS"
FAILS=0; BASE="http://127.0.0.1:$PORT"

result() { # item status cmd exit value
  local item=$1 status=$2 cmd=$3 code=$4 value=$5
  value=$(printf '%s' "$value" | tr '\n' ' ' | cut -c1-600)
  echo "RESULT item=$item mode=$MODE status=$status exit=$code cmd=[$cmd] value=[$value]"
  [ "$status" = PASS ] || FAILS=$((FAILS + 1))
}

SERVER_PID=""
stop_server() {
  [ -n "$SERVER_PID" ] || return 0
  kill -TERM -- "-$SERVER_PID" 2>/dev/null; sleep 2; kill -KILL -- "-$SERVER_PID" 2>/dev/null
  wait "$SERVER_PID" 2>/dev/null; SERVER_PID=""
  for _ in 1 2 3 4 5; do ss -ltn "sport = :$PORT" | grep -q LISTEN || break; sleep 1; done
  ss -ltn "sport = :$PORT" | grep -q LISTEN && echo "WARNING: port $PORT still listening after stop"
}
trap stop_server EXIT

start_server() { # name cmd...
  local name=$1; shift
  ( cd "$APP" && exec setsid "$@" ) >"$LOGS/$name.log" 2>&1 &
  SERVER_PID=$!
  local code
  for _ in $(seq 1 120); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$BASE/" 2>/dev/null)
    [ "$code" != 000 ] && return 0
    kill -0 "$SERVER_PID" 2>/dev/null || { echo "server $name exited early; see $LOGS/$name.log"; return 1; }
    sleep 2
  done
  echo "server $name never answered; see $LOGS/$name.log"; return 1
}

fetch() { # path ; sets F_RC (curl exit), F_CODE (http status), F_BODY, F_CMD
  F_CODE=$(curl -s --max-time 60 -o "$LOGS/fetch.body" -w '%{http_code}' "$BASE$1"); F_RC=$?
  F_BODY=$(cat "$LOGS/fetch.body"); F_CMD="curl -s $BASE$1"
}

run() { # logname cmd... ; runs in $APP, sets RC
  local name=$1; shift
  ( cd "$APP" && "$@" ) >"$LOGS/$name.log" 2>&1; RC=$?
}

# ---- project ----
echo "== creating the Kit 3 project: npx sv@latest create (minimal, TypeScript, adapter-cloudflare)"
mkdir -p "$WORK"
( cd "$WORK" && npx --yes sv@latest create app --template minimal --types ts \
    --add sveltekit-adapter=adapter:cloudflare+cfTarget:workers --no-install --no-dir-check ) >"$LOGS/sv-create.log" 2>&1
[ -f "$APP/package.json" ] || { echo "sv create failed; see $LOGS/sv-create.log"; exit 1; }
echo "sv version: $(npx --yes sv@latest --version 2>/dev/null | tail -1)"

INSTALL_CMD="npm install $(basename "$ENGINE") $(basename "$DEV")"
run npm-install npm install "$ENGINE" "$DEV"
if [ $RC -eq 0 ]; then st=PASS; else st=FAIL; fi
result install "$st" "$INSTALL_CMD (no flags)" $RC "$(grep -E 'ERESOLVE|ERR!|peer|added|up to date' "$LOGS/npm-install.log" | head -3)"
[ $RC -eq 0 ] || exit 1
echo "installed: kit $(node -p "require('$APP/node_modules/@sveltejs/kit/package.json').version") adapter-cloudflare $(node -p "require('$APP/node_modules/@sveltejs/adapter-cloudflare/package.json').version") wrangler $(node -p "require('$APP/node_modules/wrangler/package.json').version")"

patch_wrangler() { # node expression body mutating the parsed config `c`
  ( cd "$APP" && node -e "
const fs=require('fs');const c=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
$1
fs.writeFileSync('wrangler.jsonc',JSON.stringify(c,null,'\t')+'\n');" )
}

# ======================= spike mode =======================
if [ "$MODE" = spike ]; then
  patch_wrangler "c.vars={MY_VAR:'from-wrangler'};"
  mkdir -p "$APP/src/routes/env" "$APP/src/routes/about" "$APP/src/routes/wi" "$APP/src/routes/wi-stream" "$APP/src/routes/wi-load"
  cat >"$APP/src/hooks.server.ts" <<'EOF'
import { sequence } from '@sveltejs/kit/hooks';
import { probeHandle } from '@glw907/cairn-cms/sveltekit';
import { probeWithEnvHandle } from '@glw907/cairn-cms-dev';
export const handle = sequence(probeWithEnvHandle(), probeHandle);
EOF
  cat >"$APP/hooks.ungated.ts" <<'EOF'
import { sequence } from '@sveltejs/kit/hooks';
import { probeHandleUngated } from '@glw907/cairn-cms/sveltekit';
import { probeWithEnvHandle } from '@glw907/cairn-cms-dev';
export const handle = sequence(probeWithEnvHandle(), probeHandleUngated);
EOF
  cat >"$APP/src/routes/env/+server.js" <<'EOF'
import { env } from 'cloudflare:workers';
import { probeRead } from '@glw907/cairn-cms/sveltekit';
export async function GET({ locals }) {
  await new Promise((r) => setTimeout(r, 5));
  return new Response(JSON.stringify({ engine: probeRead('MY_VAR'), site: env.MY_VAR, viaHandle: locals.probe }));
}
EOF
  printf '%s\n' 'export const prerender = true;' >"$APP/src/routes/about/+page.js"
  printf '%s\n' '<h1>about</h1>' >"$APP/src/routes/about/+page.svelte"
  cat >"$APP/src/routes/wi/+server.js" <<'EOF'
import { env } from 'cloudflare:workers';
import { probeRead } from '@glw907/cairn-cms/sveltekit';
export async function GET() {
  await new Promise((r) => setTimeout(r, 5));
  const engine = probeRead('CAIRN_PROBE');
  await new Promise((r) => setTimeout(r, 5));
  return new Response(JSON.stringify({ engine, site: env.CAIRN_PROBE }));
}
EOF
  cat >"$APP/src/routes/wi-stream/+server.js" <<'EOF'
import { env } from 'cloudflare:workers';
import { probeRead } from '@glw907/cairn-cms/sveltekit';
export function GET() {
  const enc = new TextEncoder();
  let n = 0;
  const stream = new ReadableStream({
    async pull(controller) {
      await new Promise((r) => setTimeout(r, 15));
      const part = n++ === 0 ? `engine=${probeRead('CAIRN_PROBE')}\n` : `site=${env.CAIRN_PROBE}\n`;
      controller.enqueue(enc.encode(part));
      if (n === 2) controller.close();
    }
  });
  return new Response(stream);
}
EOF
  cat >"$APP/src/routes/wi-load/+page.server.js" <<'EOF'
import { env } from 'cloudflare:workers';
import { probeRead } from '@glw907/cairn-cms/sveltekit';
export const load = async () => ({
  slow: (async () => {
    await new Promise((r) => setTimeout(r, 25));
    return { engine: probeRead('CAIRN_PROBE'), site: env.CAIRN_PROBE };
  })()
});
EOF
  cat >"$APP/src/routes/wi-load/+page.svelte" <<'EOF'
<script>let { data } = $props();</script>
{#await data.slow}<p>pending</p>{:then v}<p id="v">{v.engine}|{v.site}</p>{/await}
EOF
  run gen npm run gen
  [ $RC -eq 0 ] || { echo "wrangler types failed; see $LOGS/gen.log"; exit 1; }

  check_env() { # mode label  -> item 1 echo
    fetch /env
    if [ "$F_RC" = 0 ] && [ "$F_CODE" = 200 ] && [ "$F_BODY" = '{"engine":"from-wrangler","site":"from-wrangler","viaHandle":"from-wrangler"}' ]; then st=PASS; else st=FAIL; fi
    result "1-echo-$1" "$st" "$F_CMD" "$F_RC" "http=$F_CODE $F_BODY"
  }
  check_wi() { # label -> item 2
    local v
    fetch /wi
    [ "$F_RC" = 0 ] && [ "$F_CODE" = 200 ] && [ "$F_BODY" = '{"engine":"from-dev-handle","site":"from-dev-handle"}' ] && st=PASS || st=FAIL
    result "2-await-$1" "$st" "$F_CMD (reads across two awaits)" "$F_RC" "http=$F_CODE $F_BODY"
    fetch /wi-stream
    [ "$F_RC" = 0 ] && [ "$F_CODE" = 200 ] && [ "$F_BODY" = $'engine=from-dev-handle\nsite=from-dev-handle' ] && st=PASS || st=FAIL
    result "2-stream-$1" "$st" "$F_CMD (ReadableStream pull, reads after a delay)" "$F_RC" "http=$F_CODE ${F_BODY//$'\n'/ ; }"
    fetch /wi-load
    v=$(printf '%s' "$F_BODY" | grep -o 'engine:"from-dev-handle",site:"from-dev-handle"\|"engine":"from-dev-handle","site":"from-dev-handle"\|from-dev-handle|from-dev-handle' | head -1)
    [ "$F_RC" = 0 ] && [ "$F_CODE" = 200 ] && [ -n "$v" ] && st=PASS || st=FAIL
    result "2-streamed-load-$1" "$st" "$F_CMD (promise returned from load, resolved after an await)" "$F_RC" "http=$F_CODE ${v:-no marker; tail: $(printf '%s' "$F_BODY" | tail -c 300)}"
  }

  # Item 1 negative control: the ungated handle must fail the prerender build with Kit's own message.
  cp "$APP/src/hooks.server.ts" "$APP/hooks.gated.ts"; cp "$APP/hooks.ungated.ts" "$APP/src/hooks.server.ts"
  run build-ungated npm run build
  if [ $RC -ne 0 ] && grep -q 'Cannot access cloudflare:workers in a prerenderable route' "$LOGS/build-ungated.log"; then st=PASS; else st=FAIL; fi
  result 1-prerender-control "$st" "npm run build (hooks without the building gate; expected to fail)" $RC "$(grep -m1 'Cannot access cloudflare:workers' "$LOGS/build-ungated.log")"
  cp "$APP/hooks.gated.ts" "$APP/src/hooks.server.ts"

  # Item 1 and 2 under vite dev.
  echo "== vite dev"
  if start_server vite-dev npx vite dev --port "$PORT" --strictPort --host 127.0.0.1; then
    check_env vite-dev; check_wi vite-dev
  else
    result 1-echo-vite-dev FAIL "npx vite dev --port $PORT" 1 "server did not start: $(tail -5 "$LOGS/vite-dev.log")"
  fi
  stop_server

  # Item 1 and 2 under vite build plus wrangler dev; the prerendered route.
  echo "== vite build + wrangler dev"
  run build npm run build
  if [ $RC -eq 0 ] && [ -f "$APP/.svelte-kit/output/prerendered/pages/about.html" ]; then st=PASS; else st=FAIL; fi
  result 1-prerender-build "$st" "npm run build (gated probe handle, prerendered /about)" $RC "prerendered about.html: $([ -f "$APP/.svelte-kit/output/prerendered/pages/about.html" ] && echo present || echo missing); $(grep -c 'Cannot access cloudflare:workers' "$LOGS/build.log") env-trap errors"
  if [ $RC -eq 0 ] && start_server wrangler-dev npx wrangler dev .svelte-kit/cloudflare/_worker.js --port "$PORT" --ip 127.0.0.1 --inspector-port "$INSPECT"; then
    check_env wrangler-dev; check_wi wrangler-dev
    fetch /about
    [ "$F_RC" = 0 ] && [ "$F_CODE" = 200 ] && printf '%s' "$F_BODY" | grep -q '<h1>about</h1>' && st=PASS || st=FAIL
    result 1-prerender-served "$st" "$F_CMD" "$F_RC" "http=$F_CODE $(printf '%s' "$F_BODY" | grep -o '<h1>about</h1>' | head -1)"
  else
    result 1-echo-wrangler-dev FAIL "npx wrangler dev .svelte-kit/cloudflare/_worker.js --port $PORT" "$RC" "not run or did not start: $(tail -5 "$LOGS/wrangler-dev.log" 2>/dev/null)"
  fi
  stop_server
fi

# ======================= consumer mode =======================
if [ "$MODE" = consumer ]; then
  patch_wrangler "
c.d1_databases=[{binding:'AUTH_DB',database_name:'consumer-auth',database_id:'00000000-0000-0000-0000-000000000000'}];
c.send_email=[{name:'EMAIL'}];
c.vars={PUBLIC_ORIGIN:'http://127.0.0.1:$PORT'};"
  mkdir -p "$APP/src/lib/server" "$APP/src/routes/admin/[...path]"
  # The documented wiring, minimal: one runtime, the guard, the admin shell mount, the catch-all view.
  sed -i "1i import '@glw907/cairn-cms/ambient';" "$APP/src/app.d.ts"
  cat >"$APP/src/lib/cairn.config.ts" <<'EOF'
import {
  createRenderer, defineAdapter, defineConcept, defineFieldset, defineRegistry, createGithubApp, fields,
  parseSiteConfig
} from '@glw907/cairn-cms';

const registry = defineRegistry({ components: [] });
const { renderMarkdown } = createRenderer(registry);
export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts', label: 'Posts', singular: 'post', routing: 'feed',
      fields: defineFieldset({ title: fields.text({ label: 'Title', required: true }) })
    })
  },
  backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'cms@example.test' },
  rendering: { render: ({ body, resolve }) => renderMarkdown(body, { resolve }), components: registry, icons: {} },
  editor: { preview: { stylesheets: [] } }
});
export const siteConfig = parseSiteConfig('siteName: Consumer\ndescription: Harness site.\nmenus:\n  primary: []\n');
EOF
  cat >"$APP/src/lib/server/cairn.ts" <<'EOF'
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from '../cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });
export const admin = createCairnAdmin({ runtime });
EOF
  cat >"$APP/src/hooks.server.ts" <<'EOF'
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
export const handle = createAuthGuard({});
EOF
  cat >"$APP/src/routes/admin/+layout.server.ts" <<'EOF'
import { admin } from '../../lib/server/cairn.js';
export const load = admin.shellLoad;
EOF
  cat >"$APP/src/routes/admin/+layout.svelte" <<'EOF'
<script lang="ts">
  import { CairnAdminShell } from '@glw907/cairn-cms/admin';
  import type { AdminShellData } from '@glw907/cairn-cms/sveltekit';
  import type { Snippet } from 'svelte';
  let { data, children }: { data: { shell: AdminShellData }; children: Snippet } = $props();
</script>
<CairnAdminShell data={data.shell}>{@render children()}</CairnAdminShell>
EOF
  cat >"$APP/src/routes/admin/[...path]/+page.server.ts" <<'EOF'
import { admin } from '../../../lib/server/cairn.js';
export const prerender = false;
export const load = admin.load;
export const actions = admin.actions;
EOF
  cat >"$APP/src/routes/admin/[...path]/+page.svelte" <<'EOF'
<script lang="ts">
  import { CairnAdmin } from '@glw907/cairn-cms/admin';
  import type { AdminData } from '@glw907/cairn-cms/sveltekit';
  import { cairn } from '../../../lib/cairn.config.js';
  import type { ActionData } from './$types';
  let { data, form }: { data: AdminData; form: ActionData } = $props();
</script>
<CairnAdmin {data} {form} render={cairn.rendering.render} registry={cairn.rendering.components} icons={cairn.rendering.icons} />
EOF
  run gen npm run gen
  if [ $RC -eq 0 ]; then st=PASS; else st=FAIL; fi
  result wrangler-types "$st" "npm run gen (wrangler types)" $RC "$(tail -3 "$LOGS/gen.log")"

  run check npm run check
  summary=$(grep -E 'svelte-check found|COMPLETED' "$LOGS/check.log" | tail -1)
  if [ $RC -eq 0 ] && printf '%s' "$summary" | grep -Eq 'found 0 errors and 0 warnings|[0-9]+ FILES 0 ERRORS 0 WARNINGS'; then st=PASS; else st=FAIL; fi
  result svelte-check "$st" "npm run check (wrangler types --check && svelte-kit sync && svelte-check)" $RC "${summary:-$(tail -5 "$LOGS/check.log")}"

  run build npm run build
  if [ $RC -eq 0 ]; then st=PASS; else st=FAIL; fi
  result vite-build "$st" "npm run build (wrangler types --check && vite build)" $RC "$(tail -3 "$LOGS/build.log")"

  if [ $RC -eq 0 ] && start_server wrangler-dev npx wrangler dev .svelte-kit/cloudflare/_worker.js --port "$PORT" --ip 127.0.0.1 --inspector-port "$INSPECT"; then
    fetch /admin/login
    if [ "$F_RC" = 0 ] && [ "$F_CODE" = 200 ] && printf '%s' "$F_BODY" | grep -q 'name="email"'; then st=PASS; else st=FAIL; fi
    result login "$st" "$F_CMD (wrangler dev on the build output)" "$F_RC" "http=$F_CODE marker name=\"email\" lines: $(printf '%s' "$F_BODY" | grep -c 'name="email"'); head: $(printf '%s' "$F_BODY" | head -c 200)"
  else
    result login FAIL "npx wrangler dev .svelte-kit/cloudflare/_worker.js --port $PORT" "$RC" "not run or did not start: $(tail -5 "$LOGS/wrangler-dev.log" 2>/dev/null)"
  fi
  stop_server
fi

echo "== done: mode=$MODE failures=$FAILS logs=$LOGS"
[ "$FAILS" -eq 0 ]
