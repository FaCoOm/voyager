import type { SelectableTurn } from './types';

/**
 * Formats a list of selected turns for clipboard copying as clean Markdown.
 */
export function formatMessagesForCopy(messages: readonly SelectableTurn[]): string {
  if (messages.length === 0) return '';

  return messages
    .map((msg) => {
      const header = msg.role === 'user' ? '### User' : '### Gemini';
      const cleanText = msg.text.trim();
      return `${header}\n\n${cleanText}`;
    })
    .join('\n\n---\n\n');
}

/**
 * Formats a list of selected turns as blockquoted context for quote-reply insertion.
 */
export function formatMessagesForQuote(messages: readonly SelectableTurn[]): string {
  if (messages.length === 0) return '';

  return (
    messages
      .map((msg) => {
        const roleLabel = msg.role === 'user' ? 'User' : 'Gemini';
        const cleanText = msg.text.trim();
        const quotedLines = cleanText
          .split('\n')
          .map((line) => (line.length > 0 ? `> ${line}` : '>'))
          .join('\n');
        return `> **${roleLabel}**:\n${quotedLines}`;
      })
      .join('\n>\n') + '\n\n'
  );
}
