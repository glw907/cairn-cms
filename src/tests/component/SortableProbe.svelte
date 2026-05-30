<!-- @component A minimal sortable list proving the library mounts under Svelte 5 runes. -->
<script lang="ts">
  import { SortableList, sortItems } from '@rodrigodagostino/svelte-sortable-list';
  import type { SortableList as SortableListNS } from '@rodrigodagostino/svelte-sortable-list';

  let items = $state([
    { id: 'a', text: 'Alpha' },
    { id: 'b', text: 'Bravo' },
  ]);

  function handleDragEnd(e: SortableListNS.RootEvents['ondragend']) {
    if (!e.isCanceled && typeof e.targetItemIndex === 'number' && e.draggedItemIndex !== e.targetItemIndex) {
      items = sortItems(items, e.draggedItemIndex, e.targetItemIndex);
    }
  }
</script>

<SortableList.Root ondragend={handleDragEnd}>
  {#each items as item, index (item.id)}
    <SortableList.Item id={item.id} {index}>
      <span>{item.text}</span>
    </SortableList.Item>
  {/each}
</SortableList.Root>
