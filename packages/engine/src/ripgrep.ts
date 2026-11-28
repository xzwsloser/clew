import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CLEW_ERROR_CODES, ClewError, resolveSafeRepoPath, toRepoRelativePath } from '@clew/shared';

const execFileAsync = promisify(execFile);

export interface RipgrepMatch {
  file: string;
  line: number;
  column: number;
  lineText: string;
}

export interface RipgrepSearchOptions {
  repoRoot: string;
  query: string;
  wordBoundary?: boolean;
  caseSensitive?: boolean;
  regex?: boolean;
  maxResults?: number;
  subpath?: string;
  signal?: AbortSignal;
}

/**
 * Execute `rg --json` safely without shell invocation, guarding repository boundaries.
 */
export async function searchWithRipgrep(options: RipgrepSearchOptions): Promise<RipgrepMatch[]> {
  const {
    repoRoot,
    query,
    wordBoundary = false,
    caseSensitive = false,
    regex = false,
    maxResults = 100,
    subpath,
    signal,
  } = options;

  if (!query.trim()) {
    throw new ClewError(CLEW_ERROR_CODES.INVALID_INPUT, 'Search query must not be empty');
  }

  const searchRoot = subpath ? resolveSafeRepoPath(repoRoot, subpath) : resolveSafeRepoPath(repoRoot, '.');

  const args: string[] = [
    '--json',
    '--no-heading',
    '--line-number',
    '--column',
    '--max-count',
    String(Math.max(1, maxResults)),
  ];

  if (!regex) {
    args.push('--fixed-strings');
  }
  if (wordBoundary) {
    args.push('--word-regexp');
  }
  if (!caseSensitive) {
    args.push('--ignore-case');
  }
  args.push('--', query, searchRoot);

  try {
    const { stdout } = await execFileAsync('rg', args, {
      maxBuffer: 8 * 1024 * 1024,
      signal,
    });
    return parseRipgrepJsonLines(stdout, repoRoot, maxResults);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ClewError(CLEW_ERROR_CODES.CANCELLED, 'Search cancelled');
    }
    const execErr = err as { code?: number | string; stdout?: string };
    // ripgrep exits with 1 when there are zero matches
    if (execErr.code === 1) {
      return [];
    }
    if (typeof execErr.stdout === 'string' && execErr.stdout.length > 0) {
      return parseRipgrepJsonLines(execErr.stdout, repoRoot, maxResults);
    }
    throw new ClewError(CLEW_ERROR_CODES.INTERNAL, 'Ripgrep execution failed', {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

function parseRipgrepJsonLines(
  stdout: string,
  repoRoot: string,
  maxResults: number,
): RipgrepMatch[] {
  const matches: RipgrepMatch[] = [];
  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as {
        type?: string;
        data?: {
          path?: { text?: string };
          lines?: { text?: string };
          line_number?: number;
          submatches?: Array<{ start?: number }>;
        };
      };
      if (event.type !== 'match' || !event.data?.path?.text || !event.data.line_number) {
        continue;
      }
      const relPath = toRepoRelativePath(repoRoot, event.data.path.text);
      const column = (event.data.submatches?.[0]?.start ?? 0) + 1;
      matches.push({
        file: relPath,
        line: event.data.line_number,
        column,
        lineText: (event.data.lines?.text ?? '').replace(/\r?\n$/, ''),
      });
      if (matches.length >= maxResults) {
        break;
      }
    } catch {
      // Skip malformed JSON line from rg output
    }
  }
  return matches;
}
