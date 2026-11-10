// The scripted leg against a recorded pane sequence: a fake tmux serves one pane per look and notes
// which pane was showing when each key went in, a fake clock stands in for every wait, and no
// cleanroom, terminal, network, or credential is involved.
import { describe, it, expect } from 'vitest';
import { SCREENS, chooseRow, commandFor, identify, runScripted } from '../../../scripts/gate/scripted.mjs';

const RUN_ID = '2611091430';
const RUN_DIR = `/var/tmp/cleanroom/${RUN_ID}/run`;
const SESSION = `cleanroom-${RUN_ID}-scripted`;
const OWNER = 'cairn-gate@probe.907.life';
const START = 'npm create cairn-site';
const PASTE_ON = '\x1b[200~';
const PASTE_OFF = '\x1b[201~';

const PANES = {
  prompt: 'owner@cleanroom:~$',
  starting: `owner@cleanroom:~$ ${START}`,
  npx: 'Need to install the following packages:\ncreate-cairn-site@gate\nOk to proceed? (y)',
  welcome: 'Set up a cairn site\n\nSetup creates your site on GitHub and Cloudflare.\n\nenter start  q quit',
  theme: 'About your site\n\nTheme\nHow your site looks to readers.\n> Waymark',
  name: 'About your site\n\nSite name\nShown at the top of every page.\n>',
  crawlers: 'About your site\n\nSite name  Cairn gate\n\nAI crawlers\nChoose whether AI companies can use your content to train their models.\n> Block AI training',
  email: "About your site\n\nYour email\nSetup can't read your email from a Cloudflare token. The admin sends your sign-in links to this address.\n>",
  domain: 'Choose a domain\n\nDomain\n3 domains on your Cloudflare account\n> alpha.example.org\n  carin-test.org\n  zeta.example.net\n\n↑↓ choose · Enter next',
  summary: 'Review the settings for Cairn gate 2611091430\n\nDomain  carin-test.org\nAddress  carin-test.org and www.carin-test.org\n\nEnter set up · e edit email · a edit address · Ctrl+C quit',
  summaryEditing: 'Review the settings for Cairn gate 2611091430\n\nDomain  carin-test.org\nAddress  > gate.carin-test.org\n\nEnter save · Esc cancel',
  summarySet: 'Review the settings for Cairn gate 2611091430\n\nDomain  carin-test.org\nAddress  gate.carin-test.org\n\nEnter set up · e edit email · a edit address · Ctrl+C quit',
  summarySent: 'Review the settings for Cairn gate 2611091430\n\nDomain  carin-test.org\n\nq quit',
  browserOpen: 'Approve setup in your browser\n\nSetup opens a tab in your browser.\n\nenter open your browser  q quit',
  browserWait: 'Approve setup in your browser\n\nApprove each request in the setup tab.\n\nctrl+c stop',
  watch: 'Setting up Cairn gate 2611091430\n\nWrite the site files',
  done: 'Cairn gate 2611091430 is live at https://cairn-gate-2611091430.carin-test.org',
  stopped: "Setup can't continue\n\nWhat happened\nThe domain is not on this account.",
  mystery: 'Something nobody planned\nwith no screen of its own',
} as const;

type Send = { text: string; pane: string };

/**
 * A tmux that serves the sequence one pane per poll, then holds the last pane. The pane moves on
 * when the leg sleeps between polls, so a second read in the same poll (the check after a
 * screenshot) sees the same pane, as a real terminal would.
 */
function fakeTmux(panes: string[]) {
  let looked = 0;
  const sends: Send[] = [];
  const calls: string[][] = [];
  const run = async (args: string[]) => {
    calls.push(args);
    const verb = args[2];
    if (verb === 'has-session') return '';
    if (verb === 'capture-pane') return panes[looked]!;
    if (verb === 'send-keys') {
      const lit = args.includes('-l');
      sends.push({ text: lit ? args[args.length - 1]! : `<${args[args.length - 1]}>`, pane: panes[looked]! });
      return '';
    }
    throw new Error(`unexpected tmux ${verb}`);
  };
  const tick = () => void (looked = Math.min(looked + 1, panes.length - 1));
  return { run, sends, calls, tick };
}

function fakeClock() {
  let t = 1_000_000;
  return { now: () => t, sleep: async (ms: number) => void (t += ms) };
}

