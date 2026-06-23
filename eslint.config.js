import jsdoc from 'eslint-plugin-jsdoc';
import tsdoc from 'eslint-plugin-tsdoc';
import tseslint from 'typescript-eslint';

export default [
  { files: ['src/lib/**/*.ts'], ...jsdoc.configs['flat/recommended-typescript-error'] },
  {
    files: ['src/lib/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { jsdoc, tsdoc },
    rules: {
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
