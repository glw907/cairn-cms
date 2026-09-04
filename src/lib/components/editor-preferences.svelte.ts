// cairn-cms: storage-backed toggle state for the editor's writing-mode preferences.

/**
 * The editor's per-browser writing-mode preferences: focus mode, typewriter, the author's own
 * spellcheck choice, the prose/markup surface posture, and zen. Each persists to its own
 * localStorage key, read once in an effect (so SSR never touches `localStorage`) and written by
 * its own setter.
 *
 * `setZen` here is state-only: it flips the flag and persists it. The host composes it with the
 * DOM choreography (finding the CodeMirror surface before the flip hides it, then moving focus
 * after `flushSync`), which stays in `EditPage.svelte` since it reads CodeMirror internal
 * classes and `check:cm-internals` only allowlists the shell for that.
 */
export function createEditorPreferences() {
  const focusStorageKey = 'cairn-editor-focus-mode';
  const typewriterStorageKey = 'cairn-editor-typewriter';
  const surfaceStorageKey = 'cairn-editor-surface';
  const zenStorageKey = 'cairn-editor-zen';
  // Stored as 'false' only when the author turns spellcheck off; any other value (including
  // unset) reads as on.
  const spellcheckStorageKey = 'cairn-editor-spellcheck';

  let focusMode = $state(false);
  let typewriter = $state(false);
  let ownSpellcheck = $state(true);
  // Zen: the manuscript alone on the recessed ground.
  let zen = $state(false);
  // The surface posture: prose (the writing instrument) by default; markup is the dense
  // working surface.
  let surface = $state<'prose' | 'markup'>('prose');

  $effect(() => {
    focusMode = localStorage.getItem(focusStorageKey) === 'true';
    typewriter = localStorage.getItem(typewriterStorageKey) === 'true';
    zen = localStorage.getItem(zenStorageKey) === 'true';
    if (localStorage.getItem(surfaceStorageKey) === 'markup') surface = 'markup';
    ownSpellcheck = localStorage.getItem(spellcheckStorageKey) !== 'false';
  });

  function setFocusMode(on: boolean) {
    focusMode = on;
    localStorage.setItem(focusStorageKey, String(on));
  }
  function setTypewriter(on: boolean) {
    typewriter = on;
    localStorage.setItem(typewriterStorageKey, String(on));
  }
  function setSpellcheck(on: boolean) {
    ownSpellcheck = on;
    localStorage.setItem(spellcheckStorageKey, String(on));
  }
  function setSurface(posture: 'prose' | 'markup') {
    surface = posture;
    localStorage.setItem(surfaceStorageKey, posture);
  }
  /** Flip zen and persist it. Carries no DOM read or focus move; the host composes those around
   *  the call (see this module's doc comment). */
  function setZen(on: boolean) {
    zen = on;
    localStorage.setItem(zenStorageKey, String(on));
  }

  return {
    get focusMode() {
      return focusMode;
    },
    get typewriter() {
      return typewriter;
    },
    get ownSpellcheck() {
      return ownSpellcheck;
    },
    get zen() {
      return zen;
    },
    get surface() {
      return surface;
    },
    setFocusMode,
    setTypewriter,
    setSpellcheck,
    setSurface,
    setZen,
  };
}
