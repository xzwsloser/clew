import type { ReactNode } from 'react';

function renderInline(text: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    const raw = match[0];
    if (raw.startsWith('`') && raw.endsWith('`')) {
      tokens.push(
        <code key={key++} className="clew-inline-code">
          {raw.slice(1, -1)}
        </code>,
      );
    } else if (raw.startsWith('**') && raw.endsWith('**')) {
      tokens.push(<strong key={key++}>{raw.slice(2, -2)}</strong>);
    } else if (raw.startsWith('*') && raw.endsWith('*')) {
      tokens.push(<em key={key++}>{raw.slice(1, -1)}</em>);
    }
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }
  return tokens;
}

/**
 * XSS-safe lightweight Markdown subset renderer (headings, lists, bold, italic, inline code).
 */
export function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={key++} className="clew-md-list">
        {listItems.map((item, idx) => (
          <li key={idx}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }
    const bulletMatch = /^[-*]\s+(.*)$/.exec(line.trim());
    if (bulletMatch) {
      listItems.push(bulletMatch[1]!);
      continue;
    }
    flushList();

    const headingMatch = /^(#{1,4})\s+(.*)$/.exec(line.trim());
    if (headingMatch) {
      blocks.push(
        <div key={key++} className="clew-md-heading">
          {renderInline(headingMatch[2]!)}
        </div>,
      );
      continue;
    }

    blocks.push(
      <p key={key++} className="clew-md-p">
        {renderInline(line)}
      </p>,
    );
  }
  flushList();

  return <div className="clew-md-root">{blocks}</div>;
}
