// cairn-cms: the exhaustiveness guard for a closed discriminated union, co-located with
// `fields.ts` since `FieldDescriptor` is the union every dispatcher over it guards. A dispatcher
// ends its switch or if-chain in `default: unreachable(value, '<site>')` so the compiler proves
// every arm is handled before the code ever runs.

/**
 * Assert that `value` is unreachable at this point in a switch or if-chain over a closed union.
 *  TypeScript accepts the call only once every union member has been handled by an earlier case,
 *  narrowing the parameter's static type to `never`; adding a new arm to the union then fails
 *  `npm run check` right here, at the one place that must grow to match it. `context` names the
 *  dispatcher (and field, when relevant) so the thrown error, reached only if that compile-time
 *  proof is ever defeated by a cast, identifies which caller still needs the missing case. The
 *  message reads `value`'s own `type` discriminant rather than serializing the whole descriptor,
 *  since a descriptor can carry an author-supplied `label` or `default` not safe to echo back.
 */
export function unreachable(value: never, context: string): never {
  const type = (value as { type?: unknown }).type;
  throw new Error(`cairn: unreachable arm in ${context}: field type "${String(type)}"`);
}
