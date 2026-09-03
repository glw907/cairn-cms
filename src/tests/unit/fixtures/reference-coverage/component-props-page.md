### `CompA`

Stability tier: Extension API.

```ts
let { foo }: { foo: string } = $props();
```

### `CompC`

Stability tier: Extension API for its stable props below; every other prop is Unstable API.

```ts
let { value, registerEditor }: { value: string; registerEditor?: (api: unknown) => void } = $props();
```

#### `CompC` wiring props (Unstable API)

Stability tier: Unstable API.

| Prop | Type | What it does |
| --- | --- | --- |
| `spellcheckTest` | `{ createWorker?: () => unknown }` | test only. |
