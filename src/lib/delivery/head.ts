// cairn-cms: the delivery head component entry (@glw907/cairn-cms/delivery/head). CairnHead lives
// behind its own export so importing a delivery data helper from /delivery never pulls a .svelte
// module into the graph. A node-environment data import then needs no Svelte plugin.
export { default as CairnHead } from './CairnHead.svelte';
