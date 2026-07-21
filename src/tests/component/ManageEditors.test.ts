import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ManageEditors from '../../lib/components/ManageEditors.svelte';
import type { Capability } from '../../lib/auth/roles.js';
import type { Role } from '../../lib/auth/types.js';

const DEFAULT_VOCABULARY: { role: string; capability: Capability }[] = [
  { role: 'owner', capability: 'owner' },
  { role: 'editor', capability: 'editor' },
];

// An ASC-shaped vocabulary: 'owner' plus 'president' (a second owner-level name), 'club-admin'
// (editor capability under a site-chosen name), and 'instructor' (none capability).
const ASC_VOCABULARY: { role: string; capability: Capability }[] = [
  { role: 'owner', capability: 'owner' },
  { role: 'president', capability: 'owner' },
  { role: 'club-admin', capability: 'editor' },
  { role: 'instructor', capability: 'none' },
];

function data() {
  return {
    editors: [
      { email: 'owner@t', displayName: 'Owner One', role: 'owner' as const, capability: 'owner' as const },
      { email: 'ed@t', displayName: 'Ed Two', role: 'editor' as const, capability: 'editor' as const },
    ],
    self: 'owner@t',
    error: null,
    vocabulary: DEFAULT_VOCABULARY,
  };
}

describe('ManageEditors', () => {
  it('renders its header and table through the admin toolkit', async () => {
    // The admin-toolkit organization pass's T7 adoption sweep: the header band and the editor
    // table render through the toolkit's own components (PageHeader, AdminTable), not a bespoke
    // fork. Each assertion pins a structural signature the toolkit component itself owns.
    const screen = render(ManageEditors, { data: data(), form: null });
    expect(screen.container.querySelector('header.mb-10')).not.toBeNull();
    expect(screen.container.querySelector('.toolkit-admin-table-wrap')).not.toBeNull();
  });

  it('lists editors with their roles', async () => {
    const screen = render(ManageEditors, { data: data(), form: null });
    await expect.element(screen.getByText('Owner One')).toBeInTheDocument();
    await expect.element(screen.getByText('Ed Two')).toBeInTheDocument();
  });

  it('disables the remove control for the acting owner (anti-lockout affordance)', async () => {
    const screen = render(ManageEditors, { data: data(), form: null });
    const selfRemove = screen.getByRole('button', { name: /remove owner one/i });
    await expect.element(selfRemove).toBeDisabled();
  });

  it('renders an add-editor form', async () => {
    const screen = render(ManageEditors, { data: data(), form: null });
    await expect.element(screen.getByRole('button', { name: /add editor/i })).toBeInTheDocument();
  });

  it('posts the dispatcher-named ?/addEditor, ?/removeEditor, and ?/setRole actions', async () => {
    const screen = render(ManageEditors, { data: data(), form: null });
    const actions = [...screen.container.querySelectorAll('form[method="POST"]')].map((form) =>
      form.getAttribute('action'),
    );
    expect(actions).toContain('?/addEditor');
    expect(actions).toContain('?/removeEditor');
    expect(actions).toContain('?/setRole');
    expect(actions).not.toContain('?/add');
    expect(actions).not.toContain('?/remove');
  });

  it('carries a CSRF field in every POST form', async () => {
    const screen = render(ManageEditors, { data: data(), form: null });
    const postForms = screen.container.querySelectorAll('form[method="POST"]');
    const csrfFields = screen.container.querySelectorAll('form[method="POST"] input[name="csrf"]');
    expect(postForms.length).toBeGreaterThan(0);
    expect(csrfFields.length).toBe(postForms.length);
  });

  it('surfaces an action error', async () => {
    const screen = render(ManageEditors, { data: data(), form: { error: 'That editor already exists' } });
    const alert = screen.container.querySelector('.alert-error');
    expect(alert?.textContent).toContain('That editor already exists');
    // The visible alert carries the message with no role of its own; a persistent polite live
    // region announces it instead (the ConceptList discipline).
    expect(alert?.getAttribute('role')).toBeNull();
    const region = screen.container.querySelector('[aria-live="polite"]');
    expect(region?.textContent ?? '').toContain('That editor already exists');
  });

  it('surfaces a redirected unexpected-failure error carried on data.error (no fail() form)', async () => {
    const screen = render(ManageEditors, {
      data: { ...data(), error: 'Something went wrong and your changes were not saved.' },
      form: null,
    });
    const alert = screen.container.querySelector('.alert-error');
    expect(alert?.textContent).toContain('Something went wrong and your changes were not saved.');
  });
});

