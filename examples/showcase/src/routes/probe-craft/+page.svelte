<!-- @component The craft chapter's acceptance fixture (design infrastructure Pass 3, Task 11):
     a small admin-shaped screen assembled entirely from stock DaisyUI v5 components, importing no
     cairn token, recipe, or component. This route exists only to prove the craft chapter's
     acceptance test (spec section 12, criterion 5): a fresh agent given this fixture and the
     chapter alone should be able to move it measurably toward the cairn feel, with no human art
     direction. It is a STANDING fixture across acceptance rounds; the markup below stays as-is
     between runs so every round starts from the same "before" state, and a chapter amendment gets
     re-tested against this same page rather than a new one.

     Deliberately un-cairn: no `cairn-admin.css`, no `admin-toolkit`/`admin-fields` import, no
     grammar token (`type-*`/`gap-*`), no `StatusChip`. `probe-craft.css` is this route's own
     from-scratch Tailwind/DaisyUI build, the stock defaults a fresh build reaches for first.

     `?theme=dark` switches the DaisyUI theme server-side (both are DaisyUI's own bundled themes,
     `light`/`dark`), so a screenshot needs no client script or interaction to settle: navigate to
     `/probe-craft` for light and `/probe-craft?theme=dark` for dark. The "Switch to ..." link
     exists for a human or agent exploring the fixture directly in a browser. -->
<script lang="ts">
  import { page } from '$app/state';
  import probeCraftCss from './probe-craft.css?url';

  const theme = $derived(page.url.searchParams.get('theme') === 'dark' ? 'dark' : 'light');
  const otherTheme = $derived(theme === 'dark' ? 'light' : 'dark');

  const members = [
    { name: 'Priya Natarajan', standing: 'Current', joined: '2024-03-11', balance: '$85.00' },
    { name: 'Owen Fitzgerald', standing: 'Overdue', joined: '2022-09-02', balance: '$1,240.00' },
    { name: 'Mei Lin Zhao', standing: 'Current', joined: '2025-01-27', balance: '$0.00' },
    { name: 'Former', standing: 'Former', joined: '2019-06-15', balance: '$0.00' },
  ];
</script>

<svelte:head>
  <link rel="stylesheet" href={probeCraftCss} />
  <title>Craft chapter fixture</title>
</svelte:head>

<div data-theme={theme} class="min-h-screen bg-base-200 p-8">
  <div class="mx-auto max-w-4xl space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Members</h1>
      <div class="flex items-center gap-2">
        <a class="link text-sm" href="?theme={otherTheme}">Switch to {otherTheme}</a>
        <button type="button" class="btn btn-primary">New member</button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <input type="search" placeholder="Search members" class="input w-64" />
      <select class="select w-40">
        <option>All standings</option>
        <option>Current</option>
        <option>Overdue</option>
        <option>Former</option>
      </select>
    </div>

    <div class="overflow-x-auto rounded-box border border-base-300 shadow">
      <table class="table w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Standing</th>
            <th>Joined</th>
            <th>Balance</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each members as member (member.name)}
            <tr>
              <td>{member.name}</td>
              <td><span class="badge badge-ghost">{member.standing}</span></td>
              <td>{member.joined}</td>
              <td>{member.balance}</td>
              <td>
                <button
                  type="button"
                  class="btn btn-circle btn-ghost btn-sm"
                  aria-label="Edit {member.name}"
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                    <path d="M5 2l6 6-6 6V2z" />
                  </svg>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="join">
      <button type="button" class="btn join-item btn-sm">1</button>
      <button type="button" class="btn join-item btn-sm">2</button>
      <button type="button" class="btn join-item btn-sm">3</button>
    </div>

    <form class="space-y-3 rounded-box border border-base-300 p-4">
      <fieldset>
        <legend class="text-sm">Add a renewal message</legend>
        <label class="block text-sm">
          Message
          <textarea class="textarea w-full" rows="3"></textarea>
        </label>
      </fieldset>
      <button type="submit" class="btn btn-primary">Save</button>
    </form>
  </div>
</div>
