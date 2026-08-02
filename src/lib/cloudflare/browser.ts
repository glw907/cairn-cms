// cairn-cms: the `browser` condition target for `/cloudflare`. These primitives handle a
// Turnstile secret and call platform bindings, and would leak or fail in a client bundle, so a
// browser build fails at import time instead of shipping them to the page.
throw new Error('@glw907/cairn-cms/cloudflare is server-only');