describe('ManageEditors vocabulary-driven role control', () => {
  it('renders the owner/editor toggle button for the default two-role vocabulary', async () => {
    const screen = render(ManageEditors, { data: data(), form: null });
    await expect.element(screen.getByRole('button', { name: /toggle role for owner one/i })).toBeInTheDocument();
    expect(screen.container.querySelector('select[aria-label*="Change role"]')).toBeNull();
  });

  it('renders a labeled select with capability shown beside each name for a larger vocabulary', async () => {
    const screen = render(ManageEditors, {
      data: {
        editors: [
          { email: 'owner@t', displayName: 'Owner One', role: 'owner' as const, capability: 'owner' as const },
          {
            email: 'ted@t',
            displayName: 'Ted Instructor',
            role: 'instructor' as unknown as Role,
            capability: 'none' as const,
          },
        ],
        self: 'owner@t',
        error: null,
        vocabulary: ASC_VOCABULARY,
      },
      form: null,
    });
    expect(screen.container.querySelector('button[aria-label*="Toggle role"]')).toBeNull();
    const select = screen.container.querySelector('select[aria-label="Change role for Ted Instructor"]');
    expect(select).not.toBeNull();
    const optionText = [...(select as unknown as HTMLSelectElement).options].map((option) => option.textContent);
    expect(optionText).toContain('instructor (none)');
    expect(optionText).toContain('club-admin (editor)');
  });

  it('submits the selected role name from the vocabulary select', async () => {
    const screen = render(ManageEditors, {
      data: {
        editors: [
          { email: 'owner@t', displayName: 'Owner One', role: 'owner' as const, capability: 'owner' as const },
          {
            email: 'ted@t',
            displayName: 'Ted Instructor',
            role: 'club-admin' as unknown as Role,
            capability: 'editor' as const,
          },
        ],
        self: 'owner@t',
        error: null,
        vocabulary: ASC_VOCABULARY,
      },
      form: null,
    });
    const select = screen.container.querySelector(
      'select[aria-label="Change role for Ted Instructor"]',
    ) as unknown as HTMLSelectElement;
    const captured = { role: '', email: '' };
    const stop = (event: Event) => {
      event.preventDefault();
      const form = event.target as unknown as HTMLFormElement;
      captured.role = (form.elements.namedItem('role') as unknown as HTMLSelectElement).value;
      captured.email = (form.elements.namedItem('email') as unknown as HTMLInputElement).value;
    };
    document.addEventListener('submit', stop, true);
    try {
      select.value = 'instructor';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const form = select.closest('form') as unknown as HTMLFormElement;
      (form.querySelector('button[type="submit"]') as unknown as HTMLButtonElement).click();
    } finally {
      document.removeEventListener('submit', stop, true);
    }
    expect(captured.role).toBe('instructor');
    expect(captured.email).toBe('ted@t');
  });

  it('marks an owner-capability row with the primary badge under a non-owner role name', async () => {
    const screen = render(ManageEditors, {
      data: {
        editors: [
          { email: 'owner@t', displayName: 'Owner One', role: 'owner' as const, capability: 'owner' as const },
          {
            email: 'pres@t',
            displayName: 'President Two',
            role: 'president' as unknown as Role,
            capability: 'owner' as const,
          },
        ],
        self: 'owner@t',
        error: null,
        vocabulary: ASC_VOCABULARY,
      },
      form: null,
    });
    const badges = [...screen.container.querySelectorAll('.badge')];
    const presidentBadge = badges.find((badge) => badge.textContent?.trim() === 'president');
    expect(presidentBadge?.classList.contains('badge-primary')).toBe(true);
  });
});
