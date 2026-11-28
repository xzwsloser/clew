import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ClewError } from '@clew/shared';
import { readFileSpan, readGitMetadata, scanRepository } from '../src/index.js';

describe('@clew/engine scanner, git metadata & safe file reader', () => {
  it('respects .gitignore, skips binaries/lockfiles, and rejects symlink escapes', async () => {
    const base = mkdtempSync(join(tmpdir(), 'clew-scan-test-'));
    const repo = join(base, 'repo');
    const outside = join(base, 'outside');
    mkdirSync(join(repo, 'src'), { recursive: true });
    mkdirSync(join(repo, 'ignored_dir'), { recursive: true });
    mkdirSync(outside, { recursive: true });

    writeFileSync(join(repo, '.gitignore'), 'ignored_dir/\n*.log\n');
    writeFileSync(join(repo, 'src', 'app.py'), 'def main():\n    return 1\n');
    writeFileSync(join(repo, 'ignored_dir', 'skip.py'), 'def skip(): pass\n');
    writeFileSync(join(repo, 'debug.log'), 'noise\n');
    writeFileSync(join(repo, 'package-lock.json'), '{}\n');
    writeFileSync(join(repo, 'bin.dat'), Buffer.from([0x41, 0x00, 0x42]));
    writeFileSync(join(outside, 'secret.py'), 'SECRET = "x"\n');
    symlinkSync(join(outside, 'secret.py'), join(repo, 'src', 'escape.py'));

    try {
      const scan = await scanRepository(repo);
      const paths = scan.files.map((f) => f.path);
      expect(paths).toContain('src/app.py');
      expect(paths).not.toContain('ignored_dir/skip.py');
      expect(paths).not.toContain('debug.log');
      expect(paths).not.toContain('package-lock.json');
      expect(paths).not.toContain('bin.dat');
      expect(paths).not.toContain('src/escape.py');
      expect(scan.skippedLargeOrBinary).toBe(1);

      const span = await readFileSpan(repo, 'src/app.py', 1, 2);
      expect(span.totalLines).toBe(2);
      expect(span.lines[0]?.text).toBe('def main():');

      await expect(readFileSpan(repo, '../outside/secret.py', 1, 5)).rejects.toThrow(ClewError);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('reads Git branch, HEAD SHA, and dirty status safely', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'clew-git-test-'));
    try {
      execFileSync('git', ['init', '-b', 'main', repo]);
      execFileSync('git', ['-C', repo, 'config', 'user.name', 'Test']);
      execFileSync('git', ['-C', repo, 'config', 'user.email', 'test@example.com']);
      writeFileSync(join(repo, 'main.go'), 'package main\nfunc main() {}\n');
      execFileSync('git', ['-C', repo, 'add', 'main.go']);
      execFileSync('git', ['-C', repo, 'commit', '-m', 'init']);

      const cleanMeta = await readGitMetadata(repo);
      expect(cleanMeta.isGitRepo).toBe(true);
      expect(cleanMeta.branch).toBe('main');
      expect(cleanMeta.headSha).toMatch(/^[0-9a-f]{40}$/);
      expect(cleanMeta.dirtyFingerprint).toBe('clean');

      writeFileSync(join(repo, 'main.go'), 'package main\nfunc main() { println(1) }\n');
      const dirtyMeta = await readGitMetadata(repo);
      expect(dirtyMeta.dirtyFingerprint).not.toBe('clean');
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
