// A thin @clack/prompts wrapper collecting the site's name, tagline, and brand color. Every flag
// from parseArgs short-circuits its own prompt (a caller who already answered on the command
// line is never asked again), and --yes fills in the Waymark defaults for whatever is still
// unanswered, so a fully-flagged or fully---yes invocation runs end to end with no interactive
// prompt. Validation lives here, not in substitute.mjs: this is the last chance to reject a bad
// answer before any file gets written.
import { intro, outro, text, isCancel, cancel } from '@clack/prompts';
import { resolveHue } from './substitute.mjs';

const DEFAULTS = { name: 'Waymark', tagline: '', brandColor: '' };

/**
 * Slug a display name into a directory-safe name: lowercase, non-alphanumeric runs collapsed to
 * a single dash, leading and trailing dashes trimmed.
 * @param {string} name the display name to slug
 * @returns {string} the slug, falling back to "cairn-site" when the name slugs to nothing
 */
function slugify(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'cairn-site';
}

/**
 * End the process after a cancelled prompt (the user pressing Ctrl+C), printing a next step
 * rather than letting the cancellation surface as an unhandled rejection or a bare stack trace.
 * Every exit path in this tool prints one, per the plan's global constraint; a mid-prompt cancel
 * is no exception.
 * @returns {never}
 */
function exitOnCancel() {
  cancel('Cancelled. Run create-cairn-site again when you are ready to continue.');
  process.exit(1);
}

/**
 * Resolve one field: the flag value when supplied (an explicit flag always wins, even under
 * --yes), the given default under --yes, or the interactively prompted answer otherwise.
 * @param {string | undefined} flagValue the value already supplied on the command line
 * @param {boolean} yes whether --yes was passed
 * @param {string} fallback the default to use under --yes
 * @param {() => Promise<string | symbol>} prompt the @clack/prompts call to run interactively
 * @returns {Promise<string>} the resolved answer
 */
async function resolveField(flagValue, yes, fallback, prompt) {
  if (flagValue !== undefined) return flagValue;
  if (yes) return fallback;
  const answer = await prompt();
  if (isCancel(answer)) exitOnCancel();
  return answer;
}

/**
 * Collect the scaffold's answers: the site name, an optional tagline, an optional brand color,
 * and the target directory. Each already-supplied flag short-circuits its own prompt; --yes
 * fills in the Waymark defaults for anything still unanswered.
 * @param {{ yes: boolean, name?: string, tagline?: string, brandColor?: string, dir?: string }} flags
 *  the parsed CLI flags, as returned by parseArgs
 * @returns {Promise<{ name: string, tagline: string, brandColor: string, dir: string }>} the
 *  validated answers
 */
export async function collectAnswers(flags) {
  intro('create-cairn-site');

  const name = await resolveField(flags.name, flags.yes, DEFAULTS.name, () =>
    text({ message: 'Site name', placeholder: DEFAULTS.name, defaultValue: DEFAULTS.name }));
  if (name.trim().length === 0) {
    throw new Error('collectAnswers: name must be non-empty');
  }

  const tagline = await resolveField(flags.tagline, flags.yes, DEFAULTS.tagline, () =>
    text({ message: 'Tagline (optional)', placeholder: 'Leave blank for none' }));

  const brandColor = await resolveField(flags.brandColor, flags.yes, DEFAULTS.brandColor, () =>
    text({
      message: 'Brand color (optional): a hex color, an oklch(...) string, or a hue 0-360',
      placeholder: 'Leave blank for the Waymark default',
      validate: (value) => {
        if (!value) return undefined;
        try {
          resolveHue(value);
          return undefined;
        } catch {
          return 'Enter a hex color, an oklch(...) string, or a number 0-360.';
        }
      },
    }));
  if (brandColor) {
    try {
      resolveHue(brandColor);
    } catch (cause) {
      throw new Error(`collectAnswers: brandColor "${brandColor}" is not valid`, { cause });
    }
  }

  const dirDefault = slugify(name);
  const dir = await resolveField(flags.dir, flags.yes, dirDefault, () =>
    text({ message: 'Directory', placeholder: dirDefault, defaultValue: dirDefault }));

  outro('Answers collected.');
  return { name, tagline: tagline ?? '', brandColor: brandColor ?? '', dir };
}
