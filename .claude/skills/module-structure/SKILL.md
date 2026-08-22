---
name: module-structure
description: How modules depend on each other in this Worker — the feature-first layout (posts as self-contained modules with an optional demo sub-router), the import direction rules, the no-barrel-files rule and why it exists, factory-function DI instead of a service container, where a shared helper may live, and the naming rules that prevent utils/helpers junk drawers. Use when creating a new post/feature/helper file, deciding where a function belongs, extracting shared code, noticing or introducing a circular import, tempted to add an index.ts re-export barrel, or running/interpreting a `madge` dependency check.
---

# Module structure and dependency rules

The module is the unit of architecture here — no service container, no framework layering. Structure is kept by four things: **the feature-first layout**, **import direction rules**, **factory-function dependency injection**, and **naming discipline for shared code**. Verify with madge (below); the baseline is **zero runtime circular dependencies**.

## Layout (feature-first)

```
src/
  index.tsx               composition root: mounts routes, demos, 404
  components/             shared JSX components (layout.tsx, …)
  styles.ts               stylesheet
  posts/
    types.ts              Post interface (leaf, types only)
    index.ts              post registry (ordered list + lookup)
    <slug>.tsx            one post per file: meta + Body + optional demo router
```

A post is the feature unit: its content, and — when it ships a live example — its own Hono sub-router (`demo`), live in one file (or a `posts/<slug>/` directory once it outgrows a single file). The composition root mounts each demo at `/demos/<slug>`.

## Import direction

Dependencies flow down; no value cycles:

- `index.tsx → posts/index.ts → posts/<slug>.tsx → posts/types.ts`
- **Posts never import the composition root, the registry, or each other.** If two posts need the same helper, that's a promotion signal (below), not a cross-post import.
- `components/`, `styles.ts`, and `posts/types.ts` are **leaves**: they import only each other and packages, never posts or `index.tsx`.
- A demo router receives its dependencies (bindings, config) via Hono context/parameters, not by importing consumer modules.

### No barrel files

Re-export barrels (`export *` from an `index.ts`) are **forbidden** beyond the single post registry. `export *` barrels turn every import into "load the whole directory including its routes", which creates module-init cycles and hides coupling. Import the specific module. If an import list grows long, that's coupling worth seeing, not hiding behind a barrel.

### Type-only imports

Type files may reference each other with `import type` — erased at compile time, so no runtime cycle exists. Never use a value import for what a type import can express. Two modules exporting the same shape is drift — one defines it, the other `import type`s it.

## Dependency injection: factories and parameters, not containers or singletons

- A function with dependencies takes a **parameter object** — the parameter type *is* the dependency declaration.
- Construction happens at the **composition root** — the Hono handler owning the request. Modules never reach into module-level singletons for I/O handles (KV, D1, R2 bindings); they receive them via `c.env` or parameters.
- Keep a **functional core**: validation, transformation, and decision logic as pure functions; effects stay in the thin orchestrating layer.

## Shared helpers without junk drawers

- **Name modules by domain noun, never by kind.** `slug.ts`, `safe-fetch.ts`, `image-size.ts` — never `utils.ts`, `helpers.ts`, `common.ts`.
- **Colocate until third use** (rule of three). A helper with one caller lives next to that caller. Promote to a shared module at the third user.
- **Extract knowledge, not lines.** Share a function when it encodes one domain decision; blocks that change for different reasons stay duplicated.
- A generic-looking helper that imports a feature is misfiled — it belongs in that feature.

## Verifying

```sh
npx madge --circular --extensions ts,tsx src
```

madge counts `import type` edges, so a reported cycle is only a defect when a value import participates. To see the graph: `npx madge --image graph.svg src`.
