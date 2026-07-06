<!-- @component The /changelog page, styled after `src/pages/changelog.astro`
     (oxygenna-themes/foxi-astro-theme, MIT): a page header, the version timeline, and a closing
     CTA. -->
<script lang="ts">
  import ChangelogTimeline from '$theme/components/ChangelogTimeline.svelte';
  import CTABanner from '$theme/components/CTABanner.svelte';
  import { changelogEntries } from '$theme/data/changelog.js';
</script>

<svelte:head>
  <title>Changelog | Foxi</title>
</svelte:head>

<div class="cairn-band">
  <div class="site-wide cairn-hero mx-auto max-w-measure text-center">
    <h1 class="cairn-hero-title">
      Foxi Version Updates and <strong class="text-primary">Enhancements</strong>
    </h1>
    <p class="cairn-hero-lead mx-auto">Stay informed about all the new updates and improvements in Foxi.</p>
  </div>
</div>

<div class="site-wide py-2xl">
  <div class="mx-auto max-w-measure">
    <ChangelogTimeline entries={changelogEntries} />
  </div>
</div>

<div class="site-wide pb-2xl">
  <CTABanner
    title="Join the Foxi Revolution!"
    text="Discover why thousands of professionals trust our platform to streamline their workflow and enhance productivity."
    variant="light"
    ratingText="30K customer ratings"
    buttonLabel="Get started now!"
    buttonHref="/pricing"
  />
</div>
