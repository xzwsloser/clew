import { lstatSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { CLEW_ERROR_CODES, ClewError } from './errors.js';

/**
 * Resolve a relative or candidate path within a repository root while
 * rejecting path traversal (`..`) and symlink escapes outside `repoRoot`.
 */
export function resolveSafeRepoPath(repoRoot: string, candidatePath: string): string {
  if (!candidatePath || candidatePath.includes('\0')) {
    throw new ClewError(CLEW_ERROR_CODES.INVALID_INPUT, 'Invalid empty or null-byte path');
  }

  const canonicalRoot = realpathSync(resolve(repoRoot));
  const target = isAbsolute(candidatePath)
    ? resolve(candidatePath)
    : resolve(canonicalRoot, candidatePath);

  const rel = relative(canonicalRoot, target);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new ClewError(CLEW_ERROR_CODES.PATH_OUTSIDE_ROOT, `Path escapes repository root`, {
      candidatePath,
    });
  }

  // Verify realpath does not escape via symlink when target exists
  try {
    lstatSync(target);
    const canonicalTarget = realpathSync(target);
    const canonicalRel = relative(canonicalRoot, canonicalTarget);
    if (canonicalRel.startsWith('..') || isAbsolute(canonicalRel)) {
      throw new ClewError(CLEW_ERROR_CODES.SYMLINK_ESCAPE, `Symlink escapes repository root`, {
        candidatePath,
      });
    }
    return canonicalTarget;
  } catch (err) {
    if (err instanceof ClewError) {
      throw err;
    }
    return target;
  }
}

/**
 * Convert an absolute file path inside `repoRoot` into a normalized POSIX
 * relative path, throwing if it lies outside the root.
 */
export function toRepoRelativePath(repoRoot: string, targetPath: string): string {
  const canonicalRoot = realpathSync(resolve(repoRoot));
  const safeAbs = resolveSafeRepoPath(canonicalRoot, targetPath);
  return relative(canonicalRoot, safeAbs).replaceAll('\\', '/');
}
