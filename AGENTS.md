# Repository Guidelines

## Project Structure & Module Organization

- `src/main.ts` initializes Phaser, DOM overlays, audio, and persistence.
- `src/game/` contains scenes, content, collision geometry, state, and colocated `*.test.ts` files.
- `e2e/` contains Playwright user-flow tests.
- `public/assets/generated/` contains optimized runtime game art.
- `assets/imagegen-sources/` stores image sources and prompts; Vite does not ship them.
- `index.html` and `src/styles.css` define the accessible UI shell and responsive portrait layout.
- `dist/`, `coverage/`, and `test-results/` are generated; do not edit them.

## Build, Test, and Development Commands

```bash
pnpm install          # Install locked dependencies
pnpm dev              # Start Vite
pnpm build            # Type-check and build
pnpm test             # Run Vitest
pnpm test:coverage    # Enforce coverage thresholds
pnpm test:e2e         # Run Playwright mobile flows
pnpm preview          # Serve dist locally
```

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, single quotes, and no semicolons. Keep game rules in small pure functions and Phaser rendering in scene classes. Use `PascalCase` for types/classes and `camelCase` for functions/variables. No formatter or linter is configured; match surrounding code and run `pnpm build`.

## Image Generation & Processing

Use the built-in `imagegen` workflow, issuing one generation call per distinct asset. Match the soft 3D toy direction recorded in `assets/imagegen-sources/README.md`, and append every final prompt there. Generate sprites on a perfectly flat chroma-key background: use `#ff00ff` for green/yellow subjects and `#00ff00` for purple, blue, or pink subjects. Prohibit shadows, gradients, reflections, text, and use of the key color inside the character.

Save untouched sources under `assets/imagegen-sources/`, then create runtime alpha PNGs with:

```bash
.venv/bin/python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input assets/imagegen-sources/<name>-chroma.png \
  --out public/assets/generated/<name>.png \
  --auto-key border --soft-matte \
  --transparent-threshold 12 --opaque-threshold 220 --despill
```

Do not overwrite approved art; use versioned filenames while iterating. Confirm RGBA output, transparent corners, intact colors, clean edges, and readable gameplay-scale silhouettes. Phaser should reference only `public/assets/generated/`.

## Testing Guidelines

Add a failing test before changing gameplay logic. Unit tests use Vitest beside their source files; E2E files use `*.spec.ts` under `e2e/`. Maintain at least 80% global coverage. Collision and mobile-input changes require unit coverage and a Playwright regression.

## Commit & Pull Request Guidelines

Use `feat:`, `fix:`, or `test:` with focused, imperative summaries. PRs should explain visible behavior, list validation commands, link issues, and include portrait screenshots or recordings for gameplay changes.
