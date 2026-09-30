import { getTranslationSyncUnsafe as t } from '@/utils/i18n';

import { insertTextIntoChatInput } from '../chatInput/index';
import { toggleTurnCollapse } from './domUtils';
import { formatMessagesForCopy, formatMessagesForQuote } from './formatters';
import type { SelectionManager } from './selectionManager';
import { showBulkActionToast } from './toast';

const COPY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const QUOTE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>`;
const FOLD_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 8 12 16 20 8"/></svg>`;
const CLOSE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

export class BulkActionsToolbar {
  private element: HTMLElement | null = null;
  private countLabel: HTMLElement | null = null;
  private unsubscribeSelection: (() => void) | null = null;

  constructor(private readonly manager: SelectionManager) {
    this.createDom();
    this.unsubscribeSelection = this.manager.subscribe((count, isMode) => {
      this.update(count, isMode);
    });
  }

  private createDom(): void {
    const toolbar = document.createElement('div');
    toolbar.className = 'gv-bulk-actions-toolbar';
    toolbar.dataset.testId = 'gv-bulk-actions-toolbar';

    // Left section: Count & Filter Chips
    const leftSection = document.createElement('div');
    leftSection.className = 'gv-bulk-toolbar-left';

    const countLabel = document.createElement('span');
    countLabel.className = 'gv-bulk-count-badge';
    countLabel.textContent = t('bulk_messages_selected_count').replace('{count}', '0');
    this.countLabel = countLabel;
    leftSection.appendChild(countLabel);

    const filterGroup = document.createElement('div');
    filterGroup.className = 'gv-bulk-filter-group';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'gv-bulk-filter-chip';
    allBtn.textContent = t('bulk_messages_select_all');
    allBtn.addEventListener('click', () => this.manager.selectAll());
    filterGroup.appendChild(allBtn);

    const userBtn = document.createElement('button');
    userBtn.type = 'button';
    userBtn.className = 'gv-bulk-filter-chip';
    userBtn.textContent = t('bulk_messages_select_user');
    userBtn.addEventListener('click', () => this.manager.selectRole('user'));
    filterGroup.appendChild(userBtn);

    const aiBtn = document.createElement('button');
    aiBtn.type = 'button';
    aiBtn.className = 'gv-bulk-filter-chip';
    aiBtn.textContent = t('bulk_messages_select_assistant');
    aiBtn.addEventListener('click', () => this.manager.selectRole('assistant'));
    filterGroup.appendChild(aiBtn);

    leftSection.appendChild(filterGroup);
    toolbar.appendChild(leftSection);

    // Separator
    const divider = document.createElement('div');
    divider.className = 'gv-bulk-toolbar-divider';
    toolbar.appendChild(divider);

    // Right section: Action Buttons
    const rightSection = document.createElement('div');
    rightSection.className = 'gv-bulk-toolbar-right';

    // Copy Action
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'gv-bulk-action-btn gv-bulk-action-copy';
    copyBtn.innerHTML = `${COPY_ICON_SVG}<span>${t('bulk_messages_action_copy')}</span>`;
    copyBtn.addEventListener('click', async () => {
      const selected = this.manager.getSelectedTurns();
      if (selected.length === 0) return;
      const text = formatMessagesForCopy(selected);
      try {
        await navigator.clipboard.writeText(text);
        showBulkActionToast(
          t('bulk_messages_copied_toast').replace('{count}', String(selected.length)),
        );
      } catch (err) {
        console.error('[BulkActions] Clipboard copy failed:', err);
      }
    });
    rightSection.appendChild(copyBtn);

    // Quote Action
    const quoteBtn = document.createElement('button');
    quoteBtn.type = 'button';
    quoteBtn.className = 'gv-bulk-action-btn gv-bulk-action-quote';
    quoteBtn.innerHTML = `${QUOTE_ICON_SVG}<span>${t('bulk_messages_action_quote')}</span>`;
    quoteBtn.addEventListener('click', () => {
      const selected = this.manager.getSelectedTurns();
      if (selected.length === 0) return;
      const text = formatMessagesForQuote(selected);
      const success = insertTextIntoChatInput(text);
      if (success) {
        showBulkActionToast(
          t('bulk_messages_quoted_toast').replace('{count}', String(selected.length)),
        );
        this.manager.exitSelectionMode();
      }
    });
    rightSection.appendChild(quoteBtn);

    // Collapse / Expand Action
    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'gv-bulk-action-btn gv-bulk-action-collapse';
    collapseBtn.innerHTML = `${FOLD_ICON_SVG}<span>${t('bulk_messages_action_collapse')}</span>`;
    collapseBtn.addEventListener('click', () => {
      const selected = this.manager.getSelectedTurns();
      if (selected.length === 0) return;
      const anyUncollapsed = selected.some(
        (s) => !s.element.classList.contains('gv-turn-collapsed'),
      );
      for (const turn of selected) {
        toggleTurnCollapse(turn.element, anyUncollapsed);
      }
      showBulkActionToast(
        anyUncollapsed
          ? t('bulk_messages_collapsed_toast').replace('{count}', String(selected.length))
          : t('bulk_messages_expanded_toast').replace('{count}', String(selected.length)),
      );
    });
    rightSection.appendChild(collapseBtn);

    // Exit Button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'gv-bulk-action-close';
    closeBtn.title = t('bulk_messages_exit');
    closeBtn.innerHTML = CLOSE_ICON_SVG;
    closeBtn.addEventListener('click', () => this.manager.exitSelectionMode());
    rightSection.appendChild(closeBtn);

    toolbar.appendChild(rightSection);

    document.body.appendChild(toolbar);
    this.element = toolbar;
  }

  private update(count: number, isMode: boolean): void {
    if (!this.element) return;

    if (this.countLabel) {
      this.countLabel.textContent = t('bulk_messages_selected_count').replace(
        '{count}',
        String(count),
      );
    }

    const shouldShow = isMode && count > 0;
    this.element.classList.toggle('gv-bulk-toolbar-visible', shouldShow);
  }

  destroy(): void {
    this.unsubscribeSelection?.();
    this.unsubscribeSelection = null;
    this.element?.remove();
    this.element = null;
    this.countLabel = null;
  }
}