function harness(panes: string[], extra: Record<string, unknown> = {}, env: Record<string, string> = {}) {
  const tmux = fakeTmux(panes);
  const clock = fakeClock();
  const events: Record<string, unknown>[] = [];
  const shells: { args: string[]; env: Record<string, string | undefined> }[] = [];
  const order: string[] = [];
  const deps = {
    tmux: (args: string[]) => {
      if (args[2] === 'send-keys' && !order.includes('first-key')) order.push('first-key');
      return tmux.run(args);
    },
    startShell: (args: string[], env: Record<string, string | undefined>) => {
      order.push('shell');
      shells.push({ args, env });
      return { exited: new Promise<number>(() => {}) };
    },
    startStandIn: () => {
      order.push('stand-in');
      return { kill() {} };
    },
    record: (event: Record<string, unknown>) => void events.push(event),
    now: clock.now,
    sleep: async (ms: number) => {
      tmux.tick();
      await clock.sleep(ms);
    },
    ...extra,
  };
  const run = () => runScripted({ runDir: RUN_DIR, env: { HOME: '/home/owner', ...env }, deps });
  return { run, tmux, events, shells, order };
}

/** The happy path: each screen shown more than once, as a real redraw loop shows it. */
const HAPPY = [
  PANES.prompt,
  PANES.starting,
  PANES.starting,
  PANES.npx,
  PANES.npx,
  PANES.welcome,
  PANES.welcome,
  PANES.name,
  PANES.name,
  PANES.crawlers,
  PANES.email,
  PANES.email,
  PANES.domain,
  PANES.domain,
  PANES.summary,
  PANES.summaryEditing,
  PANES.summarySet,
  PANES.summarySent,
  PANES.browserOpen,
  PANES.browserWait,
  PANES.browserWait,
  PANES.watch,
  PANES.done,
];

describe('scripted leg: starting', () => {
  it('starts the stand-in and the shell with the tag, then types the command at a prompt', async () => {
    const h = harness(HAPPY);
    await h.run();
    expect(h.order.slice(0, 3)).toEqual(['stand-in', 'shell', 'first-key']);
    const shell = h.shells[0]!;
    expect(shell.args.slice(0, 6)).toEqual(['shell', RUN_ID, '--tmux', SESSION, '--socket', '/home/owner/.local/state/cleanroom/tmux-scripted.sock']);
    expect(shell.args).toContain('CF_WS_CAIRN_CLEANROOM_TOKEN:CAIRN_CF_SETUP_TOKEN');
    // The tag reaches the shell itself, since a local binary has no npm to export it.
    expect(shell.args.slice(shell.args.indexOf('--env'))).toEqual(['--env', 'npm_config_tag=gate']);
    expect(shell.env.npm_config_tag).toBe('gate');
    const socket = '/home/owner/.local/state/cleanroom/tmux-scripted.sock';
    expect(h.tmux.calls.every((c) => c[0] === '-S' && c[1] === socket)).toBe(true);
  });
});

