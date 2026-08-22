// Credential-free pre-flight checks. These run before any prompt or scaffold action, so a
// broken machine surfaces its problem before the tool asks for anything. Every check is
// injectable (nodeVersion, platform) so the test suite can drive machine states this process
// itself is not in; the checks that read the environment directly (proxy) are exercised by
// setting and restoring the real env vars around a test instead.
//
// git is deliberately absent from this list. The tool commits and pushes through the GitHub
// App API in a later pass, never a local git binary, so neither a git install nor a configured
// user.email identity is a failure mode here.
import { readFile } from 'node:fs/promises';
import net from 'node:net';

/**
 * @typedef {object} Finding
 * @property {string} check the check's stable name, e.g. `'node'`
 * @property {boolean} ok whether the check passed; `true` for informational checks
 * @property {string} remedy non-empty guidance, what to do on failure or what the finding means
 */

/**
 * Parse the leading `major.minor.patch` numbers out of a version string or range, defaulting
 * missing parts to zero. Tolerant of a range prefix (`>=24`) since the same parser reads both
 * a concrete `process.versions.node` string and the package's `engines.node` floor.
 * @param {string} version the version string or range to parse
 * @returns {[number, number, number]} the major, minor, and patch numbers
 */
function parseVersionParts(version) {
  const match = /(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(version);
  if (!match) {
    throw new Error(`preflight: could not parse a version from "${version}"`);
  }
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

/**
 * Compare two version strings numerically by major, minor, then patch. A plain string
 * comparison is the classic trap here: `'9.0.0' >= '22.0.0'` is true as strings (the character
 * `'9'` sorts after `'2'`) and false as versions, so every comparison in this module goes
 * through this function rather than a bare `>=`.
 * @param {string} a the left-hand version
 * @param {string} b the right-hand version
 * @returns {number} negative when `a` is lower than `b`, positive when higher, zero when equal
 */
function compareVersions(a, b) {
  const partsA = parseVersionParts(a);
  const partsB = parseVersionParts(b);
  for (let i = 0; i < 3; i += 1) {
    if (partsA[i] !== partsB[i]) return partsA[i] - partsB[i];
  }
  return 0;
}

/**
 * Check the running Node version against the floor this package itself declares in
 * `engines.node`, so the check and the floor can never drift apart into two numbers.
 * @param {string} nodeVersion the Node version to check, e.g. `process.versions.node`
 * @returns {Promise<Finding>} the `node` finding
 */
async function checkNode(nodeVersion) {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const floorSpec = pkg.engines.node;
  const ok = compareVersions(nodeVersion, floorSpec) >= 0;
  // The floor is a range (`>=24`), so the prose quotes the bare major instead: "Node.js >=24 or
  // later is required" reads as a typo to the admin this message exists for.
  const floorMajor = parseVersionParts(floorSpec)[0];
  return {
    check: 'node',
    ok,
    remedy: ok
      ? `Node.js ${nodeVersion} meets the Node ${floorMajor} or later that create-cairn-site requires.`
      : `Node.js ${floorMajor} or later is required (found ${nodeVersion}). Install a current ` +
        'release from https://nodejs.org, or upgrade with your version manager (nvm, fnm, ' +
        'volta), then retry.'
  };
}

/**
 * Check that the machine can bind a loopback TCP port. Always resolves, never rejects: a
 * pre-flight that throws instead of reporting is useless to the caller.
 * @returns {Promise<Finding>} the `loopback` finding
 */
function checkLoopback() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (cause) => {
      resolve({
        check: 'loopback',
        ok: false,
        remedy:
          'Could not bind a local port on 127.0.0.1. This usually means a local firewall or a ' +
          'locked-down container is blocking loopback binds. Check your firewall settings or ' +
          `container network policy, then retry. (${cause.code ?? cause.message})`
      });
    });
    server.listen(0, '127.0.0.1', () => {
      server.close(() => {
        resolve({
          check: 'loopback',
          ok: true,
          remedy: 'Loopback binding on 127.0.0.1 works; the local dev server will be reachable.'
        });
      });
    });
  });
}

/**
 * Check for an HTTPS proxy in the environment. Informational only, and present only when a
 * proxy is actually configured: an unset proxy is the common case and not worth a finding.
 * @returns {Finding | null} the `proxy` finding, or `null` when neither env var is set
 */
function checkProxy() {
  const value = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  if (!value) return null;
  return {
    check: 'proxy',
    ok: true,
    remedy:
      `An HTTPS proxy is configured (${value}); npm install and any network calls in later ` +
      'steps will route through it. No action needed unless installs fail, in which case ' +
      'confirm the proxy allows access to registry.npmjs.org and api.github.com.'
  };
}

/**
 * Check for the Windows PowerShell execution-policy trap that can silently block npm's
 * generated `.ps1` shims. Informational only, and present only on `win32`.
 * @param {string} platform the platform to check, e.g. `process.platform`
 * @returns {Finding | null} the `powershell-execution-policy` finding, or `null` off Windows
 */
function checkPowerShellExecutionPolicy(platform) {
  if (platform !== 'win32') return null;
  return {
    check: 'powershell-execution-policy',
    ok: true,
    remedy:
      "If npm scripts are blocked by PowerShell's execution policy, run this from a non-elevated " +
      'PowerShell prompt: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned'
  };
}

/**
 * Run every credential-free pre-flight check and collect the findings.
 * @param {{ nodeVersion?: string, platform?: string }} [options] `nodeVersion` and `platform`
 *  are injected for testing and default to the running process's own values
 * @returns {Promise<Finding[]>} one finding per applicable check, in check order
 */
export async function runPreflight({
  nodeVersion = process.versions.node,
  platform = process.platform
} = {}) {
  // The last two checks apply only on some machines and return null on the rest.
  const conditional = [checkProxy(), checkPowerShellExecutionPolicy(platform)];
  return [
    await checkNode(nodeVersion),
    await checkLoopback(),
    ...conditional.filter((finding) => finding !== null),
  ];
}
