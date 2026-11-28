export interface ContextItem {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  priority: number;
  content: string;
}

export interface TrimmedContextPacket {
  items: ContextItem[];
  estimatedTokens: number;
  trimmedItems: number;
  filesRead: number;
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Rank and trim source snippets into a strict token budget while keeping highest-priority evidence intact.
 */
export function trimToTokenBudget(
  candidates: ContextItem[],
  maxTokens = 6000,
): TrimmedContextPacket {
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);
  const selected: ContextItem[] = [];
  const files = new Set<string>();
  let usedTokens = 0;
  let trimmedItems = 0;

  for (const item of sorted) {
    const headerOverhead = 20;
    const itemTokens = estimateTokens(item.content) + headerOverhead;
    if (usedTokens + itemTokens <= maxTokens) {
      selected.push(item);
      files.add(item.file);
      usedTokens += itemTokens;
      continue;
    }

    const remainingTokens = maxTokens - usedTokens - headerOverhead;
    if (remainingTokens >= 80 && selected.length < 4) {
      const charBudget = remainingTokens * 4;
      const truncated = `${item.content.slice(0, charBudget)}\n... [truncated to fit token budget]`;
      selected.push({ ...item, content: truncated });
      files.add(item.file);
      usedTokens += estimateTokens(truncated) + headerOverhead;
      trimmedItems += 1;
    } else {
      trimmedItems += 1;
    }
  }

  return {
    items: selected,
    estimatedTokens: usedTokens,
    trimmedItems,
    filesRead: files.size,
  };
}