describe('scripted leg: the target', () => {
  const typed = async (env: Record<string, string> = {}) => {
    const panes = HAPPY.map((pane) => (pane === PANES.starting ? `owner@cleanroom:~$ ${commandFor(env)}` : pane));
    const h = harness(panes, {}, env);
    await h.run();
    return h.tmux.sends.find((s) => s.pane === PANES.prompt)?.text;
  };

  it('types the launcher with no address flags, since the interactive command takes none', async () => {
    expect(await typed()).toBe('npm create cairn-site');
  });

  it('runs the local build the same way when one is handed in', async () => {
    expect(await typed({ GATE_CAIRN_BIN: '/var/tmp/cleanroom/2611091430/cairn' })).toBe('/var/tmp/cleanroom/2611091430/cairn new');
  });

  it('sets the gate subdomain on the summary, and never leaves the bare domain', async () => {
    const h = harness(HAPPY);
    await h.run();
    expect(h.tmux.sends.filter((s) => s.pane === PANES.summary).map((s) => s.text)).toEqual(['<a>']);
    expect(h.tmux.sends.filter((s) => s.pane === PANES.summaryEditing).map((s) => s.text)).toEqual(['<C-u>', 'gate.carin-test.org', '<Enter>']);
    expect(h.tmux.sends.filter((s) => s.pane === PANES.summarySet).map((s) => s.text)).toEqual(['<Enter>']);
    expect(h.tmux.sends.some((s) => s.text === 'carin-test.org')).toBe(false);
  });

  it('moves the domain selection to the zone before Enter, up or down', () => {
    const list = (selected: string) => `Choose a domain\n\nDomain\n3 domains\n${['alpha.example.org', 'carin-test.org', 'zeta.example.net'].map((d) => (d === selected ? `> ${d}` : `  ${d}`)).join('\n')}\n`;
    expect(chooseRow(list('alpha.example.org'), 'carin-test.org', 'domain')).toEqual([{ key: 'Down' }, { key: 'Enter' }]);
    expect(chooseRow(list('zeta.example.net'), 'carin-test.org', 'domain')).toEqual([{ key: 'Up' }, { key: 'Enter' }]);
    expect(chooseRow(list('carin-test.org'), 'carin-test.org', 'domain')).toEqual([{ key: 'Enter' }]);
    expect(() => chooseRow(list('alpha.example.org'), 'missing.example.org', 'domain')).toThrow(/offers no "missing.example.org" row/);
  });

  it('selects a row on a screen that starts with no selection, by counting down from the count line', () => {
    // The newer chooser shows no marker until the first arrow key, so Enter alone never answers it.
    const blank = 'Choose a domain\n\nDomain\n3 domains on your Cloudflare account\n  alpha.example.org\n  carin-test.org\n  zeta.example.net\n\n↑↓ choose';
    expect(chooseRow(blank, 'alpha.example.org', 'domain')).toEqual([{ key: 'Down' }, { key: 'Enter' }]);
    expect(chooseRow(blank, 'carin-test.org', 'domain')).toEqual([{ key: 'Down' }, { key: 'Down' }, { key: 'Enter' }]);
    expect(chooseRow(blank, 'zeta.example.net', 'domain')).toEqual([{ key: 'Down' }, { key: 'Down' }, { key: 'Down' }, { key: 'Enter' }]);
    expect(() => chooseRow('Choose a domain\n\n  alpha.example.org', 'alpha.example.org', 'domain')).toThrow(/offers no "alpha.example.org" row/);
  });

  it('answers the account screen with a Down first when it shows no selection', () => {
    const account = SCREENS.find((screen) => screen.name === 'account');
    const answers = { email: OWNER, name: 'Cairn gate', command: START };
    const blank = 'Choose an account\n\nAccount\n2 accounts on your Cloudflare login\n  First\n  Second\n\n↑↓ choose';
    expect(account?.answer?.(answers, blank)).toEqual([{ key: 'Down' }, { key: 'Enter' }]);
    expect(account?.answer?.(answers, blank.replace('  First', '> First'))).toEqual([{ key: 'Enter' }]);
  });

  it('knows the screen while a long command wraps across lines', () => {
    const command = '/var/tmp/cleanroom/2611091430/cairn new';
    const wrapped = 'owner@cleanroom:~$ /var/tmp/cleanroom/2611091430/cairn\nnew';
    expect(identify(wrapped, command)?.name).toBe('starting');
    expect(identify(`${wrapped}\nowner@cleanroom:~$`, command)?.name).toBe('shell');
  });

  it('calls a screen it does not know unknown while the typed command is still above it', () => {
    expect(identify(`owner@cleanroom:~$ ${START}\nSomething nobody planned\nwith no screen of its own`)).toBeNull();
    expect(identify(`owner@cleanroom:~$ ${START}\nnpm error code E404`)).toBeNull();
  });
});

describe('scripted leg: a key goes only to the screen still showing', () => {
  it('sends nothing to the browser screen when the domain screen replaces it during the screenshot', async () => {
    // Run 2611101855: the browser screen showed for 0.4 seconds, the real-terminal screenshot took
    // seconds, and the Enter meant for it accepted the domain screen's first row, 907.life.
    const at = HAPPY.indexOf(PANES.domain);
    const panes = [...HAPPY.slice(0, at), PANES.browserOpen, ...HAPPY.slice(at)];
    let fired = false;
    const box: { h?: ReturnType<typeof harness> } = {};
    const shot = async (screen: string) => {
      if (screen === 'browser-open' && !fired) {
        fired = true;
        box.h!.tmux.tick();
      }
    };
    box.h = harness(panes, { shot });
    await box.h.run();
    const sends = box.h.tmux.sends;
    expect(sends.filter((s) => s.pane === PANES.domain).map((s) => s.text)).toEqual(['<Down>', '<Enter>']);
    const firstAtDomain = sends.findIndex((s) => s.pane === PANES.domain);
    expect(sends.slice(0, firstAtDomain).some((s) => s.pane === PANES.browserOpen)).toBe(false);
  });
});

