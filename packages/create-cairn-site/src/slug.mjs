// The one slug rule this package uses. Both the site id (state.mjs) and the default target
// directory (prompts.mjs) are slugs of the same answered name, so they share this function
// rather than each carrying a copy: two copies drift, and a name that slugged one way into an
// id and another way into a directory would be a confusing thing to debug. The fallback differs
// per call site, so it is a parameter rather than a constant here.

/**
 * Slug a display name: lowercase, non-alphanumeric runs collapsed to a single dash, leading and
 * trailing dashes trimmed. Never returns an empty string, so a name like `!!!` cannot produce a
 * value with a leading dash or an empty path segment.
 * @param {string} name the display name to slug
 * @param {string} fallback the value to return when `name` holds no alphanumeric characters
 * @returns {string} the slug, or `fallback` when the name slugs to nothing
 */
export function slugify(name, fallback) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : fallback;
}
