import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectLanguage, searchWithRipgrep } from '../src/index.js';

describe('@clew/engine language detector & ripgrep search', () => {
  it('detects all P0 languages and falls back to text', () => {
    expect(detectLanguage('app/main.py')).toBe('python');
    expect(detectLanguage('include/mem.h')).toBe('c');
    expect(detectLanguage('src/kernel.cpp')).toBe('cpp');
    expect(detectLanguage('cmd/server.go')).toBe('go');
    expect(detectLanguage('src/lib.rs')).toBe('rust');
    expect(detectLanguage('src/index.tsx')).toBe('typescript');
    expect(detectLanguage('scripts/run.mjs')).toBe('javascript');
    expect(detectLanguage('README.md')).toBe('text');
  });

  it('searches safely with ripgrep and respects repo boundaries', async () => {
    const base = mkdtempSync(join(tmpdir(), 'clew-engine-test-'));
    mkdirSync(join(base, 'src'), { recursive: true });
    writeFileSync(join(base, 'src', 'router.ts'), 'export function dispatchRoute() {\n  return 42;\n}\n');
    writeFileSync(join(base, 'src', 'other.ts'), 'const value = dispatchRoute();\n');

    try {
      const results = await searchWithRipgrep({
        repoRoot: base,
        query: 'dispatchRoute',
        wordBoundary: true,
      });
      expect(results.length).toBe(2);
      expect(results[0]?.file).toMatch(/^src\//);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
