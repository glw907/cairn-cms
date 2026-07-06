// This port is public-content-only, so every route prerenders to static HTML by default; a
// route with its own data load (the blog index, a single entry) still sets `prerender = true`
// itself, matching the cascade, but the composed marketing pages (home, features, pricing, FAQ,
// contact, changelog) carry no load of their own and rely on this default.
export const prerender = true;
