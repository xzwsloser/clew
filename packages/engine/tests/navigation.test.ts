import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildRepositoryIndex,
  findReferences,
  fuzzySearchFilesAndSymbols,
  globalTextSearch,
  goToDefinition,
} from '../src/index.js';

describe('@clew/engine zero-config navigation & search', () => {
  it('ranks Go-to-Definition by scope/import/sibling/global and filters comments/strings in Find References', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'clew-nav-test-'));
    mkdirSync(join(repo, 'src', 'core'), { recursive: true });
    mkdirSync(join(repo, 'src', 'extra'), { recursive: true });

    writeFileSync(
      join(repo, 'src', 'core', 'token.ts'),
      'export function verifyToken(raw: string): boolean {\n  return raw.length > 0;\n}\n',
    );
    writeFileSync(
      join(repo, 'src', 'extra', 'legacy.ts'),
      'export function verifyToken(old: string): boolean {\n  return false;\n}\n',
    );
    writeFileSync(
      join(repo, 'src', 'core', 'handler.ts'),
      [
        'import { verifyToken } from "./token.js";',
        '// verifyToken should not appear in AST-filtered references',
        'const doc = "verifyToken string literal";',
        'export function handleReq(tok: string) {',
        '  return verifyToken(tok);',
        '}',
      ].join('\n'),
    );

    try {
      const index = await buildRepositoryIndex(repo);

      // Should jump unambiguously to src/core/token.ts because handler.ts explicitly imports it
      const def = goToDefinition(index, {
        file: 'src/core/handler.ts',
        line: 5,
        symbolName: 'verifyToken',
      });
      expect(def.mode).toBe('jump');
      expect(def.candidates[0]?.symbol.file).toBe('src/core/token.ts');
      expect(def.candidates[0]?.tier).toBe('resolved_import');

      // Find references should drop the comment and string literal in handler.ts
      const refs = await findReferences(index, { symbolName: 'verifyToken' });
      const handlerRefs = refs.filter((r) => r.file === 'src/core/handler.ts');
      expect(handlerRefs.some((r) => r.line === 2)).toBe(false);
      expect(handlerRefs.some((r) => r.line === 3)).toBe(false);
      expect(handlerRefs.some((r) => r.line === 5 && r.kind === 'call')).toBe(true);

      // Fuzzy search & global text search
      const fuzzy = fuzzySearchFilesAndSymbols(index, 'handleReq');
      expect(fuzzy[0]?.kind).toBe('symbol');
      expect(fuzzy[0]?.file).toBe('src/core/handler.ts');

      const textHits = await globalTextSearch({
        repoRoot: repo,
        query: 'verifyToken',
        caseSensitive: true,
      });
      expect(textHits.length).toBeGreaterThanOrEqual(4);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
