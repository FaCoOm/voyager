export type MessageRole = 'user' | 'assistant';

export interface SelectableTurn {
  id: string;
  role: MessageRole;
  element: HTMLElement;
  text: string;
}

export type BulkActionType = 'copy' | 'quote' | 'collapse' | 'expand';

export interface BulkActionCallbacks {
  onCopy?: (count: number) => void;
  onQuote?: (count: number) => void;
  onCollapse?: (count: number, isCollapsed: boolean) => void;
  onSelectionChange?: (selectedCount: number) => void;
}
