# Media management: design reference

Date: 2026-06-15. Status: design record for the media/gallery initiative, feeding the spec, the
mockups, and the changelog. This is the research arm of the
[[cairn-ui-design-pass-methodology]] (stage 1), captured before any mockup so the design rests on
documented user need rather than taste.

## Purpose and scope

The build mission is the **gallery**: let a non-technical author add, place, and manage images from
`/admin`. The design remit is wider. An author who reaches for "insert media" should not have to
know how the bytes are stored or where they come from, so the authoring experience has to stay
coherent across every kind of media a post can carry. This doc therefore designs the UI/UX for all
three media lifecycles at once, even though the first pass implements only the first:

1. Stored files (the gallery proper): images now, documents close behind.
2. Referenced external media (video and embeds).
3. Design-system tokens (icons and brand marks).

The research behind it: fifteen-plus systems across six lenses (git-based CMS precedent, incumbent
media libraries, headless/DAM asset models, the insertion/authoring flow, multi-type coherence, and
file naming), with deep dives on Contentful, Strapi, and Storyblok. Sources are listed at the end.
The limits on the evidence are in the Caveats section.

## The unified model: classify by lifecycle, not by file type

The most decisive finding across every system is that media is not one problem. The systems that
stay coherent split media by lifecycle, and the ones that fragment do so by dumping unlike
lifecycles into a single upload bucket. No system surveyed splits its library because a file is a
JPG versus a PDF, and no user asked one to. The confusion comes from mixing an embed (a URL), an
icon (a design token), and a one-off screenshot into the same pile as the reusable logo.

The model is three lifecycles, each with a one-line test:

- **Stored files** ("a file I keep"). Photos, PDFs and documents, and the occasional small
  decorative MP4. cairn stores the bytes and the author manages them: upload, browse, reuse, alt
  text. This is the real media library and the only new subsystem.
- **Referenced external media** ("a thing I point at"). Real video (YouTube, Vimeo, Cloudflare
  Stream), tweets, maps, code embeds. cairn stores nothing; the content holds a URL or a provider
  plus an id, rendered by a block. cairn already has the directive and component system for this.
- **Design-system tokens** ("a token I pick"). Icons and brand marks. They belong to the theme,
  chosen from a curated set, never uploaded as loose files. cairn already has this: the adapter's
  `icons` IconSet and the admin `IconPicker`.

Where each type the owner named lands: photos, documents, and small decorative MP4 are stored; real
video is referenced; icons are design tokens; embeds are referenced. Two of the three buckets exist
today, so the pass builds the stored-files library and keeps clean lines so video and icons never
leak into it.

### Placement is a separate axis

A stored image gets used in three places. Those are three affordances on one asset, not three kinds
of media:

- an inline body image, written as markdown `![alt](ref)`;
- a hero or featured image, set in a frontmatter field with its own alt text;
- a gallery tile, one item in a component that holds several.

One asset, three doors. The hero carries the most documented confusion in the field (cover versus
featured, the same image appearing twice, "where did it go"), so it earns a dedicated side-panel
slot with its own alt field and a small preview.

## Research synthesis, by theme

Organized by the cross-cutting findings, since themes drive the design. Each theme records what
users praise, what they complain about, and the implication for cairn.

### Reuse and replace-everywhere

The single most-praised capability anywhere is Webflow's replace-an-asset-and-it-updates-on-every-
page. Craft's reuse-by-reference and Drupal's media-as-entity earn the same affection for the same
reason: upload once, reference anywhere, fix in one place. The absence that most damns Ghost is the
mirror image. Ghost has no library at all, so authors re-upload and cannot find a past image, which
its own forum calls one of the biggest downsides of moving to it.

Implication: reuse by stable reference, with a replace action that updates every placement, has to
ship at launch. It is table stakes that doubles as a headline strength.

### "Where is this used?" and safe deletion

