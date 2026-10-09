// A stand-in for SvelteKit's $app/forms, wired in by the component project's vite alias. The real
// module exists only inside a kit app; MediaInsertPopover imports `deserialize` statically, so the
// alias points here. deserialize parses the action envelope (plain JSON) and devalue-parses its
// `data` field, the same two steps the real one runs, minus the app's custom decoders (the upload
// envelope carries only plain JSON-serializable data, so no custom decoder is needed under test).
//
// `enhance` and `applyAction` stand in for the form action the edit page submits through. The stand-in
// keeps the real contract a component depends on: the submit function runs first and may be async,
// the request is only "sent" after it settles, and the callback it returns receives the result. The
// network is replaced by `settleEnhance`, which a test calls with the result the server would give.
import { parse } from 'devalue';

/** Parse a serialized SvelteKit form-action result, matching the real $app/forms deserialize. */
export function deserialize(result: string): unknown {
  const parsed = JSON.parse(result);
  if (parsed.data) parsed.data = parse(parsed.data);
  return parsed;
}

/** One enhanced submission that got past its submit function: the request a real kit would send. */
export interface EnhanceRun {
  /** The action's `?/name` search (the submitter's formaction when it has one); the path is the test page's own. */
  action: string;
  /** The form data the request carries. */
  formData: FormData;
}

/** Every request an enhanced form sent, oldest first. A test clears it between cases. */
export const enhanceRuns: EnhanceRun[] = [];

/** Every result `applyAction` was handed, oldest first. A test clears it between cases. */
export const applyActionCalls: unknown[] = [];

/** Resolvers for requests sent but not yet answered, oldest first. */
const awaitingResult: Array<(result: unknown) => void> = [];

/** Answer the oldest unanswered request with `result`, as the server (or a failed fetch) would. */
export function settleEnhance(result: unknown): void {
  awaitingResult.shift()?.(result);
}

/** Forget every recorded run, applied result, and unanswered request. */
export function resetEnhance(): void {
  enhanceRuns.length = 0;
  applyActionCalls.length = 0;
  awaitingResult.length = 0;
}

/** Records the result. The real implementation updates the page's `form` and status in place. */
export async function applyAction(result: unknown): Promise<void> {
  applyActionCalls.push(result);
}

type SubmitInput = {
  action: URL;
  formData: FormData;
  formElement: HTMLFormElement;
  submitter: HTMLElement | null;
  cancel: () => void;
  controller: AbortController;
};
type ResultCallback = (input: {
  action: URL;
  formData: FormData;
  formElement: HTMLFormElement;
  result: unknown;
  update: () => Promise<void>;
}) => Promise<void> | void;

/** The `use:enhance` action: take over the submit event, run the submit function, then wait for the test to answer. */
export function enhance(
  formElement: HTMLFormElement,
  submit: (input: SubmitInput) => Promise<ResultCallback | void> | ResultCallback | void,
) {
  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const submitter = event.submitter;
    const action = new URL(
      submitter?.hasAttribute('formaction')
        ? (submitter as HTMLButtonElement).formAction
        : formElement.action,
    );
    const formData = new FormData(formElement, submitter);
    const callback = await submit({
      action,
      formData,
      formElement,
      submitter,
      cancel: () => {},
      controller: new AbortController(),
    });
    enhanceRuns.push({ action: action.search, formData });
    const result = await new Promise<unknown>((resolve) => awaitingResult.push(resolve));
    await callback?.({ action, formData, formElement, result, update: async () => {} });
  };
  formElement.addEventListener('submit', onSubmit);
  return { destroy: () => formElement.removeEventListener('submit', onSubmit) };
}
