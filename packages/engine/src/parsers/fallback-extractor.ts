import type {
  CallSiteRecord,
  ImportRecord,
  OutlineNode,
  SupportedLanguage,
  SymbolKind,
  SymbolRecord,
} from '@clew/shared';

export interface ParsedFileArtifacts {
  file: string;
  language: SupportedLanguage;
  astParsed: boolean;
  symbols: SymbolRecord[];
  imports: ImportRecord[];
  callSites: CallSiteRecord[];
  outline: OutlineNode[];
}

const FALLBACK_PATTERNS: Array<{ regex: RegExp; kind: SymbolKind }> = [
  { regex: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)/, kind: 'function' },
  { regex: /^\s*(?:def|async\s+def)\s+([A-Za-z_]\w*)/, kind: 'function' },
  { regex: /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)/, kind: 'function' },
  { regex: /^\s*func\s+(?:\([^)]+\)\s*)?([A-Za-z_]\w*)/, kind: 'function' },
  { regex: /^\s*(?:export\s+)?class\s+([A-Za-z_]\w*)/, kind: 'class' },
  { regex: /^\s*(?:pub\s+)?struct\s+([A-Za-z_]\w*)/, kind: 'struct' },
  { regex: /^\s*(?:export\s+)?interface\s+([A-Za-z_]\w*)/, kind: 'interface' },
  { regex: /^\s*(?:pub\s+)?trait\s+([A-Za-z_]\w*)/, kind: 'trait' },
];

export function extractWithFallback(
  file: string,
  content: string,
  language: SupportedLanguage,
): ParsedFileArtifacts {
  const symbols: SymbolRecord[] = [];
  const outline: OutlineNode[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i] ?? '';
    for (const pattern of FALLBACK_PATTERNS) {
      const match = pattern.regex.exec(lineText);
      const name = match?.[1];
      if (!name) continue;
      const lineNo = i + 1;
      const id = `${file}::${name}@${lineNo}`;
      const record: SymbolRecord = {
        id,
        name,
        qualifiedName: name,
        kind: pattern.kind,
        file,
        startLine: lineNo,
        endLine: lineNo,
        startColumn: Math.max(0, lineText.indexOf(name)),
        signature: lineText.trim().slice(0, 160),
        exported: lineText.includes('export ') || lineText.includes('pub '),
      };
      symbols.push(record);
      outline.push({
        symbolId: id,
        name,
        kind: pattern.kind,
        startLine: lineNo,
        endLine: lineNo,
        children: [],
      });
      break;
    }
  }

  return {
    file,
    language,
    astParsed: false,
    symbols,
    imports: [],
    callSites: [],
    outline,
  };
}