describe('scripted leg: the bare domain is never confirmed', () => {
  const toSummary = HAPPY.slice(0, HAPPY.indexOf(PANES.summary));

  it('sends nothing but the edit key at a summary that shows the bare domain, and fails when it will not edit', async () => {
    const h = harness([...toSummary, PANES.summary]);
    await expect(h.run()).rejects.toThrow(/did not take its answer/);
    const atBare = h.tmux.sends.filter((s) => s.pane === PANES.summary).map((s) => s.text);
    expect(atBare).toEqual(['<a>']);
    expect(h.tmux.sends.some((s) => s.text === '<Enter>' && s.pane === PANES.summary)).toBe(false);
  });

  it('fails, and never presses Enter, when the bare domain comes back after the address was saved', async () => {
    const h = harness([...toSummary, PANES.summary, PANES.summaryEditing, PANES.summary]);
    await expect(h.run()).rejects.toThrow(/shows the bare domain again/);
    expect(h.tmux.sends.filter((s) => s.pane === PANES.summary).map((s) => s.text)).toEqual(['<a>']);
  });

  it('confirms only a summary whose address row shows the gate subdomain', () => {
    expect(identify(PANES.summary)?.name).toBe('summary');
    expect(identify(PANES.summarySet)?.name).toBe('summary-set');
    expect(identify(PANES.summaryEditing)?.name).toBe('summary-editing');
    const answer = (name: string) => SCREENS.find((s: { name: string }) => s.name === name)!.answer!({ name: 'n', email: 'e', command: 'c' }, '');
    expect(answer('summary')).toEqual([{ key: 'a' }]);
    expect(answer('summary-set')).toEqual([{ key: 'Enter' }]);
  });
});

describe('scripted leg: shell environment', () => {
  it('passes only the allowlist and the tag, never an inherited secret', async () => {
    const h = harness(HAPPY, {}, { CLEANROOM_ROOT: '/var/tmp/cleanroom', CF_WS_CAIRN_CLEANROOM_TOKEN: 'secret', GITHUB_TEST_TOKEN: 'secret', PATH: '/bin' });
    await h.run();
    expect(h.shells[0]!.env).toEqual({ HOME: '/home/owner', PATH: '/bin', CLEANROOM_ROOT: '/var/tmp/cleanroom', npm_config_tag: 'gate' });
  });
});

describe('scripted leg: answers', () => {
  it('types each answer at its screen, once, and never before', async () => {
    const h = harness(HAPPY);
    await h.run();
    expect(h.tmux.sends).toEqual([
      { text: START, pane: PANES.prompt },
      { text: '<Enter>', pane: PANES.prompt },
      { text: 'y', pane: PANES.npx },
      { text: '<Enter>', pane: PANES.npx },
      { text: '<Enter>', pane: PANES.welcome },
      { text: `Cairn gate ${RUN_ID}`, pane: PANES.name },
      { text: '<Enter>', pane: PANES.name },
      { text: '<Enter>', pane: PANES.crawlers },
      { text: `${PASTE_ON}${OWNER}${PASTE_OFF}`, pane: PANES.email },
      { text: '<Enter>', pane: PANES.email },
      { text: '<Down>', pane: PANES.domain },
      { text: '<Enter>', pane: PANES.domain },
      { text: '<a>', pane: PANES.summary },
      { text: '<C-u>', pane: PANES.summaryEditing },
      { text: 'gate.carin-test.org', pane: PANES.summaryEditing },
      { text: '<Enter>', pane: PANES.summaryEditing },
      { text: '<Enter>', pane: PANES.summarySet },
      { text: '<Enter>', pane: PANES.browserOpen },
    ]);
  });

  it('waits on a screen that needs no answer and ends on the done screen', async () => {
    const h = harness(HAPPY);
    const result = await h.run();
    expect(result.ok).toBe(true);
    expect(h.events.map((e) => e.screen)).toEqual([
      'shell', 'starting', 'npx', 'welcome', 'name', 'crawlers', 'email', 'domain', 'summary', 'summary-editing', 'summary-set', 'summary-wait', 'browser-open', 'browser-wait', 'watch', 'done',
    ]);
  });

  it('answers the theme question with Enter when the catalogue offers one', async () => {
    const h = harness([PANES.prompt, PANES.starting, PANES.theme, PANES.name, PANES.done]);
    await h.run();
    expect(h.tmux.sends.filter((s) => s.pane === PANES.theme)).toEqual([{ text: '<Enter>', pane: PANES.theme }]);
  });

  it('wraps only the email in bracketed-paste codes', async () => {
    const h = harness(HAPPY);
    await h.run();
    const pasted = h.tmux.sends.filter((s) => s.text.includes(PASTE_ON));
    expect(pasted).toHaveLength(1);
    expect(pasted[0]!.text).toBe(`${PASTE_ON}${OWNER}${PASTE_OFF}`);
    expect(h.tmux.sends.filter((s) => s.text.includes('\x1b'))).toHaveLength(1);
  });

  it('reads the owner and site name from the environment when set', async () => {
    const h = harness(HAPPY, {}, { GATE_OWNER_EMAIL: 'other@probe.example', GATE_SITE_NAME: 'Named Site' });
    await h.run();
    expect(h.tmux.sends.some((s) => s.text === `${PASTE_ON}other@probe.example${PASTE_OFF}`)).toBe(true);
    expect(h.tmux.sends.some((s) => s.text === 'Named Site')).toBe(true);
  });
});

