<!-- @component
The hugo-theme-gallery port's public footer, styled after the upstream demo's own `<footer>`
(nicokaiser/hugo-theme-gallery, MIT): a centered row of social icons, then a copyright line with
Imprint and GitHub links. Every icon here is this port's own simple mark, not the platform's brand
logo (the same discipline the Foxi port's share row and social row already set in this repo).
-->
<script lang="ts">
  import MailIcon from '@lucide/svelte/icons/mail';

  const year = new Date().getFullYear();

  /** A social link: the visible label (for the accessible name) and its target. `path` is this
   *  port's own simple glyph. */
  const socials: { label: string; href: string; path: string }[] = [
    {
      label: 'Facebook',
      href: 'https://www.facebook.com/',
      path: 'M14 4h3V1h-3a4 4 0 0 0-4 4v2H8v3h2v9h3v-9h3l1-3h-4V5c0-.6.4-1 1-1Z',
    },
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/',
      path: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 5.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM17 7h.01',
    },
    {
      label: 'GitHub',
      href: 'https://github.com/glw907/cairn-cms',
      path: 'M12 3a9 9 0 0 0-2.85 17.54c.45.08.61-.2.61-.43v-1.5c-2.5.54-3.03-1.2-3.03-1.2-.41-1.03-1-1.31-1-1.31-.82-.56.06-.55.06-.55.9.06 1.38.93 1.38.93.8 1.37 2.1.97 2.62.74.08-.58.32-.97.57-1.2-2-.22-4.1-1-4.1-4.44 0-.98.35-1.78.92-2.4-.1-.23-.4-1.15.09-2.4 0 0 .75-.24 2.45.92a8.4 8.4 0 0 1 4.46 0c1.7-1.16 2.45-.92 2.45-.92.49 1.25.19 2.17.09 2.4.57.62.92 1.42.92 2.4 0 3.45-2.1 4.21-4.11 4.43.33.28.62.85.62 1.72v2.55c0 .23.16.51.62.43A9 9 0 0 0 12 3Z',
    },
    {
      label: 'YouTube',
      href: 'https://www.youtube.com/',
      path: 'M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Zm6.5 2.2v5.6l4.8-2.8-4.8-2.8Z',
    },
  ];
</script>

<footer class="mt-2xl">
  <div class="flex flex-wrap items-center justify-center gap-m px-m pt-l">
    {#each socials as social (social.href)}
      <a
        href={social.href}
        target="_blank"
        rel="noopener noreferrer"
        title={social.label}
        aria-label={social.label}
        class="focus-outline inline-flex h-8 w-8 items-center justify-center text-base-content hover:opacity-80"
      >
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path d={social.path} stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </a>
    {/each}
    <a
      href="mailto:hello@example.com"
      title="Email"
      aria-label="Email"
      class="focus-outline inline-flex h-8 w-8 items-center justify-center text-base-content hover:opacity-80"
    >
      <MailIcon class="h-6 w-6" aria-hidden="true" />
    </a>
  </div>

  <div class="mt-s px-m pb-l text-center text-step--1 text-muted">
    <span>&#169; Your Name</span>
    <a href="/imprint" class="ml-2xs text-muted hover:text-base-content">Imprint</a>
    <a href="https://github.com/glw907/cairn-cms" class="ml-2xs text-muted hover:text-base-content">GitHub</a>
  </div>
</footer>

<style>
  .focus-outline:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
