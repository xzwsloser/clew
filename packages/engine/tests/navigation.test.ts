import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildRepositoryIndex,
  findReferences,
  fuzzySearchFilesAndSymbols,
  globalTextSearch,
  goToDefinition,
  peekSymbolPreview,
  readLineGitContext,
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

  it('previews struct/interface symbols via peekSymbolPreview and reads git line commit context safely', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'clew-p1-nav-'));
    try {
      mkdirSync(join(repo, 'src'), { recursive: true });
      writeFileSync(
        join(repo, 'src', 'types.ts'),
        [
          '// Core engine configuration record',
          'export interface EngineConfig {',
          '  maxDepth: number;',
          '  cacheDir: string;',
          '}',
        ].join('\n'),
      );
      execFileSync('git', ['-C', repo, 'init', '-b', 'main'], { stdio: 'ignore' });
      execFileSync('git', ['-C', repo, 'config', 'user.email', 'test@example.com'], { stdio: 'ignore' });
      execFileSync('git', ['-C', repo, 'config', 'user.name', 'Test User'], { stdio: 'ignore' });
      execFileSync('git', ['-C', repo, 'add', 'src/types.ts'], { stdio: 'ignore' });
      execFileSync('git', ['-C', repo, 'commit', '-m', 'feat: add EngineConfig'], { stdio: 'ignore' });

      const index = await buildRepositoryIndex(repo);
      const peek = await peekSymbolPreview(index, 'EngineConfig', 'src/types.ts', 2);
      expect(peek.found).toBe(true);
      expect(peek.symbol?.kind).toBe('interface');
      expect(peek.docComment).toContain('Core engine configuration record');
      expect(peek.snippetLines.some((l) => l.text.includes('maxDepth'))).toBe(true);

      const commits = await readLineGitContext(repo, 'src/types.ts', 2, 4);
      expect(commits.length).toBe(1);
      expect(commits[0]?.subject).toBe('feat: add EngineConfig');
      expect(commits[0]?.author).toBe('Test User');

      const unsafe = await readLineGitContext(repo, '../../etc/passwd', 1, 2);
      expect(unsafe).toEqual([]);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
