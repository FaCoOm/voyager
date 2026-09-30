import { findMessageTurns } from './domUtils';
import type { MessageRole, SelectableTurn } from './types';

export interface SelectionStateListener {
  (selectedCount: number, isModeActive: boolean): void;
}

export class SelectionManager {
  private selectedIds = new Set<string>();
  private lastSelectedId: string | null = null;
  private isSelectionMode = false;
  private listeners: SelectionStateListener[] = [];
  private boundElements = new WeakSet<HTMLElement>();
  private boundHandlers = new Map<HTMLElement, (e: MouseEvent) => void>();

  constructor() {}

  subscribe(listener: SelectionStateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const count = this.selectedIds.size;
    const mode = this.isSelectionMode;
    for (const listener of this.listeners) {
      listener(count, mode);
    }
  }

  getIsSelectionMode(): boolean {
    return this.isSelectionMode;
  }

  getSelectedCount(): number {
    return this.selectedIds.size;
  }

  getSelectedTurns(): SelectableTurn[] {
    const all = findMessageTurns();
    return all.filter((t) => this.selectedIds.has(t.id));
  }

  getAllTurns(): SelectableTurn[] {
    return findMessageTurns();
  }

  enterSelectionMode(initialId?: string): void {
    this.isSelectionMode = true;
    document.body.classList.add('gv-bulk-select-mode');

    if (initialId) {
      this.selectedIds.add(initialId);
      this.lastSelectedId = initialId;
    }

    this.updateDomState();
    this.notify();
  }

  exitSelectionMode(): void {
    this.isSelectionMode = false;
    this.selectedIds.clear();
    this.lastSelectedId = null;
    document.body.classList.remove('gv-bulk-select-mode');

    this.updateDomState();
    this.notify();
  }

  toggleTurn(id: string, shiftKey = false): void {
    if (!this.isSelectionMode) {
      this.enterSelectionMode(id);
      return;
    }

    const allTurns = findMessageTurns();
    const targetIndex = allTurns.findIndex((t) => t.id === id);
    if (targetIndex < 0) return;

    if (shiftKey && this.lastSelectedId) {
      const prevIndex = allTurns.findIndex((t) => t.id === this.lastSelectedId);
      if (prevIndex >= 0) {
        const start = Math.min(prevIndex, targetIndex);
        const end = Math.max(prevIndex, targetIndex);
        for (let i = start; i <= end; i++) {
          this.selectedIds.add(allTurns[i].id);
        }
        this.lastSelectedId = id;
        this.updateDomState();
        this.notify();
        return;
      }
    }

    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
      this.lastSelectedId = id;
    }

    if (this.selectedIds.size === 0) {
      this.exitSelectionMode();
      return;
    }

    this.updateDomState();
    this.notify();
  }

  selectAll(): void {
    const turns = findMessageTurns();
    for (const t of turns) {
      this.selectedIds.add(t.id);
    }
    if (turns.length > 0) {
      this.lastSelectedId = turns[turns.length - 1].id;
    }
    this.updateDomState();
    this.notify();
  }

  selectRole(role: MessageRole): void {
    this.selectedIds.clear();
    const turns = findMessageTurns();
    for (const t of turns) {
      if (t.role === role) {
        this.selectedIds.add(t.id);
      }
    }
    this.updateDomState();
    this.notify();
  }

  /**
   * Scans current conversation turns and attaches hover checkboxes if missing.
   */
  syncCheckboxes(): void {
    const turns = findMessageTurns();

    for (const turn of turns) {
      const el = turn.element;
      let checkboxWrapper = el.querySelector<HTMLElement>(':scope > .gv-msg-select-checkbox');

      if (!checkboxWrapper) {
        checkboxWrapper = document.createElement('div');
        checkboxWrapper.className = 'gv-msg-select-checkbox';
        checkboxWrapper.setAttribute('role', 'checkbox');
        checkboxWrapper.setAttribute('aria-label', 'Select message');
        checkboxWrapper.setAttribute('tabindex', '0');

        const checkMark = document.createElement('div');
        checkMark.className = 'gv-msg-select-checkmark';
        checkboxWrapper.appendChild(checkMark);

        // Prepend to turn element
        el.insertBefore(checkboxWrapper, el.firstChild);
      }

      if (!this.boundElements.has(checkboxWrapper)) {
        this.boundElements.add(checkboxWrapper);

        const clickHandler = (e: MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
          this.toggleTurn(turn.id, e.shiftKey);
        };

        checkboxWrapper.addEventListener('click', clickHandler);
        this.boundHandlers.set(checkboxWrapper, clickHandler);
      }

      const isSelected = this.selectedIds.has(turn.id);
      checkboxWrapper.classList.toggle('gv-msg-checkbox-checked', isSelected);
      checkboxWrapper.setAttribute('aria-checked', String(isSelected));
      el.classList.toggle('gv-turn-selected', isSelected);
    }
  }

  private updateDomState(): void {
    const turns = findMessageTurns();
    for (const turn of turns) {
      const isSelected = this.selectedIds.has(turn.id);
      turn.element.classList.toggle('gv-turn-selected', isSelected);

      const checkbox = turn.element.querySelector<HTMLElement>(':scope > .gv-msg-select-checkbox');
      if (checkbox) {
        checkbox.classList.toggle('gv-msg-checkbox-checked', isSelected);
        checkbox.setAttribute('aria-checked', String(isSelected));
      }
    }
  }

  destroy(): void {
    this.exitSelectionMode();
    this.listeners = [];

    // Clean up event listeners and injected checkboxes
    for (const [element, handler] of this.boundHandlers.entries()) {
      element.removeEventListener('click', handler);
      element.remove();
    }
    this.boundHandlers.clear();

    document.querySelectorAll('.gv-msg-select-checkbox').forEach((el) => el.remove());
    document.querySelectorAll('.gv-turn-selected').forEach((el) => {
      el.classList.remove('gv-turn-selected');
    });
    document.querySelectorAll('.gv-turn-collapsed').forEach((el) => {
      el.classList.remove('gv-turn-collapsed');
    });
    document.body.classList.remove('gv-bulk-select-mode');
  }
}
