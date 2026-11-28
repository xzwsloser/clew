import { createRequire } from 'node:module';
import { extname } from 'node:path';
import type { SupportedLanguage } from '@clew/shared';
import { Language, Parser, type Tree } from 'web-tree-sitter';

const require = createRequire(import.meta.url);

export type WasmGrammarKey =
  | 'python'
  | 'c'
  | 'cpp'
  | 'go'
  | 'rust'
  | 'typescript'
  | 'tsx'
  | 'javascript';

const WASM_PACKAGE_MAP: Record<WasmGrammarKey, string> = {
  python: 'tree-sitter-python/tree-sitter-python.wasm',
  c: 'tree-sitter-c/tree-sitter-c.wasm',
  cpp: 'tree-sitter-cpp/tree-sitter-cpp.wasm',
  go: 'tree-sitter-go/tree-sitter-go.wasm',
  rust: 'tree-sitter-rust/tree-sitter-rust.wasm',
  typescript: 'tree-sitter-typescript/tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-typescript/tree-sitter-tsx.wasm',
  javascript: 'tree-sitter-javascript/tree-sitter-javascript.wasm',
};

let initPromise: Promise<void> | null = null;
const loadedLanguages = new Map<WasmGrammarKey, Language>();

async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = Parser.init();
  }
  await initPromise;
}

export function resolveGrammarKey(
  language: SupportedLanguage,
  filePath?: string,
): WasmGrammarKey | null {
  if (language === 'text') return null;
  if (language === 'typescript' && filePath && extname(filePath).toLowerCase() === '.tsx') {
    return 'tsx';
  }
  return language;
}

export async function getLanguageForKey(key: WasmGrammarKey): Promise<Language | null> {
  const cached = loadedLanguages.get(key);
  if (cached) return cached;

  try {
    await ensureInitialized();
    const wasmPath = require.resolve(WASM_PACKAGE_MAP[key]);
    const language = await Language.load(wasmPath);
    loadedLanguages.set(key, language);
    return language;
  } catch {
    return null;
  }
}

export async function parseSourceTree(
  content: string,
  language: SupportedLanguage,
  filePath?: string,
): Promise<{ tree: Tree; grammar: WasmGrammarKey } | null> {
  const key = resolveGrammarKey(language, filePath);
  if (!key) return null;

  const langObj = await getLanguageForKey(key);
  if (!langObj) return null;

  const parser = new Parser();
  try {
    parser.setLanguage(langObj);
    const tree = parser.parse(content);
    if (!tree) return null;
    return { tree, grammar: key };
  } finally {
    parser.delete();
  }
}
