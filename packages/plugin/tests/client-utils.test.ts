import { describe, expect, it } from 'vitest';
import { tokenizeCodeLine } from '../src/client/syntax-highlight.js';

describe('@clew/dsh-plugin client syntax tokenizer', () => {
  it('tokenizes keywords, strings, calls, types, and comments cleanly without HTML injection', () => {
    const pyTokens = tokenizeCodeLine('def dispatch(name="ok"): # note', 'python');
    expect(pyTokens.some((t) => t.kind === 'keyword' && t.text === 'def')).toBe(true);
    expect(pyTokens.some((t) => t.kind === 'call' && t.text === 'dispatch')).toBe(true);
    expect(pyTokens.some((t) => t.kind === 'string' && t.text === '"ok"')).toBe(true);
    expect(pyTokens.some((t) => t.kind === 'comment' && t.text === '# note')).toBe(true);

    const xssTokens = tokenizeCodeLine('const s = "<script>alert(1)</script>";', 'typescript');
    expect(xssTokens.map((t) => t.text).join('')).toBe('const s = "<script>alert(1)</script>";');
  });
});
