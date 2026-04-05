# Tailwind 4.1 geometric texture API proposal

This is the utility contract paired with the updated preview artifact.

## Utility names

Core set:

- `tx-base`
- `tx-plain-grid`
- `tx-pluses`
- `tx-checks`
- `tx-diamonds`
- `tx-triangles`
- `tx-hex-grid`

Research candidates:

- `tx-cross-dots`
- `tx-zigzag`
- `tx-crosshatch`
- `tx-concentric-squares`

## Variable contract

Shared variables:

- `--tx-bg`
- `--tx-grid-color`
- `--tx-furniture-color`
- `--tx-cell-w`
- `--tx-cell-h`
- `--tx-grid-line`
- `--tx-mark-size`
- `--tx-mark-thickness`

Notes:

- `--tx-grid-color` controls the square grid and the hex-grid mesh.
- `--tx-furniture-color` controls corner furniture and interior repeat motifs.
- `--tx-cell-w` and `--tx-cell-h` remain independently overridable so rectangular cells are supported.
- Some patterns intentionally ignore one or more variables when the geometry does not have a separate furniture layer.

## Intended Tailwind 4.1 usage shape

```html
<div
  class="tx-base tx-hex-grid
         [--tx-bg:#f8fafc]
         [--tx-grid-color:#cbd5e1]
         [--tx-furniture-color:#0f172a]
         [--tx-cell-w:44px]
         [--tx-cell-h:44px]
         [--tx-grid-line:1px]
         [--tx-mark-size:9px]
         [--tx-mark-thickness:2.5px]">
</div>
```

## Selection rationale

The narrowed core set is:

- plain grid
- pluses
- checks
- diamonds
- triangles
- hex grid

The four research candidates in the preview are:

- cross-dots
- zigzag
- crosshatch
- concentric squares

Why these candidates:

- `cross-dots` and `zigzag` show up directly in established Tailwind/CSS pattern libraries.
- `crosshatch` is a common repeat in current CSS pattern generators and libraries.
- `concentric-squares` gives a denser technical repeat that is still geometric and tunable with the same variable model.

## Tailwind 4.1 implementation direction

The production implementation should stay CSS-first and use:

- `@utility` for registering `tx-*` utilities
- `@custom-variant` only where project-specific selector variants are needed
- CSS variables for all geometry and color overrides
- `background-image`, `background-size`, and SVG data URLs only where a gradient stack is not expressive enough
