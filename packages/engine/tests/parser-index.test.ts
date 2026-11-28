import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildRepositoryIndex, parseSourceFile } from '../src/index.js';

describe('@clew/engine WASM Tree-sitter multi-language parser & incremental cache', () => {
  it('extracts symbols, imports, and calls across all 7 P0 languages and supports text fallback', async () => {
    const py = await parseSourceFile(
      'app/service.py',
      'from app.util import helper\nclass Router:\n    def dispatch(self, x):\n        return helper(x)\n',
      'python',
    );
    expect(py.astParsed).toBe(true);
    expect(py.symbols.map((s) => s.name)).toEqual(['Router', 'dispatch']);
    expect(py.callSites.some((c) => c.calleeName === 'helper')).toBe(true);

    const cRes = await parseSourceFile(
      'src/main.c',
      '#include "util.h"\nstruct Cfg { int port; };\nint start_server(int p) { return init_socket(p); }\n',
      'c',
    );
    expect(cRes.astParsed).toBe(true);
    expect(cRes.symbols.map((s) => s.name)).toEqual(['Cfg', 'start_server']);
    expect(cRes.imports[0]?.specifier).toBe('util.h');

    const cppRes = await parseSourceFile(
      'src/engine.cpp',
      'namespace clew { class Indexer { public: void run(); }; void Indexer::run() { scan(); } }\n',
      'cpp',
    );
    expect(cppRes.astParsed).toBe(true);
    expect(cppRes.symbols.some((s) => s.name === 'Indexer' && s.kind === 'class')).toBe(true);
    expect(cppRes.symbols.some((s) => s.name === 'run' && s.kind === 'method')).toBe(true);

    const goRes = await parseSourceFile(
      'pkg/server.go',
      'package pkg\nimport "net/http"\ntype Server struct {}\nfunc (s *Server) Listen() { http.ListenAndServe(":80", nil) }\n',
      'go',
    );
    expect(goRes.astParsed).toBe(true);
    expect(goRes.symbols.some((s) => s.name === 'Server' && s.kind === 'struct')).toBe(true);
    expect(goRes.symbols.some((s) => s.name === 'Listen' && s.kind === 'method')).toBe(true);

    const rsRes = await parseSourceFile(
      'src/lib.rs',
      'use crate::net::bind;\npub struct Node;\npub trait Runner { fn step(&self); }\nimpl Runner for Node { fn step(&self) { bind(); } }\n',
      'rust',
    );
    expect(rsRes.astParsed).toBe(true);
    expect(rsRes.symbols.some((s) => s.name === 'Node' && s.kind === 'struct')).toBe(true);
    expect(rsRes.symbols.some((s) => s.name === 'Runner' && s.kind === 'trait')).toBe(true);
    expect(rsRes.callSites.some((c) => c.calleeName === 'bind')).toBe(true);

    const tsRes = await parseSourceFile(
      'src/router.ts',
      'import { verify } from "./auth.js";\nexport interface Req { id: string }\nexport const handle = (r: Req) => verify(r.id);\n',
      'typescript',
    );
    expect(tsRes.astParsed).toBe(true);
    expect(tsRes.symbols.some((s) => s.name === 'Req' && s.kind === 'interface')).toBe(true);
    expect(tsRes.symbols.some((s) => s.name === 'handle' && s.kind === 'function')).toBe(true);
    expect(tsRes.callSites.some((c) => c.calleeName === 'verify')).toBe(true);

    const jsRes = await parseSourceFile(
      'src/helper.js',
      'export function runTask() { return compute(); }\n',
      'javascript',
    );
    expect(jsRes.astParsed).toBe(true);
    expect(jsRes.symbols[0]?.name).toBe('runTask');

    const fallback = await parseSourceFile('scripts/job.rb', 'def run_job\nend\n', 'text');
    expect(fallback.astParsed).toBe(false);
    expect(fallback.symbols[0]?.name).toBe('run_job');
  });

  it('persists incremental disk cache, reuses unchanged files, and handles cache corruption', async () => {
    const base = mkdtempSync(join(tmpdir(), 'clew-cache-test-'));
    const repo = join(base, 'repo');
    const cacheDir = join(base, 'cache');
    mkdirSync(join(repo, 'src'), { recursive: true });
    writeFileSync(join(repo, 'src', 'auth.ts'), 'export function verify(id: string) { return id.length > 0; }\n');
    writeFileSync(
      join(repo, 'src', 'app.ts'),
      'import { verify } from "./auth.js";\nexport function boot() { return verify("ok"); }\n',
    );

    try {
      const first = await buildRepositoryIndex(repo, { cacheDir });
      expect(first.parsedFiles).toBe(2);
      expect(first.reusedFiles).toBe(0);
      expect(first.importedByFile.get('src/auth.ts')?.has('src/app.ts')).toBe(true);

      const second = await buildRepositoryIndex(repo, { cacheDir });
      expect(second.cacheHit).toBe(true);
      expect(second.reusedFiles).toBe(2);
      expect(second.parsedFiles).toBe(0);

      // Modify one file -> only 1 re-parsed
      writeFileSync(
        join(repo, 'src', 'app.ts'),
        'import { verify } from "./auth.js";\nexport function boot() { return verify("updated"); }\n',
      );
      const third = await buildRepositoryIndex(repo, { cacheDir });
      expect(third.reusedFiles).toBe(1);
      expect(third.parsedFiles).toBe(1);

      // Corrupt cache file -> gracefully rebuilds without crashing
      const { readdirSync, writeFileSync: writeRaw } = await import('node:fs');
      for (const f of readdirSync(cacheDir)) {
        writeRaw(join(cacheDir, f), '{CORRUPT_JSON');
      }
      const fourth = await buildRepositoryIndex(repo, { cacheDir });
      expect(fourth.cacheHit).toBe(false);
      expect(fourth.parsedFiles).toBe(2);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
