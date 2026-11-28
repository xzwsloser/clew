---
name: clew-ui-review
description: Visual and UX review checklist for Clew Workbench and Homepage against DESIGN.md, DSH theme tokens, and real browser screenshots.
---

# Clew UI Review Checklist

1. **Token & Restraint Compliance**: Verify `--dsw-alias-*` integration, zero purple/blue SaaS gradients, zero gratuitous glassmorphism, and restrained developer-tool typography.
2. **Viewport Matrix**: Inspect in real browser (Playwright / Antigravity browser) at `1280x800`, `1440x900`, and `1920x1080`.
3. **Theme & Locale Matrix**: Verify both Light & Dark themes and `EN` & `ZH` locales with mixed CJK/Latin/monospace code rendering.
4. **Functional States**: Verify Empty, Loading (real progress), Error/Retry, Cancelled, No Results, long files, dense trace graphs, and keyboard navigation (`Cmd/Ctrl+P`, `Cmd/Ctrl+Shift+F`, `Alt+Left/Right`, `Esc`).
5. **Artifact Rule**: Save real screenshots and findings in `docs/UI-REVIEW.md`; never substitute concept mockups for real product screenshots.
