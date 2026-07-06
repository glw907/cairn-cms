<!-- @component
The Foxi port's public site footer, styled after `src/config/footerNavigation.ts` and
`src/components/ui/Footer.astro` (oxygenna-themes/foxi-astro-theme, MIT). A wordmark and short
about line on the left, three link columns (Product, About us, Get in touch) on the right, and
a hairline-topped bottom bar with the copyright line and social icons. Every color reads a
DaisyUI role utility or a cairn token, never a literal.
-->
<script lang="ts">
  const year = new Date().getFullYear();

  type FooterColumn = { category: string; links: { label: string; href: string }[] };
  const columns: FooterColumn[] = [
    {
      category: 'Product',
      links: [
        { label: 'Features', href: '/features' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Changelog', href: '/changelog' },
        { label: 'Terms', href: '/terms' },
      ],
    },
    {
      category: 'About us',
      links: [
        { label: 'About us', href: '/' },
        { label: 'News', href: '/blog' },
      ],
    },
    {
      category: 'Get in touch',
      links: [{ label: 'Contact', href: '/contact' }],
    },
  ];

  /** A social link: the visible label (for the accessible name), its target, and a `path` for
   *  this port's own simple mark (not the original's brand logos, out of scope for a license
   *  and layout fidelity port). */
  type SocialLink = { label: string; href: string; path: string };
  const socials: SocialLink[] = [
    {
      label: 'X',
      href: 'https://x.com/',
      path: 'M5 5l14 14M19 5L5 19',
    },
    {
      label: 'GitHub',
      href: 'https://github.com/glw907/cairn-cms',
      path: 'M12 3a9 9 0 0 0-2.85 17.54c.45.08.61-.2.61-.43v-1.5c-2.5.54-3.03-1.2-3.03-1.2-.41-1.03-1-1.31-1-1.31-.82-.56.06-.55.06-.55.9.06 1.38.93 1.38.93.8 1.37 2.1.97 2.62.74.08-.58.32-.97.57-1.2-2-.22-4.1-1-4.1-4.44 0-.98.35-1.78.92-2.4-.1-.23-.4-1.15.09-2.4 0 0 .75-.24 2.45.92a8.4 8.4 0 0 1 4.46 0c1.7-1.16 2.45-.92 2.45-.92.49 1.25.19 2.17.09 2.4.57.62.92 1.42.92 2.4 0 3.45-2.1 4.21-4.11 4.43.33.28.62.85.62 1.72v2.55c0 .23.16.51.62.43A9 9 0 0 0 12 3Z',
    },
    {
      label: 'Discord',
      href: 'https://discord.com/',
      path: 'M6 8c3-1.5 9-1.5 12 0M6 8c-1 3-1 7 0 9 1.5 1 3 1.5 4 1.7l1-2M18 8c1 3 1 7 0 9-1.5 1-3 1.5-4 1.7l-1-2M9 13.5c0 .8-.7 1.5-1.5 1.5S6 14.3 6 13.5 6.7 12 7.5 12 9 12.7 9 13.5ZM18 13.5c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5.7-1.5 1.5-1.5 1.5.7 1.5 1.5Z',
    },
  ];
</script>

<footer class="border-t border-card-border bg-base-200">
  <div class="site-wide flex flex-col gap-l py-2xl md:flex-row md:justify-between">
    <div class="max-w-sm">
      <a href="/" class="inline-flex items-center gap-2 font-display text-step-2 font-bold text-base-content no-underline">
        <svg class="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            d="M12 2c1.7 2 3 3.7 3 5.7 0 1-.4 1.8-1 2.5 1.8.7 3 2.5 3 4.6 0 3-2.6 5.2-5 6.7v.5h-2 v-.5c-2.4-1.5-5-3.7-5-6.7 0-2.1 1.2-3.9 3-4.6-.6-.7-1-1.5-1-2.5C6 5.7 7.3 4 9 2c.3 1 .8 2 1.5 2.7C11 4 11.5 3 12 2Z"
          />
        </svg>
        Foxi.
      </a>
      <p class="mt-2xs text-step-0 text-muted">
        Expertly made, responsive, accessible components ready to be used on your website or app,
        composed entirely from cairn's chrome, composition, and token seams.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-l sm:grid-cols-3">
      {#each columns as column (column.category)}
        <div>
          <h2 class="mb-2xs text-step--1 font-semibold text-base-content">{column.category}</h2>
          <ul class="flex flex-col gap-1">
            {#each column.links as link (link.href)}
              <li><a href={link.href} class="text-step--1 text-muted hover:text-primary">{link.label}</a></li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </div>

  <div class="border-t border-card-border">
    <div class="site-wide flex flex-col items-center justify-between gap-s py-s sm:flex-row">
      <p class="m-0 text-step--1 text-muted">&#169; Foxi {year}.</p>
      <ul class="flex items-center gap-s" aria-label="Social links">
        {#each socials as social (social.href)}
          <li>
            <a
              href={social.href}
              class="focus-outline inline-flex h-9 w-9 items-center justify-center text-base-content hover:text-primary"
              aria-label={social.label}
              title={social.label}
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                <path d={social.path} stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</footer>

<style>
  .focus-outline:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
