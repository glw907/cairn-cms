// cairn-cms: the Standard Schema conformance types, shared by both the v1 schema and the v2
// fieldset validators. They live here, apart from either validator, so the v2 `fieldset` keeps
// importing them once the v1 `schema.ts` is removed at the Contract v2 cutover.

/** The validate input the cairn adapter takes: the raw frontmatter and the body. */
export interface StandardInput {
  frontmatter: Record<string, unknown>;
  body: string;
}

/**
 * A minimal local copy of the Standard Schema v1 interface (https://standardschema.dev), so the
 *  schema is a drop-in where the ecosystem accepts a validator, with no runtime dependency.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => StandardResult<Output>;
    readonly types?: { readonly input: Input; readonly output: Output };
  };
}
type StandardResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<{ readonly message: string; readonly path?: ReadonlyArray<PropertyKey> }> };
