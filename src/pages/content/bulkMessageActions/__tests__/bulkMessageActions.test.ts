// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { extractCleanTurnText, findMessageTurns, toggleTurnCollapse } from '../domUtils';
import { formatMessagesForCopy, formatMessagesForQuote } from '../formatters';
import { startBulkMessageActions } from '../index';
import { SelectionManager } from '../selectionManager';
import type { SelectableTurn } from '../types';

describe('bulkMessageActions formatters', () => {
  const sampleTurns: SelectableTurn[] = [
    {
      id: 'turn-1',
      role: 'user',
      element: document.createElement('div'),
      text: 'What is TypeScript?',
    },
    {
      id: 'turn-2',
      role: 'assistant',
      element: document.createElement('div'),
      text: 'TypeScript is a strongly typed superset of JavaScript.',
    },
  ];

  it('formats messages for clipboard copy with markdown headers', () => {
    const formatted = formatMessagesForCopy(sampleTurns);
    expect(formatted).toContain('### User\n\nWhat is TypeScript?');
    expect(formatted).toContain(
      '### Gemini\n\nTypeScript is a strongly typed superset of JavaScript.',
    );
    expect(formatted).toContain('---');
  });

  it('returns empty string when formatting empty list', () => {
    expect(formatMessagesForCopy([])).toBe('');
    expect(formatMessagesForQuote([])).toBe('');
  });

  it('formats messages for quote reply with blockquotes', () => {
    const quoted = formatMessagesForQuote(sampleTurns);
    expect(quoted).toContain('> **User**:');
    expect(quoted).toContain('> What is TypeScript?');
    expect(quoted).toContain('> **Gemini**:');
    expect(quoted).toContain('> TypeScript is a strongly typed superset of JavaScript.');
  });
});

describe('bulkMessageActions DOM utilities & SelectionManager', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="chat-history">
        <user-query class="user-query-bubble-with-background">
          <div class="query-text">Hello Gemini</div>
          <button class="gv-fork-btn">Fork</button>
        </user-query>
        <model-response class="model-response">
          <message-content>
            <p>Hello! How can I assist you today?</p>
          </message-content>
        </model-response>
        <user-query class="user-query-bubble-with-background">
          <div class="query-text">Explain quantum computing</div>
        </user-query>
        <model-response class="model-response">
          <message-content>
            <p>Quantum computing uses qubits.</p>
          </message-content>
        </model-response>
      </div>
    `;
  });

  it('finds all top-level message turns in document order', () => {
    const turns = findMessageTurns();
    expect(turns.length).toBe(4);
    expect(turns[0].role).toBe('user');
    expect(turns[1].role).toBe('assistant');
    expect(turns[2].role).toBe('user');
    expect(turns[3].role).toBe('assistant');
  });

  it('strips injected Voyager buttons from extracted text', () => {
    const userEl = document.querySelector('user-query') as HTMLElement;
    const cleanText = extractCleanTurnText(userEl);
    expect(cleanText).toContain('Hello Gemini');
    expect(cleanText).not.toContain('Fork');
  });

  it('toggles collapse state on turn elements', () => {
    const turnEl = document.querySelector('model-response') as HTMLElement;
    expect(turnEl.classList.contains('gv-turn-collapsed')).toBe(false);

    const isCollapsed = toggleTurnCollapse(turnEl);
    expect(isCollapsed).toBe(true);
    expect(turnEl.classList.contains('gv-turn-collapsed')).toBe(true);

    const isExpanded = toggleTurnCollapse(turnEl);
    expect(isExpanded).toBe(false);
    expect(turnEl.classList.contains('gv-turn-collapsed')).toBe(false);
  });

  it('manages selection mode and checkbox synchronization', () => {
    const manager = new SelectionManager();
    manager.syncCheckboxes();

    const checkboxes = document.querySelectorAll('.gv-msg-select-checkbox');
    expect(checkboxes.length).toBe(4);

    const turns = manager.getAllTurns();
    manager.toggleTurn(turns[0].id);

    expect(manager.getIsSelectionMode()).toBe(true);
    expect(manager.getSelectedCount()).toBe(1);
    expect(turns[0].element.classList.contains('gv-turn-selected')).toBe(true);

    // Range selection with Shift + Click
    manager.toggleTurn(turns[2].id, true);
    expect(manager.getSelectedCount()).toBe(3); // turns[0], turns[1], turns[2]

    // Select Prompts only
    manager.selectRole('user');
    expect(manager.getSelectedCount()).toBe(2);

    // Select All
    manager.selectAll();
    expect(manager.getSelectedCount()).toBe(4);

    // Exit selection mode
    manager.exitSelectionMode();
    expect(manager.getIsSelectionMode()).toBe(false);
    expect(manager.getSelectedCount()).toBe(0);
    expect(document.querySelectorAll('.gv-turn-selected').length).toBe(0);

    manager.destroy();
  });

  it('starts and cleanly stops bulk message actions lifecycle', () => {
    const stop = startBulkMessageActions();

    // Checkboxes should be attached
    expect(document.querySelectorAll('.gv-msg-select-checkbox').length).toBe(4);
    // Toolbar element should be mounted in document.body
    expect(document.querySelector('.gv-bulk-actions-toolbar')).not.toBeNull();

    // Clean teardown
    stop();

    expect(document.querySelectorAll('.gv-msg-select-checkbox').length).toBe(0);
    expect(document.querySelector('.gv-bulk-actions-toolbar')).toBeNull();
    expect(document.body.classList.contains('gv-bulk-select-mode')).toBe(false);
  });
});
