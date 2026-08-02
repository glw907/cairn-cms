// cairn-cms: the `browser` condition target for `/auth-crypto`. Every export on this subpath is
// Web Crypto and would otherwise run, uselessly and dangerously, in a client bundle, so a browser
// build fails at import time instead of shipping the primitives to the page.
throw new Error('@glw907/cairn-cms/auth-crypto is server-only');
