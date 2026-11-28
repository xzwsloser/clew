import type { SupportedLanguage } from '@clew/shared';
import { extname } from 'node:path';

const EXTENSION_MAP: Record<string, SupportedLanguage> = {
  '.py': 'python',
  '.pyi': 'python',
  '.c': 'c',
  '.h': 'c',
  '.cc': 'cpp',
  '.cpp': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.hxx': 'cpp',
  '.hh': 'cpp',
  '.go': 'go',
  '.rs': 'rust',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
};

export function detectLanguage(filePath: string): SupportedLanguage {
  const ext = extname(filePath).toLowerCase();
  return EXTENSION_MAP[ext] ?? 'text';
}

export const P0_SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  'python',
  'c',
  'cpp',
  'go',
  'rust',
  'typescript',
  'javascript',
];
