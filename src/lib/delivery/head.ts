// cairn-cms: the delivery head component entry (@glw907/cairn-cms/delivery/head). CairnHead lives
// behind its own export so importing a delivery data helper from /delivery never pulls a .svelte
// module into the graph. A node-environment data import then needs no Svelte plugin. This barrel
// carries exactly the one Svelte component; a plain-data SEO helper belongs on /delivery/data
// instead, even one CairnHead itself consumes (SeoMeta), so a plain-Node tool never resolves a
// component just to reach the data it renders.
export { default as CairnHead } from './CairnHead.svelte';
