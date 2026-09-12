import jsdoc from 'eslint-plugin-jsdoc';
import tsdoc from 'eslint-plugin-tsdoc';
import tseslint from 'typescript-eslint';
import svelteParser from 'svelte-eslint-parser';

// Local house rule: ban the em dash in code comments. A comment is a keyboard, grep, and
// monospace medium, so the character (which TSDoc does not address) does not belong there.
const houseComments = {
  rules: {
    'no-em-dash-in-comments': {
      meta: { type: 'problem', docs: { description: 'Disallow the em dash in code comments.' } },
      create(context) {
        const source = context.sourceCode ?? context.getSourceCode();
        return {
          Program() {
            for (const comment of source.getAllComments()) {
              if (comment.value.includes('—')) {
                context.report({
                  loc: comment.loc,
                  message: 'No em dash in comments. Use a period, a comma, or parentheses.',
                });
              }
            }
          },
        };
      },
    },
  },
};

// The comment gate covers src/lib, the dev-package source (packages/cairn-cms-dev/src), and the
// showcase's own .ts and e2e sources, so the TSDoc and em-dash rules reach all three.
// check:comments lints src/lib and the showcase; check:dev-package lints the dev-package paths
// against this same config.
const COMMENT_GLOBS = [
  'src/lib/**/*.ts',
  'packages/cairn-cms-dev/src/**/*.ts',
  'examples/showcase/src/**/*.ts',
  'examples/showcase/e2e/**/*.ts',
];

export default [
  { files: COMMENT_GLOBS, ...jsdoc.configs['flat/recommended-typescript-error'] },
  {
    files: COMMENT_GLOBS,
    languageOptions: { parser: tseslint.parser },
    plugins: { jsdoc, tsdoc, house: houseComments },
    rules: {
      // The em dash is out of code comments (keyboard, grep, and monospace hygiene).
      'house/no-em-dash-in-comments': 'error',
      // The contract, never the type. The signature already carries the types.
      'jsdoc/no-types': 'error',
      'jsdoc/check-tag-names': ['error', { typed: true }],
      'tsdoc/syntax': 'error',
      'jsdoc/check-param-names': 'error',
      // A doc on exports only, and at warn: check:reference owns the hard coverage gate.
      'jsdoc/require-jsdoc': ['warn', { publicOnly: true }],
      // The deterministic half of the paraphrase gate.
      'jsdoc/informative-docs': 'warn',
      // These manufacture the type-restatement the standard forbids.
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      // require-throws-type is a JSDoc rule that wants `@throws {Type}`, which TSDoc rejects as a
      // malformed inline tag (tsdoc/syntax). The charter mandates TSDoc, so @throws stays prose.
      'jsdoc/require-throws-type': 'off',
      // The same conflict as require-throws-type above, for a generator's yielded value: JSDoc's
      // require-yields wants an `@yields` tag, and TSDoc's own tag set does not define one. A
      // generator function describes what it yields in prose instead.
      'jsdoc/require-yields': 'off',
    },
  },
  // The showcase's .svelte files and the engine's own admin components get the same four
  // comment rules the .ts block carries, scoped to these two globs. svelte-eslint-parser hands
  // the <script> block to typescript-eslint's parser so the comment rules see TypeScript
  // comments; eslint-plugin-svelte's own rule sets (a11y, reactivity) are deliberately not
  // enabled here, since this block is a comment gate, not a component linter. The engine's
  // components carry the same TSDoc contract as its .ts sources, so they belong under the same
  // gate rather than relying on review alone to catch a malformed doc comment.
  {
    files: ['examples/showcase/src/**/*.svelte', 'src/lib/components/**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: { parser: tseslint.parser },
    },
    plugins: { jsdoc, tsdoc, house: houseComments },
    rules: {
      'house/no-em-dash-in-comments': 'error',
      'jsdoc/no-types': 'error',
      'tsdoc/syntax': 'error',
      'jsdoc/informative-docs': 'warn',
    },
  },
];
