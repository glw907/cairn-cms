// postcss-prefix-selector ships JSDoc types in its source but no .d.ts, so NodeNext sees it as an
// untyped module. The admin-css build script imports it and the admin-css-build test pulls that
// script into the svelte-check program, so this ambient declaration keeps the check at 0 errors.
declare module 'postcss-prefix-selector' {
  import type { PluginCreator, Rule } from 'postcss';

  interface PrefixSelectorOptions {
    prefix: string;
    exclude?: (string | RegExp)[];
    transform?: (
      prefix: string,
      selector: string,
      prefixedSelector: string,
      filePath: string,
      rule: Rule
    ) => string;
    ignoreFiles?: (string | RegExp)[];
    includeFiles?: (string | RegExp)[];
    skipGlobalSelectors?: boolean;
  }

  const prefixSelector: PluginCreator<PrefixSelectorOptions>;
  export default prefixSelector;
}