describe('scripted leg: failures', () => {
  it('fails when the command ends at once and the prompt shows again, though the screen before it was the shell', async () => {
    const ended = `owner@cleanroom:~$ ${START}\ncairn: --plan is required with --zone.\nowner@cleanroom:~$`;
    const h = harness([PANES.prompt, PANES.prompt, ended]);
    await expect(h.run()).rejects.toThrow(/back at the shell prompt.*cairn: --plan is required/s);
  });

  it('fails on a screen it does not know, naming it, and types nothing at it', async () => {
    const h = harness([PANES.prompt, PANES.starting, PANES.welcome, PANES.mystery]);
    await expect(h.run()).rejects.toThrow(/unknown screen "Something nobody planned"/);
    expect(h.tmux.sends.some((s) => s.pane === PANES.mystery)).toBe(false);
  });

  it('does not call a screen unknown while it is still drawing', async () => {
    const h = harness([PANES.prompt, PANES.starting, PANES.mystery, PANES.welcome, PANES.done]);
    await expect(h.run()).resolves.toMatchObject({ ok: true });
  });

  it('fails on a setup stop screen, naming it', async () => {
    const h = harness([PANES.prompt, PANES.starting, PANES.welcome, PANES.stopped]);
    await expect(h.run()).rejects.toThrow(/setup stopped at "stopped".*Setup can't continue/s);
  });

  it('fails when the command ends back at the shell prompt', async () => {
    const h = harness([PANES.prompt, PANES.starting, PANES.welcome, PANES.prompt]);
    await expect(h.run()).rejects.toThrow(/back at the shell prompt.*"welcome"/s);
  });

  it('fails past 20 minutes of the fake clock, naming the step reached', async () => {
    const h = harness([PANES.prompt, PANES.starting, PANES.welcome, PANES.watch]);
    const error = await h.run().catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/20 minutes/);
    expect(error.message).toMatch(/"watch"/);
    expect(error.step).toBe('watch');
  });

  it('names the shell when no prompt ever shows', async () => {
    const h = harness(['']);
    const error = await h.run().catch((e) => e);
    expect(error.message).toMatch(/20 minutes/);
    expect(error.step).toBe('start');
  });

  it('fails when the shell tool exits before the session is up', async () => {
    const h = harness([''], { startShell: () => ({ exited: Promise.resolve(3) }) });
    await expect(h.run()).rejects.toThrow(/cleanroom shell exited 3/);
  });

  it('stops the stand-in on the way out, success or failure', async () => {
    const killed: string[] = [];
    const startStandIn = () => ({ kill: () => void killed.push('stand-in') });
    await harness(HAPPY, { startStandIn }).run();
    await harness([PANES.prompt, PANES.stopped], { startStandIn }).run().catch(() => {});
    expect(killed).toEqual(['stand-in', 'stand-in']);
  });
});

describe('scripted leg: screens', () => {
  it('names each screen the owner meets in the setup tool, most advanced first', () => {
    expect(SCREENS.map((s: { name: string }) => s.name)).toEqual(expect.arrayContaining(['welcome', 'name', 'crawlers', 'email', 'summary', 'browser-open', 'done']));
    expect(identify(PANES.crawlers)?.name).toBe('crawlers');
    expect(identify(PANES.summarySent)?.name).toBe('summary-wait');
    expect(identify(PANES.mystery)).toBeNull();
  });
});
