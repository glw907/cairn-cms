// `photoswipe-dynamic-caption-plugin` (MIT, by the PhotoSwipe author) ships a plain ESM/UMD build
// with no TypeScript types of its own, and no `@types/photoswipe-dynamic-caption-plugin` package
// exists. This is the minimal ambient surface JustifiedGrid.svelte actually calls; see the
// package's own README for the full options shape.
declare module 'photoswipe-dynamic-caption-plugin' {
  import type PhotoSwipeLightbox from 'photoswipe/lightbox';

  /** The plugin's own constructor options, all optional (every field defaults as documented in
   *  the package README). */
  export interface DynamicCaptionOptions {
    captionContent?: string | ((slide: unknown) => string);
    type?: 'auto' | 'below' | 'aside';
    mobileLayoutBreakpoint?: number | (() => boolean);
    horizontalEdgeThreshold?: number;
    mobileCaptionOverlapRatio?: number;
    verticallyCenterImage?: boolean;
  }

  export default class PhotoSwipeDynamicCaption {
    constructor(lightbox: PhotoSwipeLightbox, options?: DynamicCaptionOptions);
  }
}
