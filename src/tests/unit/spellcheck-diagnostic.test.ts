import { describe, it, expect, vi } from 'vitest';
import { buildSpellDiagnostic } from '../../lib/components/spellcheck.js';

// The diagnostic builder is the pure-ish seam Task 5 exposes: given a misspelled word, its range,
// the ranked suggestions, and the two callbacks (add to dictionary, ignore), it produces the
// Diagnostic the lint source emits. The rendered tooltip and the amber underline are proven in the
// Task 8 component test; here the actions array, its order, the severity, and the message are unit
// asserted without a browser or a real Worker.

describe('buildSpellDiagnostic: the correction popover contract', () => {
  const range = { from: 10, to: 16 };
  const suggestions = ['colour', 'color', 'dolour', 'colon', 'collar', 'caller', 'cooler'];

  function build() {
    return buildSpellDiagnostic('colur', range, suggestions, {
      onAddWord: vi.fn(),
      onIgnoreWord: vi.fn(),
    });
  }

  it('carries severity info, the word in its message, and the source tag', () => {
    const diagnostic = build();
    expect(diagnostic.severity).toBe('info');
    expect(diagnostic.message).toContain('colur');
    expect(diagnostic.source).toBe('cairn-spellcheck');
    expect(diagnostic.from).toBe(range.from);
    expect(diagnostic.to).toBe(range.to);
  });

  it('orders the actions: ranked suggestions (capped at five), then add, then ignore', () => {
    const diagnostic = build();
    const names = (diagnostic.actions ?? []).map((a) => a.name);
    // The first five entries are the top-ranked suggestions, in rank order.
    expect(names.slice(0, 5)).toEqual(['colour', 'color', 'dolour', 'colon', 'collar']);
    // The two management actions follow, in order.
    expect(names[5]).toBe('Add to dictionary');
    expect(names[6]).toBe('Ignore');
    expect(names).toHaveLength(7);
  });

  it('builds only the management actions when there are no suggestions', () => {
    const diagnostic = buildSpellDiagnostic('zzzzx', range, [], {
      onAddWord: vi.fn(),
      onIgnoreWord: vi.fn(),
    });
    const names = (diagnostic.actions ?? []).map((a) => a.name);
    expect(names).toEqual(['Add to dictionary', 'Ignore']);
  });

  it('a suggestion action dispatches one replace transaction over the word range', () => {
    const diagnostic = buildSpellDiagnostic('colur', range, ['colour'], {
      onAddWord: vi.fn(),
      onIgnoreWord: vi.fn(),
    });
    const action = (diagnostic.actions ?? [])[0]!;
    const view = { dispatch: vi.fn() };
    // The apply receives the diagnostic's current position (CodeMirror passes from/to).
    action.apply(view as never, range.from, range.to);
    expect(view.dispatch).toHaveBeenCalledTimes(1);
    expect(view.dispatch).toHaveBeenCalledWith({
      changes: { from: range.from, to: range.to, insert: 'colour' },
    });
  });

  it('the add action invokes onAddWord with the word, the ignore action invokes onIgnoreWord', () => {
    const onAddWord = vi.fn();
    const onIgnoreWord = vi.fn();
    const diagnostic = buildSpellDiagnostic('colur', range, [], { onAddWord, onIgnoreWord });
    const actions = diagnostic.actions ?? [];
    const view = { dispatch: vi.fn() };
    actions.find((a) => a.name === 'Add to dictionary')!.apply(view as never, range.from, range.to);
    actions.find((a) => a.name === 'Ignore')!.apply(view as never, range.from, range.to);
    expect(onAddWord).toHaveBeenCalledWith('colur');
    expect(onIgnoreWord).toHaveBeenCalledWith('colur');
  });
});
