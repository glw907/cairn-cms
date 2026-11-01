// Known-bad for S09-component-with-island: the live behavior ships as an inline script that
// build() emits, with no hydrate declaration, no Svelte component, and no registry entry. The
// engine's sanitize floor strips the script from the public page, so the countdown never ticks.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** @param {string} root */
export default function setup(root) {
  mkdirSync(join(root, 'src/theme'), { recursive: true });
  writeFileSync(
    join(root, 'src/theme/markdown-components.ts'),
    `import { defineComponent, fields } from '@glw907/cairn-cms';
import { h } from 'hastscript';

export const countdown = defineComponent({
  name: 'countdown',
  label: 'Countdown',
  description: 'Days remaining until a date.',
  attributes: {
    label: fields.text({ label: 'Label', required: true }),
    date: fields.date({ label: 'Date', required: true }),
  },
  build: (ctx) =>
    h('p', { className: ['countdown'], id: 'countdown' }, [
      h('span', {}, [\`\${ctx.attr('label')}\`]),
      h('script', {}, [
        \`setInterval(() => { document.getElementById('countdown').dataset.days = Math.ceil((new Date('\${ctx.attr('date')}') - Date.now()) / 86400000); }, 60000);\`,
      ]),
    ]),
});

export const components = [countdown];
`,
  );
}
