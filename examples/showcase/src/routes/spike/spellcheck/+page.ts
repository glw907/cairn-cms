// The spike constructs a Web Worker in onMount, so it is a client-only page: no SSR, no prerender.
export const ssr = false;
export const prerender = false;
