<!-- @component
The AstroPaper port's public site footer, styled after `src/components/Footer.astro` (MIT). A
plain hairline-topped band: a social-links row (reversed to lead on wide screens, matching the
original's `sm:flex-row-reverse`) and a copyright line. Every color reads a DaisyUI role
utility or a cairn token, never a literal.
-->
<script lang="ts">
  const year = new Date().getFullYear();

  /** A social link: the visible label (for the accessible name), its target, and the Tabler
   *  outline icon's own path data (`icons-tabler-outline`, the set AstroPaper's `Socials.astro`
   *  itself renders from `src/assets/icons/socials/*.svg`, satnaing/astro-paper, MIT), one or more
   *  `<path>`s per glyph since several of these icons are multi-stroke. */
  type SocialLink = { label: string; href: string; paths: string[] };
  const socials: SocialLink[] = [
    {
      label: 'GitHub',
      href: 'https://github.com/satnaing/astro-paper',
      paths: [
        'M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5',
      ],
    },
    {
      label: 'X',
      href: 'https://x.com/',
      paths: ['M4 4l11.733 16h4.267l-11.733 -16z', 'M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772'],
    },
    {
      label: 'LinkedIn',
      href: 'https://linkedin.com/',
      paths: [
        'M8 11v5',
        'M8 8v.01',
        'M12 16v-5',
        'M16 16v-3a2 2 0 1 0 -4 0',
        'M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4z',
      ],
    },
    {
      label: 'Email',
      href: 'mailto:hello@example.com',
      paths: ['M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z', 'M3 7l9 6l9 -6'],
    },
  ];
</script>

<footer>
  <div class="mx-auto flex max-w-measure flex-col items-center justify-between gap-s border-t border-card-border px-m py-m sm:flex-row-reverse">
    <ul class="flex items-center gap-s" aria-label="Social links">
      {#each socials as social (social.href)}
        <li>
          <a
            href={social.href}
            class="focus-outline inline-flex h-9 w-9 items-center justify-center text-base-content hover:text-primary"
            aria-label={social.label}
            title={social.label}
          >
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              {#each social.paths as d (d)}
                <path {d} stroke-linecap="round" stroke-linejoin="round" />
              {/each}
            </svg>
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
