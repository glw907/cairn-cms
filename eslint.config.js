import jsdoc from 'eslint-plugin-jsdoc';
import tsdoc from 'eslint-plugin-tsdoc';
import tseslint from 'typescript-eslint';

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

export default [
  { files: ['src/lib/**/*.ts'], ...jsdoc.configs['flat/recommended-typescript-error'] },
  {
    files: ['src/lib/**/*.ts'],
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
    },
  },
];
