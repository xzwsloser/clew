import { basename, posix } from 'node:path';
import type { RepoOverview, SupportedLanguage, SymbolRecord } from '@clew/shared';
import type { RepositoryIndex } from './symbol-index.js';

const BUILD_MARKERS: Array<{ file: string; label: string }> = [
  { file: 'pyproject.toml', label: 'Python (pyproject.toml)' },
  { file: 'setup.py', label: 'Python (setuptools)' },
  { file: 'requirements.txt', label: 'Python (pip)' },
  { file: 'Cargo.toml', label: 'Rust (Cargo)' },
  { file: 'go.mod', label: 'Go Modules' },
  { file: 'CMakeLists.txt', label: 'C/C++ (CMake)' },
  { file: 'Makefile', label: 'Make' },
  { file: 'meson.build', label: 'Meson' },
  { file: 'pnpm-workspace.yaml', label: 'pnpm workspace' },
  { file: 'package.json', label: 'Node.js (package.json)' },
  { file: 'tsconfig.json', label: 'TypeScript' },
];

const ENTRY_FILE_PATTERNS = [
  /^main\./i,
  /^app\./i,
  /^server\./i,
  /^cli\./i,
  /^index\./i,
  /^lib\.rs$/i,
  /^main\.rs$/i,
  /^__init__\.py$/i,
  /^engine\./i,
];

function moduleGroupOf(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length <= 1) return '(root)';
  if (parts.length === 2) return parts[0]!;
  return `${parts[0]}/${parts[1]}`;
}

/**
 * Generate a deterministic shallow architectural overview for an indexed repository.
 */
export function buildRepoOverview(
  repoId: string,
  name: string,
  index: RepositoryIndex,
): RepoOverview {
  const totalFiles = index.files.length;
  const langCounts = new Map<SupportedLanguage, number>();
  const moduleStats = new Map<
    string,
    { fileCount: number; langs: Map<SupportedLanguage, number>; symbols: SymbolRecord[] }
  >();
  const fileNames = new Set(index.files.map((f) => posix.basename(f.path)));

  for (const file of index.files) {
    langCounts.set(file.language, (langCounts.get(file.language) ?? 0) + 1);
    const mod = moduleGroupOf(file.path);
    const bucket = moduleStats.get(mod) ?? {
      fileCount: 0,
      langs: new Map<SupportedLanguage, number>(),
      symbols: [] as SymbolRecord[],
    };
    bucket.fileCount += 1;
    bucket.langs.set(file.language, (bucket.langs.get(file.language) ?? 0) + 1);
    const fileSyms = index.symbolsByFile.get(file.path) ?? [];
    for (const sym of fileSyms) {
      if (sym.exported) bucket.symbols.push(sym);
    }
    moduleStats.set(mod, bucket);
  }

  const languages = Array.from(langCounts.entries())
    .map(([language, fileCount]) => ({
      language,
      fileCount,
      percentage: totalFiles > 0 ? Math.round((fileCount / totalFiles) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.fileCount - a.fileCount);

  const buildSystems = BUILD_MARKERS.filter((m) => fileNames.has(m.file)).map((m) => m.label);

  const coreModules = Array.from(moduleStats.entries())
    .map(([path, stat]) => {
      const primaryLanguage =
        Array.from(stat.langs.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'text';
      return {
        path,
        fileCount: stat.fileCount,
        primaryLanguage,
        keySymbols: stat.symbols.slice(0, 6).map((s) => s.name),
      };
    })
    .sort((a, b) => b.fileCount - a.fileCount || a.path.localeCompare(b.path))
    .slice(0, 12);

  const isNonEntryNoisePath = (p: string): boolean =>
    /(?:^|\/)(?:\.github|docs|test|tests|__tests__|spec|specs|bench|benchmarks|benchsuite|examples|testdata)\//i.test(
      p,
    ) || /(?:_test\.go|\.test\.[cm]?[jt]sx?|\.spec\.[cm]?[jt]sx?|_test\.rs|_test\.py)$/i.test(p);

  const entryCandidates: Array<{
    score: number;
    entry: RepoOverview['entryPoints'][number];
  }> = [];

  for (const file of index.files) {
    if (file.language === 'text') continue;
    if (isNonEntryNoisePath(file.path)) continue;
    const base = basename(file.path);
    const syms = index.symbolsByFile.get(file.path) ?? [];
    const mainSym = syms.find((s) =>
      ['main', 'ServeHTTP', 'serve', 'start', 'apply', 'run', 'dispatch', 'init'].includes(s.name),
    );
    const isConventionalFile = ENTRY_FILE_PATTERNS.some((re) => re.test(base));
    if (mainSym) {
      const symBonus = mainSym.name === 'main' ? 30 : mainSym.name === 'init' ? 10 : 20;
      const depthPenalty = file.path.split('/').length;
      entryCandidates.push({
        score: symBonus + (isConventionalFile ? 15 : 0) - depthPenalty,
        entry: {
          file: file.path,
          symbolName: mainSym.name,
          line: mainSym.startLine,
          reason: `Entry symbol \`${mainSym.name}\``,
        },
      });
    } else if (isConventionalFile) {
      entryCandidates.push({
        score: 15 - file.path.split('/').length,
        entry: {
          file: file.path,
          symbolName: syms[0]?.name,
          line: syms[0]?.startLine ?? 1,
          reason: `Conventional entry file \`${base}\``,
        },
      });
    }
  }

  const entryPoints: RepoOverview['entryPoints'] = entryCandidates
    .sort((a, b) => b.score - a.score || a.entry.file.localeCompare(b.entry.file))
    .slice(0, 10)
    .map((item) => item.entry);

  const recommendedPaths: RepoOverview['recommendedPaths'] = [];
  if (entryPoints.length > 0) {
    recommendedPaths.push({
      title: 'Entry Points & Core Bootstrap',
      description: 'Start from detected application entry points and top-level modules.',
      steps: entryPoints.slice(0, 5).map((ep) => ({
        file: ep.file,
        line: ep.line,
        symbolName: ep.symbolName,
      })),
    });
  }
  if (coreModules.length > 0) {
    const moduleSteps = coreModules
      .slice(0, 4)
      .flatMap((mod) => {
        const matchFile =
          index.files.find(
            (f) => moduleGroupOf(f.path) === mod.path && f.language !== 'text' && !isNonEntryNoisePath(f.path),
          ) ??
          index.files.find((f) => moduleGroupOf(f.path) === mod.path && f.language !== 'text');
        const firstSym = matchFile ? index.symbolsByFile.get(matchFile.path)?.[0] : undefined;
        return matchFile
          ? [
              {
                file: matchFile.path,
                line: firstSym?.startLine ?? 1,
                symbolName: firstSym?.name,
              },
            ]
          : [];
      });
    if (moduleSteps.length > 0) {
      recommendedPaths.push({
        title: 'Core Modules Tour',
        description: 'Survey the highest-density modules across the repository.',
        steps: moduleSteps,
      });
    }
  }

  return {
    repoId,
    name,
    rootPath: index.repoRoot,
    git: index.git,
    totalFiles,
    totalSymbols: index.symbolsById.size,
    languages,
    buildSystems,
    coreModules,
    entryPoints,
    recommendedPaths,
  };
}
