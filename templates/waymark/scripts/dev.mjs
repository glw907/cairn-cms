// scripts/dev.mjs: start the dev server with the local admin's backend enabled.
// CAIRN_DEV_BACKEND=1 is the runtime half of the dev-backend gate. It is deliberately a
// runtime variable, not a build define, so no production build can fold the dev backend
// into a deployed Worker; this shim exists so plain `npm run dev` works on any platform
// without setting the variable by hand. It also runs the admin stylesheet compile in watch
// mode beside the dev server, so an edit under src/routes/admin recompiles .cairn/admin.css
// without a manual rebuild.
import { spawn } from 'node:child_process';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const tailwind = spawn(
  npx,
  ['--no-install', '@tailwindcss/cli', '-i', 'src/admin.css', '-o', '.cairn/admin.css', '--watch'],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);
tailwind.on('error', (cause) => {
  console.error(`could not start the admin stylesheet watch compile: ${cause.message}`);
});

const child = spawn(npx, ['--no-install', 'vite', 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, CAIRN_DEV_BACKEND: '1' },
});
child.on('error', (cause) => {
  console.error(`could not start the dev server: ${cause.message}`);
  console.error('Next step: run "npm install" in this directory, then "npm run dev" again.');
  tailwind.kill();
  process.exit(1);
});
child.on('exit', (code) => {
  tailwind.kill();
  process.exit(code ?? 1);
});
