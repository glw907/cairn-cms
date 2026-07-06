<!-- @component
The AstroPaper port's public site footer, styled after `src/components/Footer.astro` (MIT). A
plain hairline-topped band: a social-links row (reversed to lead on wide screens, matching the
original's `sm:flex-row-reverse`) and a copyright line. Every color reads a DaisyUI role
utility or a cairn token, never a literal.
-->
<script lang="ts">
  const year = new Date().getFullYear();

  /** A social link: the visible label (for the accessible name), its target, and a `path` for
   *  this port's own simple mark (not the original's brand logos, out of scope for a license
   *  and layout fidelity port), distinct per platform so the row reads as more than repeated
   *  circles. */
  type SocialLink = { label: string; href: string; path: string };
  const socials: SocialLink[] = [
    {
      label: 'GitHub',
      href: 'https://github.com/satnaing/astro-paper',
      path: 'M12 3a9 9 0 0 0-2.85 17.54c.45.08.61-.2.61-.43v-1.5c-2.5.54-3.03-1.2-3.03-1.2-.41-1.03-1-1.31-1-1.31-.82-.56.06-.55.06-.55.9.06 1.38.93 1.38.93.8 1.37 2.1.97 2.62.74.08-.58.32-.97.57-1.2-2-.22-4.1-1-4.1-4.44 0-.98.35-1.78.92-2.4-.1-.23-.4-1.15.09-2.4 0 0 .75-.24 2.45.92a8.4 8.4 0 0 1 4.46 0c1.7-1.16 2.45-.92 2.45-.92.49 1.25.19 2.17.09 2.4.57.62.92 1.42.92 2.4 0 3.45-2.1 4.21-4.11 4.43.33.28.62.85.62 1.72v2.55c0 .23.16.51.62.43A9 9 0 0 0 12 3Z',
    },
    {
      label: 'X',
      href: 'https://x.com/',
      path: 'M5 5l14 14M19 5L5 19',
    },
    {
      label: 'LinkedIn',
      href: 'https://linkedin.com/',
      path: 'M4 9h3v10H4zM5.5 4a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM10 9h3v1.6c.6-1 1.6-1.8 3-1.8 2.4 0 4 1.6 4 4.8V19h-3v-4.8c0-1.4-.6-2.3-1.8-2.3-1 0-1.8.8-2.1 1.6-.1.3-.1.6-.1 1V19h-3Z',
    },
    {
      label: 'Email',
      href: 'mailto:hello@example.com',
      path: 'M4 6h16v12H4Zm0 0 8 7 8-7',
    },
  ];
</script>

<footer class="border-t border-card-border">
  <div class="mx-auto flex max-w-measure flex-col items-center justify-between gap-s px-m py-m sm:flex-row-reverse">
    <ul class="flex items-center gap-s" aria-label="Social links">
      {#each socials as social (social.href)}
        <li>
          <a
            href={social.href}
            class="focus-outline inline-flex h-9 w-9 items-center justify-center text-base-content hover:text-primary"
            aria-label={social.label}
            title={social.label}
          >
            {#if social.label === 'GitHub'}
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d={social.path} />
              </svg>
            {:else}
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                <path d={social.path} stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            {/if}
          </a>
        </li>
      {/each}
    </ul>
    <p class="m-0 text-step--1 text-base-content">
      Copyright &#169; {year} &nbsp;|&nbsp; All rights reserved.
    </p>
  </div>
</footer>

<style>
  .focus-outline:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
