import { SelectionManager } from './selectionManager';
import { removeBulkActionToast } from './toast';
import { BulkActionsToolbar } from './toolbar';

const MUTATION_DEBOUNCE_MS = 200;

/**
 * Initializes the bulk message selection utility and toolbar in Gemini.
 * Returns a teardown function that cleanly unmounts all DOM modifications,
 * listeners, and observers.
 */
export function startBulkMessageActions(): () => void {
  const selectionManager = new SelectionManager();
  const toolbar = new BulkActionsToolbar(selectionManager);

  // Initial sync
  selectionManager.syncCheckboxes();

  // Watch for DOM mutations (new incoming messages or streaming turns)
  let debounceTimer: number | null = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      selectionManager.syncCheckboxes();
    }, MUTATION_DEBOUNCE_MS);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Keyboard shortcut: Escape exits selection mode
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectionManager.getIsSelectionMode()) {
      e.preventDefault();
      selectionManager.exitSelectionMode();
    }
  };
  window.addEventListener('keydown', handleKeydown, true);

  // Clear selection on route navigation
  let currentPath = window.location.pathname;
  const checkRouteChange = () => {
    if (window.location.pathname !== currentPath) {
      currentPath = window.location.pathname;
      selectionManager.exitSelectionMode();
      selectionManager.syncCheckboxes();
    }
  };
  window.addEventListener('popstate', checkRouteChange);

  return () => {
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    observer.disconnect();
    window.removeEventListener('keydown', handleKeydown, true);
    window.removeEventListener('popstate', checkRouteChange);
    toolbar.destroy();
    selectionManager.destroy();
    removeBulkActionToast();
  };
}