This is the universal unmet need and the universal footgun at the same time. Every system silently
breaks pages when an in-use image is deleted: WordPress (immediate and permanent, no warning),
Squarespace, Drupal (safe delete needs the contrib Entity Usage module), Craft (a deletion-with-
relations modal arrived only in 5.10, May 2026), Contentful (deletion yields dangling links that
surface only as an `errors` array, and Contentful ships an official `contentful-link-cleaner` CLI
because the breakage is so common), Storyblok (a per-asset References view exists, but a reference-
aware delete warning is still "In Evaluation," SBD-1578), Strapi (no usage tracking; an old bug even
made referencing entries uneditable), Uploadcare (staff confirm orphan avoidance "falls entirely on
the developer"). Webflow's number-one asset wishlist item is simply to see where an asset is used.

Implication and cairn's headline differentiator: because cairn's content is markdown in git, every
reference is greppable. cairn can show an asset's usage inline, and block or hard-confirm a delete
that would break pages, listing exactly which entries reference it. Do it as a maintained reverse
index or a publish-time check, not an O(n-squared) scan (Sanity's `references()` query times out at
scale). git history also makes a delete recoverable, which lowers the stakes further.

### Orphan detection (garbage collection)

No incumbent ships true orphan detection natively. WordPress's "unattached" filter is widely called
misleading because it is a relationship flag, not a usage index, so cleanup needs a plugin (Media
Cleaner, Media Deduper) that scans posts, meta, widgets, and page-builder attributes. Storyblok
keeps every version forever, so an agency shipped an API-diffing cleanup tool to compensate.

Implication: grep gives cairn an accurate unused-asset list and a safe bulk clean. One caution from
Ghost's maintainers: assets referenced from raw HTML are undetectable, so any cleanup is opt-in with
a hard confirm and accounts for non-markdown references.

### Alt text

Nobody enforces it, and most systems ask for it at the wrong moment, so it gets skipped. WebAIM's
2024 survey measures 16.2% of home-page images missing alt text and roughly one in four linked
images missing it, with a further tenth carrying questionable values like a filename. The two
exemplars: Webflow sets alt once on the asset, inherits it at each placement, allows a per-instance
override, and offers an explicit "decorative" empty-alt flag. Drupal makes alt required in the
insert dialog, though it left the decorative escape hatch to a follow-up, which is the lesson to
design that hatch in from the start. The anti-patterns are everywhere: Wix and Joomla store alt only
per-placement so it never travels with the asset; Strapi has a years-old unanswered request to make
alt mandatory; Contentful has no first-class alt field at all (only title and description).

Implication: store a default alt on the asset, inherit at placement, allow an override, and offer a
decorative choice. Capture it at the moment of insert, in the same step that takes the file, and
make it hard to skip. If AI drafts alt later, treat it as a draft the author confirms, never a
silent auto-fill (ATAG B.2.3.2). This fits cairn's existing accessibility posture and is a clean
best-in-class win.

### Naming, identity, and deduplication

The naming systems that fail conflate identity with name. WordPress makes the on-disk filename the
identity, so renaming breaks links and re-uploads sprawl as `photo-1.jpg`, `photo-2.jpg` with no
dedup. The proxies (imgix, ImageKit) make the storage path the identity, so reorganizing breaks
URLs. Decap silently overwrites when two files share a name, a documented data-loss path: two
editors paste `image.png` and one destroys the other's image. Pasted screenshots arrive named
`image.png` or a bare timestamp, which seeds a junk drawer; an entire Obsidian-plugin category
exists just to rename a pasted image at paste time.

The systems that get dedup, immutable caching, link stability, and a readable library all at once
separate a stable machine identity from an editable human name. Kirby uses a UUID that never
changes, so a rename is a metadata edit and links survive. Sanity uses a content hash as the id, so
identical bytes collapse to one asset and every content change yields a new immutable URL. The
reconciliation of SEO and caching is the `slug + content-hash` filename that Astro and Vite already
emit by default: the descriptive stem stays in the URL for image SEO, and the hash changes only when
the bytes change, which makes a one-year immutable cache safe.

Google treats the filename as a light SEO signal and derives image meaning mostly from alt text and
surrounding copy, so the descriptive stem helps without carrying the weight. The web-platform
hazards are real and all dissolve with one strict slugify on ingest: spaces become `%20` bugs,
mixed case 404s on Linux while resolving on macOS, NFC/NFD unicode mismatches fail to match across
operating systems (relevant since cairn's tree is shared via git), and Windows reserves names like
`con` and `aux`. A filename can also leak personal information into a public repo, which Sveltia's
slugify request raised.

Implication: the recommended scheme is in the Architecture section. The headline behaviors it buys:
identical bytes dedupe silently (good silence, unlike WordPress's silent sprawl); the same name can
never overwrite different bytes (the Decap footgun becomes structurally impossible); "replace this
image" is a clean first-class action; and a rename never breaks a reference.

### Insertion and the authoring flow

The flows that feel light share one trait: the author makes a single gesture and the editor does the
rest. GitHub's paste-or-drag-to-upload in markdown is the cross-the-board favorite, and Ghost's
paste-inline is the WYSIWYG exemplar. Drag-and-drop is the most-loved gesture once discovered, but
only when feedback is instant; the most-complained-about behavior is the dead interval between drop
and a visible result (Gutenberg), made worse by silent failures on oversized files and progress bars
that hang. The slash command is a delight for power users and close to invisible to non-technical
authors: NN/g measures a 20%-plus task-completion cost for hidden affordances, and the consistent
guidance is to keep a visible path and let slash shadow it. The inline placeholder card that offers
both a drop zone and a "choose file" button is the consensus accessible default.

Markdown has one quiet virtue for cairn: the empty `![]()` brackets are a visible cue that alt text
is missing, which turns a skipped alt into an explicit choice rather than a silent omission.

Implication: a visible upload affordance is the backbone, with paste and drag layered on and slash
as an accelerator. On drop or paste, insert an optimistic placeholder at the cursor, show
determinate progress, swap in the committed reference, and on failure show an inline error with a
retry. Never a silent drop. Translate every gesture into clean, visible markdown that references a
logical handle, not an expiring proxy URL.

### Organization at scale

Every incumbent shipped a flat library and retrofitted folders late, and the demand is loud:
WordPress declines folders in core while a single folder plugin (FileBird) reports 200k-plus active
installs; Webflow, Squarespace, and Drupal all added or still lack folders after years of requests.
The counter-view from WordPress core leadership is that smart filtering beats manual folders, and
WordPress users praise virtual-folder plugins precisely because they do not touch the file
structure. Search is the other recurring failure: WordPress searches by title, not filename, so
finding an image at scale is "a needle in a haystack." And the grid itself collapses without
pagination: Craft loaded every asset into the DOM and timed out near 34k items, Joomla rescanned the
whole tree and took 20-plus seconds, Strapi crawled past a minute at 576k assets.

Implication: organization is metadata over files, never physical moves. Offer folder-like grouping
and tags as metadata, support nesting, and search filename plus alt plus caption. Paginate or
virtualize the grid from the start. Do not auto-fan-out a subfolder per entry (Craft's and Joomla's
scaling trap).

### Transforms and responsive variants

Transform-by-URL with automatic format and quality is praised everywhere and is table stakes, not a
differentiator. Focal point is the marquee editor-facing capability: Sanity's hotspot-and-crop,
Craft's native focal point, Squarespace's draggable dot, and Wix's per-breakpoint face detection all
earn affection because the author sets a point once and every crop respects it. The cautionary
lesson from Sanity is that the editor's preview must match the rendered crop, or it misleads.

The disaster to avoid is upload-time variant fan-out. WordPress generates four-plus files per upload
plus theme sizes, with documented cases of 2,000 images becoming 50,000 files and hitting host inode
limits, and its own roadmap now wants sizes generated on first use. Ghost and Strapi also accumulate
uncleaned derivatives.

Implication: store one original and transform on demand. Cloudflare Images covers the praised set
natively (see Architecture), so cairn gets the results without baking a pipeline or bloating storage.

### Storage: git bloat drives everyone to external

The structural complaint behind every git-CMS recommendation is that binaries in git bloat history
and slow every clone and CI run. Decap added a Cloudinary and Uploadcare escape hatch specifically
to get binaries out of git; TinaCMS defaults media to an external store; Keystatic's git-image model
was scored 2 out of 5 by a reviewer for the same reason, with its paid Cloud Images field offered as
the way out. The headless world adds the lock-in warning: a proprietary transform host and grammar
get baked into content and break on migration, so the reference must stay logical and resolve to a
URL at delivery.

Implication: keep bytes out of git. cairn is Cloudflare-native, so R2 is the answer, with a logical
reference committed to git and transforms applied at the edge. See Architecture.

### Multi-type coherence

Block editors converge on the same split: uploaded media is one family, embeds (paste a URL) are
another, and an embed falls back to a bookmark card when no oEmbed matches. Video is delegate-by-
default across the field; self-hosting a streaming pipeline never stabilizes (encoding, the adaptive
bitrate ladder, signed URLs, observability, and egress are a standing tax), and buffering measurably
cuts watch time. Icons-as-uploads is a recognized category error: Webflow treats an uploaded SVG as
a flat image that loses CSS recoloring, and the articulated correct model is a curated picker of
design tokens with role control. Documents share the image library in most systems but want their
human filename preserved for download.

Implication: the lifecycle model holds. Stored files share one library across types (do not split
images from PDFs). Video and embeds are referenced through the directive system. Icons are a curated
picker. The one mental model the owner holds is "stored, referenced, or design token," and every
type lands in exactly one.

## What cairn can win on

The differentiators, each made cheap by content-in-git:

1. Usage tracking and safe deletion, by grepping references. No surveyed system does this well.
2. Reuse with replace-everywhere, at launch.
3. Alt text set once, inherited, overridable, with a decorative flag, captured at insert and hard to
   skip.
4. Meaningful names with content-hash dedup, so there is no silent overwrite and no duplicate
   sprawl, plus rename-on-paste that no mainstream web CMS ships.
5. An insertion flow with no dead interval and a visible backbone affordance.

Items 1 and 4 are the ones the field fails hardest at, and the ones cairn's architecture makes
natural.

## UI/UX by lifecycle

The owner's requirement: the design considers all three lifecycles, not just the gallery. The author
should meet one coherent "insert" experience and never have to name the bucket.

### One insert entry point

A single insert affordance (a toolbar control, plus paste and drag, plus a slash accelerator) opens
a chooser that presents the paths together, so the author can upload or pick a stored file, paste a
link to embed, or pick an icon. The author picks by intent ("a photo," "a video," "an icon"), and
the system routes to the right lifecycle behind the scenes. This is the Notion multi-path lesson
applied to cairn's three buckets, and it keeps the experience coherent even though the backends
differ.

### Stored files (the gallery, the build mission)

- The library: a paginated grid that searches filename, alt, and caption; folder-or-tag grouping as
  metadata; asset detail (dimensions, size, who and when); reuse by picking an existing asset.
- The three placements: inline `![alt](media:...)`; a hero field in the frontmatter side panel with
  its own alt and a preview; a gallery component holding ordered tiles with per-image caption and alt
  kept as separate fields.
- Upload: the visible card (drop zone plus choose-file) as backbone; paste and drag layered on; the
  optimistic-placeholder, determinate-progress, retry-on-failure loop.
- Alt at insert: required or an explicit decorative choice, in the same step as the file.
- Naming at insert: propose a readable name from the post slug, allow a one-field rename, never
  accept a bare `image.png`.
- Lifecycle actions: replace-in-place (new bytes, new hash, reference updated), usage view ("used in
  N entries"), and a delete that is blocked or hard-confirmed when in use.
- The image states to design are enumerated in their own section below.

### Referenced external media (video and embeds)

- Insert by pasting a URL. Resolve known providers (YouTube, Vimeo, maps, CodePen, tweets) via
  oEmbed, and fall back to a bookmark card when nothing matches (the Ghost pattern).
- Model an embed as a directive, the existing component machinery, for example `:::embed{url=...}` or
  a provider-specific directive. Nothing is stored; the content holds the URL or provider plus id.
- Video specifics: delegate by default. Store provider plus id and an optional poster. Cloudflare
  Stream is the natural default given the stack, and it hands back a poster image URL with a
  timestamp for free. The richer scrub-and-pick poster UI is a later build. The one self-hosted
  exception is a small muted decorative MP4, which is a stored file, not an embed.
- Coherence note: from the author's seat, "insert a video" sits beside "insert a photo" in the same
  chooser, even though one stores bytes and the other stores a reference.

### Design-system tokens (icons and brand marks)

- Icons are picked from a curated set, never uploaded. cairn already has the adapter `icons` IconSet
  and the admin `IconPicker`; the media design keeps icons in that lane and out of the file library.
- Boundary rule: an author who wants a glyph picks a token; a site that needs custom brand icons adds
  them to the design system the site ships, not the per-post upload flow.
- Coherence note: "insert an icon" appears in the same chooser, routing to the picker.

## Architecture direction

The need points to one architecture, and the research effectively settles the storage spike the
methodology flagged. Recorded here as the working direction (owner-approved 2026-06-15).

- Bytes live in R2, not git. This sidesteps the repo-bloat pain every git-CMS cousin shares and uses
  the Cloudflare-native primitive.
- A logical reference lives in git and resolves at delivery. Content stores `media:<hash>` (or
  `media:<slug>.<hash>` for readable diffs), never a real URL. This mirrors cairn's existing `cairn:`
  internal-link scheme, which already resolves through the manifest at delivery, and it keeps the
  transform host and grammar out of committed content.
- Transforms run through Cloudflare Images on demand: format negotiation, quality, sizing, and focal
  point via `gravity=auto` (saliency) and `gravity=face`. One stored original, variants per request,
  no upload-time fan-out. The transform URL form is the path-segment family developers recognize
  (`/cdn-cgi/image/<options>/<source>`).
- Identity is a content hash, display is a slug, and both are kept. The R2 key is
  `media/<aa>/<hash>.<ext>` (a short hash-prefix fan-out so no single listing grows large). The
  public URL is `/media/<slug>.<hash>.<ext>`. A small git-committed manifest holds the display name,
  the original filename, alt, dimensions, and the full hash. This buys dedup, immutable caching,
  rename-without-broken-links, and a browsable library at once.
- Format normalization on ingest: transcode iPhone HEIC to a web format, and hash the normalized
  bytes so a re-upload of the same source dedupes.
- Manifest writes route through the existing per-entry branch and publish pipeline, which already
  serializes commits, rather than racing on one shared mutable file.
- Logging follows the existing doctrine. Give the media path its own event family
  (`media.uploaded`, `media.upload_failed`, `media.deleted`, and a delete-blocked or orphan event)
  so an editor's "my image did not save" maps to a record, consistent with `commit.failed`.

### The one product fork

The public URL form. Carry the slug for image SEO and readable URLs
(`/media/blue-running-shoes.a1b2c3d4.webp`), or keep it opaque for a privacy-forward site
(`/media/a1/a1b2c3d4.webp`). The R2 key and the git reference are identical either way, so this is a
one-line policy knob in the adapter, not an architecture change. Default proposal: carry the slug,
since cairn's "your files are just files, with clean URLs" story is a deliberate counter to the
opaque-CDN lock-in of the hosted builders.

## Image-specific states to design

The methodology requires enumerating the image states up front so the happy path does not stand in
for the design. Each gets a labeled treatment in the mockup:

- Upload in progress (determinate progress, the optimistic placeholder in the live preview).
- Upload failure (oversize, wrong type, network, binding missing), each with a clear message and a
  retry. No silent failure.
- Drag-and-drop (the drop target, the guarded drop so a stray drop does not navigate away).
- Paste from clipboard (a screenshot becoming a named asset, the contenteditable-grade handling).
- Large library (search, filter by type, pagination or virtualization, fast open).
- Empty library (first-run state that teaches the upload path).
- Alt text capture (required field or an explicit decorative choice, at insert).
- Naming at insert (the proposed name, the one-field rename).
- Focal point or crop (a draggable point whose preview matches the rendered crop).
- Replace-in-place (swap bytes, keep the reference).
- Delete with a usage check ("used in N entries," blocked or hard-confirmed).
- Dedup on upload (identical bytes resolve to the existing asset, with the reuse made visible).
- Messy real content (long filenames, missing alt, missing dimensions, many items, one item).

## Open decisions

- Public URL form (slug-carrying versus opaque). Default proposal: slug-carrying.
- Documents in the first pass or a fast follow. They are a stored file with fewer features (no
  transforms, a preserved download filename), so they are cheap to include, but they widen the first
  pass.
- Video provider default (Cloudflare Stream versus author-chooses-the-host). Stream fits the stack;
  the embed path works with any provider regardless.
- Focal point in the first pass or later. High delight, and Cloudflare Images supports it natively,
  so the cost is the editor control, not the backend.
- Folders versus tags versus smart filtering for organization. All are metadata; the question is the
  author-facing model.
- Mandatory alt versus a strong nudge with a decorative escape hatch.
- First-pass scope. Deferred per the owner until the unified model and the storage direction are
  locked, which this doc records as done.

## Sources

Git-based and static-site CMSs: Decap CMS issues
[#1046](https://github.com/decaporg/decap-cms/issues/1046),
[#946](https://github.com/decaporg/decap-cms/issues/946),
[#247](https://github.com/decaporg/decap-cms/issues/247),
[#1196](https://github.com/decaporg/decap-cms/issues/1196);
[Sveltia successor doc](https://sveltiacms.app/en/docs/successor-to-netlify-cms) and
[slugify request #422](https://github.com/sveltia/sveltia-cms/issues/422);
[Tina repo-media discussion #2298](https://github.com/tinacms/tinacms/discussions/2298),
[Tina Cloudinary blog](https://tina.io/blog/manage-your-media-with-cloudinary);
[Keystatic review](https://www.luckymedia.dev/insights/keystatic),
[Keystatic image field](https://keystatic.com/docs/fields/image);
[Pages CMS hands-on](https://css-tricks.com/using-pages-cms-for-static-site-content-management/);
[git bloat from images](https://www.codemzy.com/blog/hosting-image-files-without-bloating-git);
[GitHub Well-Architected, large repos](https://wellarchitected.github.com/library/architecture/recommendations/scaling-git-repositories/large-git-repositories/).

Incumbent media libraries: [WordPress media roadmap](https://make.wordpress.org/core/2023/07/07/media-library/),
[WP 5.3 big-image handling](https://make.wordpress.org/core/2019/10/09/introducing-handling-of-big-images-in-wordpress-5-3/),
[WP image-sizes time bomb](https://www.ilovewp.com/wordpress-image-sizes-a-ticking-time-bomb/),
[WP find unused media](https://www.wp-mediapapa.com/wordpress-find-unused-media/),
[FileBird installs](https://ninjateam.org/thousands-wordpress-sites-powered-by-filebird/);
[Ghost media-management forum](https://forum.ghost.org/t/media-management-in-ghost/39256),
[Ghost feature-image alt #12920](https://github.com/TryGhost/Ghost/issues/12920);
[Drupal Media Library overview](https://www.drupal.org/docs/core-modules-and-themes/core-modules/media-library-module/overview),
[Drupal alt-in-embed #2934405](https://www.drupal.org/project/drupal/issues/2934405),
[Drupal reuse-vs-alt #3083994](https://www.drupal.org/project/drupal/issues/3083994);
[Craft 5.10 deletion modal](https://craftcms.com/blog/craft-5-10-released),
[Craft rethinking subfolders](https://craftcms.com/blog/rethinking-volume-subfolders),
[Craft index perf #5262](https://github.com/craftcms/cms/issues/5262);
[Joomla 4 media manager](https://magazine.joomla.org/issues/2020/july-2020/j4-the-new-media-manager),
[Joomla scale #28392](https://issues.joomla.org/tracker/joomla-cms/28392);
[Squarespace asset library](https://www.collaborada.com/blog/squarespace-asset-library);
[Wix alt-text request](https://support.wix.com/en/article/wix-media-request-adding-alt-text-in-the-media-manager);
[Webflow replace-everywhere](https://university.webflow.com/videos/replacing-assets-in-the-assets-panel),
[Webflow alt-text update](https://webflow.com/updates/improve-accessibility-with-more-control-over-image-alt-tags),
[Webflow "where is this used" wishlist](https://wishlist.webflow.com/ideas/WEBFLOW-I-5230).

Headless and DAM: [Sanity presenting images](https://www.sanity.io/docs/apis-and-sdks/presenting-images),
[Sanity manage-assets](https://www.sanity.io/docs/content-lake/manage-assets),
[Sanity image-url footgun](https://github.com/sanity-io/image-url),
[Sanity preview mismatch #4652](https://github.com/sanity-io/sanity/issues/4652);
[Contentful Images API](https://www.contentful.com/developers/docs/references/images-api/),
[Contentful links and unresolved errors](https://www.contentful.com/developers/docs/concepts/links/),
[contentful-link-cleaner](https://github.com/contentful/contentful-link-cleaner),
[Contentful delete-an-asset](https://www.contentful.com/help/media/managing-assets/delete-an-asset/),
[Contentful "folders" are saved views](https://www.contentful.com/help/folders/);
[Strapi media library](https://docs.strapi.io/cms/features/media-library),
[Strapi mandatory-alt request](https://forum.strapi.io/t/mandatory-alternative-text-on-media-assets/18596),
[Strapi usage-on-delete request](https://forum.strapi.io/t/check-if-asset-is-being-used-on-delete-from-media-library-show-unused-assets/42396),
[Strapi cache-buster suffix #18691](https://github.com/strapi/strapi/issues/18691),
[Strapi filename underscore #22894](https://github.com/strapi/strapi/issues/22894);
[Storyblok image service](https://www.storyblok.com/docs/api/image-service),
[Storyblok roadmap SBD-1578](https://www.storyblok.com/roadmap),
[Storyblok cleanup tool](https://significa.co/blog/the-storyblok-cleanup-tool-we-forgot-we-built);
[Cloudinary transformation quotas](https://cloudinary.com/blog/understanding_cloudinary_s_transformation_quotas),
[ImageKit named transformations](https://imagekit.io/blog/using-named-transformations-imagekit/),
[imgix auto-cache-busting](https://docs.imgix.com/setup/serving-assets/auto-cache-busting).

Insertion and authoring flow: [GitHub writing and formatting](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax),
[GitHub private-attachment change](https://github.blog/changelog/2023-05-08-more-secure-private-attachments/),
[Ghost cards](https://ghost.org/help/cards/),
[Ghost drag-drop tip](https://forum.ghost.org/t/tip-drag-drop-photo-vs-image-command/34310),
[Gutenberg drag-drop review](https://wptavern.com/gutenberg-1-0-0-introduces-drag-and-drop-for-adding-image-blocks),
[NN/g drag-and-drop](https://www.nngroup.com/articles/drag-drop/),
[NN/g hidden menus](https://www.nngroup.com/articles/hamburger-menus/),
[Carbon file-uploader a11y](https://carbondesignsystem.com/components/file-uploader/accessibility/),
[markdown image syntax nudge](https://alexwlchan.net/2021/markdown-image-syntax/),
[WebAIM Million](https://webaim.org/projects/million/),
[ATAG 2.0](https://www.w3.org/TR/ATAG20/).

Multi-type coherence: [WordPress embed block](https://wordpress.org/documentation/article/embed-block/),
[Notion images, files, media](https://www.notion.com/help/images-files-and-media),
[why I stopped self-hosting video](https://dev.to/masonwritescode/why-i-stopped-self-hosting-videos-and-moved-to-a-video-api-fn3),
[Cloudflare Stream](https://developers.cloudflare.com/stream/),
[Mux buffering research](https://www.mux.com/blog/buffering-reduces-video-watch-time-by-40-according-to-research),
[Webflow SVG-as-image](https://webflow.com/blog/svg-file),
[Optimizely icon library](https://world.optimizely.com/blogs/ritu-madan/dates/2023/5/icon-library-in-optimizely-cms/),
[Craft Embedded Assets](https://plugins.craftcms.com/embeddedassets),
[Sanity custom YouTube embed](https://www.sanity.io/docs/developer-guides/portable-text-how-to-add-a-custom-youtube-embed-block),
[DAM vs CMS](https://www.mediavalet.com/blog/dam-vs-cms).

File naming and identity: [Kirby UUIDs](https://getkirby.com/docs/guide/uuids),
[Sanity content-hash assets](https://www.sanity.io/docs/content-lake/manage-assets),
[WP sanitize_file_name](https://developer.wordpress.org/reference/functions/sanitize_file_name/),
[Enable Media Replace plugin](https://wordpress.org/plugins/enable-media-replace/),
[Astro assets](https://docs.astro.build/en/reference/modules/astro-assets/),
[web.dev HTTP cache](https://web.dev/articles/http-cache),
[KeyCDN cache busting](https://www.keycdn.com/support/what-is-cache-busting),
[Google Images SEO](https://developers.google.com/search/docs/appearance/google-images),
[S3 object keys](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html),
[R2 limits](https://developers.cloudflare.com/r2/platform/limits/),
[git core.precomposeUnicode](https://git-scm.com/docs/git-config/2.14.6),
[case-sensitivity production break](https://dev.to/devnamdev/one-filename-change-zero-errors-production-broken-2kp1).

Cloudflare delivery: [transform via URL](https://developers.cloudflare.com/images/transform-images/transform-via-url/),
[AI face cropping](https://blog.cloudflare.com/ai-face-cropping-for-images/),
[R2 plus Image Resizing reference architecture](https://developers.cloudflare.com/reference-architecture/diagrams/content-delivery/optimizing-image-delivery-with-cloudflare-image-resizing-and-r2/).

## Caveats on the evidence

Reddit was blocked to the research crawlers, so first-person Reddit sentiment is absent; the
findings rest on official docs, issue trackers, product forums, UX writeups, and review
aggregators. Some lock-in and cost specifics come from vendors selling the alternative, so they
identify the shape of a pain reliably but carry bias. A handful of figures were flagged unverified
in the source notes (a WordPress productivity stat that traced to a low-authority blog was dropped;
Contentful's transform size limit reads as 100MB in current docs, not the widely repeated 20MB;
Storyblok's exact hash-change-on-replace rule could not be confirmed from one authoritative page).
The git-CMS, naming, and Cloudflare-capability findings are the best-grounded and the most
load-bearing for the architecture.

## Direction verdict and synthesis (2026-06-15)

Three mockups were built (insert-first, library-first, command-surface), rendered to images, and
judged by a three-lens panel: product UX, accessibility and design grade, and an adversary hunting
scale failures and faked hard parts. The panel converged. No single direction wins outright, and all
three lenses pointed at the same hybrid.

The synthesized winner:

- The insert path is an at-caret popover that keeps the manuscript visible (insert-first's
  composition), opened from a visible labeled Insert button plus slash, paste, and drag (the
  visible-fallback rule).
- The picker inside it is built on the conformant combobox-and-listbox accessibility spine from the
  command-surface direction (live `aria-activedescendant`, focus stays in the input), with inline row
  affordances: a "used in N" pill and a "needs alt" flag.
- The capture step is one card: the file, a slug-proposed editable name, and alt as a
  required-or-decorative radiogroup, captured in the same step as the file.
- It is backed by a first-class Media management screen (library-first) for browse, organize (folders
  and tags as metadata), bulk actions, usage audit, and a type-to-confirm safe-delete alertdialog.
- One library component, mounted twice (the popover for insertion, the screen for management), so
  behavior never drifts between two copies.

Each lens fed the synthesis differently. insert-first contributed first-contact clarity, design
grade, and the alt model; command-surface contributed the accessibility spine, the rendered
embed-and-icon panes, and the visible-fallback discipline; library-first contributed management depth
and the strongest safe-delete gate.

### The load-bearing correction: usage tracking must span edit branches

The adversarial lens found the one result that changes the architecture, not just the UI. "Used in N"
and its inverse "unused" are cairn's headline differentiator, and all three mockups painted them as
fact. Under the architecture, usage comes from grepping references, and cairn holds edits on per-entry
`cairn/<concept>/<id>` branches until a deliberate Publish. An index built only from `main` would call
an image used solely on an open edit branch "unused" and offer a clean delete, which silently breaks
that branch on publish. That is the exact footgun the git story is supposed to defeat, reintroduced
through the branch model.

The corrections, which belong in the spec:

- The usage index unions committed `main` with every open `cairn/*` edit branch.
- It greps every reference site: inline `![](media:...)`, the frontmatter hero field, and
  gallery-component references. A grep that misses frontmatter marks every hero-only image as an
  orphan. The library-first mockup encoded exactly this contradiction on `hero-winter.jpg`, which is
  the canary.
- The verdict reads "found in N entries" or "no references found," never "unused," and it carries the
  raw-HTML caveat (a reference inside hand-written HTML is not greppable).
- Safe-delete blocks on the union, not on `main` alone.

### Accepted, and deferred

Folded into the synthesis:

- The grid is a real roving `listbox`/`option` (or `grid`/`gridcell`), never `list`/`listitem` on
  interactive cards (the library-first accessibility break, where `role="listitem"` stripped the
  button semantics the keyboard model needed).
- Dedup is sequenced in the right order: the optimistic placeholder appears, the content hash
  resolves, then the placeholder commits or collapses into "reused existing." No instant-dedup claim
  at upload start.
- A HEIC tile shows a converting state until the transcode lands, since browsers cannot render HEIC.
- The at-caret popover falls back to a full-height sheet below a narrow breakpoint and flips to stay in
  the viewport.
- Embeds and icons stay out of the stored-files library grid. They are reachable from the one insert
  chooser (routing by intent), but the library screen holds stored files only. A cross-cutting
  "everything referenced" view, if wanted later, is a separate read-only audit.
- The insert surface stays scoped to media and does not subsume component insertion.

Deferred from the first pass:

- Focal point and crop. The control is high-value, but a faithful preview has to render through the
  same Cloudflare Images transform the delivery path uses, or it misleads (the Sanity
  preview-mismatch footgun), and all three mockups modeled the dot as a single-axis slider with the
  wrong ARIA. Cloudflare Images supports `gravity=auto` and `gravity=face`, so a sensible default crop
  ships without an editor control. The manual focal-point control is a fast follow once the storage
  and the library land.

### Process note: a frontend-design polish pass on the build

The synthesized rev.2 mockup is the design target. The implemented admin components then carry a
`frontend-design` polish pass once they render in the showcase, checked in both themes against the
editor-shell gold standard, so the media surfaces hold the same grade as the rest of the admin before
the gate. This is the post-build visual check the methodology's first refinement names, made a
required step for this pass.
