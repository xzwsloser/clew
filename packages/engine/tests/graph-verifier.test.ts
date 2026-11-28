import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildRepoOverview,
  buildRepositoryIndex,
  retrieveSubgraph,
  trimToTokenBudget,
  verifyTraceEvidence,
} from '../src/index.js';

describe('@clew/engine overview, subgraph retrieval, token budget, and evidence verifier', () => {
  it('builds overview, retrieves bounded trace subgraph, enforces token budget, and prevents false verification', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'clew-graph-test-'));
    mkdirSync(join(repo, 'src'), { recursive: true });
    writeFileSync(join(repo, 'package.json'), '{"name":"sample"}\n');
    writeFileSync(
      join(repo, 'src', 'store.ts'),
      'export function loadItem(id: string) {\n  return id.trim();\n}\n',
    );
    writeFileSync(
      join(repo, 'src', 'main.ts'),
      [
        'import { loadItem } from "./store.js";',
        'export function main(id: string) {',
        '  return loadItem(id);',
        '}',
      ].join('\n'),
    );

    try {
      const index = await buildRepositoryIndex(repo);
      const overview = buildRepoOverview('r1', 'sample', index);
      expect(overview.buildSystems).toContain('Node.js (package.json)');
      expect(overview.entryPoints.some((e) => e.symbolName === 'main')).toBe(true);

      const sub = retrieveSubgraph(index, { goal: 'how does main loadItem' });
      expect(sub.nodes.length).toBeGreaterThanOrEqual(2);
      expect(sub.edges.some((e) => e.confidence === 'source_verified_call')).toBe(true);

      // Verify evidence verifier refuses to upgrade a hallucinated edge
      const verified = verifyTraceEvidence(index, sub.nodes, [
        ...sub.edges,
        {
          source: sub.nodes[0]!.id,
          target: 'nonexistent::ghost@99',
          claimedConfidence: 'source_verified_call',
        },
      ]);
      const ghostEdge = verified.edges.find((e) => e.target === 'nonexistent::ghost@99');
      expect(ghostEdge?.confidence).toBe('unverified');

      // Token budget trimming
      const packet = trimToTokenBudget(
        [
          { id: '1', file: 'src/main.ts', startLine: 1, endLine: 4, priority: 10, content: 'x'.repeat(200) },
          { id: '2', file: 'src/store.ts', startLine: 1, endLine: 3, priority: 5, content: 'y'.repeat(1000) },
        ],
        100,
      );
      expect(packet.estimatedTokens).toBeLessThanOrEqual(100);
      expect(packet.trimmedItems).toBeGreaterThanOrEqual(1);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('ignores workflow YAML and test files when ranking overview entry points', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'clew-overview-filter-'));
    try {
      mkdirSync(join(repo, '.github', 'workflows'), { recursive: true });
      mkdirSync(join(repo, 'tests'), { recursive: true });
      mkdirSync(join(repo, 'src'), { recursive: true });
      writeFileSync(join(repo, '.github', 'workflows', 'server.yml'), 'name: ci\n');
      writeFileSync(join(repo, '.gitignore'), 'node_modules\n');
      writeFileSync(join(repo, 'tests', 'main_test.py'), 'def main():\n    pass\n');
      writeFileSync(join(repo, 'src', 'app.py'), 'def main():\n    return 0\n');

      const index = await buildRepositoryIndex(repo);
      const overview = buildRepoOverview('r-filter', 'sample', index);
      expect(overview.entryPoints.map((e) => e.file)).toEqual(['src/app.py']);
      expect(overview.entryPoints[0]?.symbolName).toBe('main');
      const tourFiles = overview.recommendedPaths.flatMap((p) => p.steps.map((s) => s.file));
      expect(tourFiles).not.toContain('.gitignore');
      expect(tourFiles).not.toContain('.github/workflows/server.yml');
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
