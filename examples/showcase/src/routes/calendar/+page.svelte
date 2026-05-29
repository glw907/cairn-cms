<!-- @component The /calendar route: a site-owned feature beside /admin, proving cairn does not interfere. -->
<script lang="ts">
  import Calendar from './Calendar.svelte';
  const events = [
    { date: '2026-06-01', title: 'Season opener' },
    { date: '2026-06-08', title: 'Club race' },
  ];
</script>

<h1>Calendar</h1>
<Calendar {events} />
