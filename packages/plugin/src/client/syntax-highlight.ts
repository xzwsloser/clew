import type { SupportedLanguage } from '@clew/shared/contracts';

export type TokenKind = 'plain' | 'keyword' | 'string' | 'comment' | 'number' | 'type' | 'call';

export interface CodeToken {
  text: string;
  kind: TokenKind;
}

const COMMON_KEYWORDS = new Set([
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'def', 'default',
  'defer', 'do', 'else', 'elif', 'enum', 'except', 'export', 'extends', 'false', 'finally',
  'fn', 'for', 'from', 'func', 'function', 'go', 'if', 'impl', 'import', 'in', 'include',
  'interface', 'is', 'let', 'loop', 'match', 'mod', 'mut', 'namespace', 'new', 'nil', 'none',
  'None', 'null', 'package', 'pass', 'private', 'pub', 'public', 'raise', 'range', 'return',
  'select', 'self', 'Self', 'static', 'struct', 'switch', 'throw', 'trait', 'true', 'True',
  'False', 'try', 'type', 'typedef', 'unsafe', 'use', 'using', 'var', 'void', 'while', 'with',
  'yield',
]);

/**
 * Pure, XSS-safe line tokenizer (renders React text nodes, never raw HTML).
 */
export function tokenizeCodeLine(line: string, language: SupportedLanguage): CodeToken[] {
  if (!line) return [{ text: '', kind: 'plain' }];

  const tokens: CodeToken[] = [];
  const lineCommentPrefix = language === 'python' ? '#' : '//';
  let i = 0;

  const push = (text: string, kind: TokenKind) => {
    if (!text) return;
    const prev = tokens[tokens.length - 1];
    if (prev && prev.kind === kind) {
      prev.text += text;
    } else {
      tokens.push({ text, kind });
    }
  };

  while (i < line.length) {
    const ch = line[i]!;

    // Single-line comment
    if (line.startsWith(lineCommentPrefix, i)) {
      push(line.slice(i), 'comment');
      break;
    }
    if ((language === 'c' || language === 'cpp' || language === 'rust' || language === 'go' || language === 'typescript' || language === 'javascript') && line.startsWith('/*', i)) {
      const end = line.indexOf('*/', i + 2);
      if (end === -1) {
        push(line.slice(i), 'comment');
        break;
      }
      push(line.slice(i, end + 2), 'comment');
      i = end + 2;
      continue;
    }

    // Strings
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\') {
          j += 2;
          continue;
        }
        if (line[j] === ch) {
          j += 1;
          break;
        }
        j += 1;
      }
      push(line.slice(i, j), 'string');
      i = j;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch) && (i === 0 || !/[A-Za-z0-9_]/.test(line[i - 1]!))) {
      let j = i + 1;
      while (j < line.length && /[0-9a-fA-FxXoObB._]/.test(line[j]!)) j += 1;
      push(line.slice(i, j), 'number');
      i = j;
      continue;
    }

    // Identifiers & keywords
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j]!)) j += 1;
      const word = line.slice(i, j);
      if (COMMON_KEYWORDS.has(word)) {
        push(word, 'keyword');
      } else if (/^[A-Z][A-Za-z0-9_]*$/.test(word)) {
        push(word, 'type');
      } else if (line[j] === '(') {
        push(word, 'call');
      } else {
        push(word, 'plain');
      }
      i = j;
      continue;
    }

    push(ch, 'plain');
    i += 1;
  }

  return tokens;
}
