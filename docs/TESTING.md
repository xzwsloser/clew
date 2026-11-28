# TESTING.md — Quality Gates & Verification Strategy

## 1. Automated Quality Gates (Configured in M3)
- **Typecheck**: `pnpm run typecheck` (`tsc --noEmit` across all packages in strict mode).
- **Lint & Format**: `pnpm run lint` (ESLint + Prettier / consistent formatting checks).
- **Unit & Integration Tests**: `pnpm run test` (Vitest covering `@clew/shared`, `@clew/engine`, and plugin Host/Storage/Skill units).
- **Build**: `pnpm run build` (producing Host ESM and Client `window.__ModuleLoader__` bundles).
- **CI**: `.github/workflows/ci.yml` executes install, typecheck, lint, test, and build cleanly without personal credentials.

## 2. Real Host & Browser Verification
- **DSH Plugin Verification**: Load `@clew/dsh-plugin` in an isolated `dsh` profile (`DSH_HOME` temporary dir), run `dsh --dump-config`, boot `dsh web`, and verify RPC, SSE, Skills, Tools, and Web UI rendering.
- **Multi-Language E2E Validation (`docs/validation/`)**: End-to-end journeys on >=2 real open-source repositories across different language stacks with pinned Commit SHAs (repos excluded from Clew git tree).
- **UI Visual Review (`docs/UI-REVIEW.md`)**: Two full rounds using browser inspection & Playwright at `1280x800`, `1440x900`, and `1920x1080` in both light/dark themes and EN/ZH locales.

## 3. Rules
- Never weaken assertions or skip failing tests to pass CI.
- Never fabricate test results or performance metrics.
