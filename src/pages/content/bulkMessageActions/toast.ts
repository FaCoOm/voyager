let activeToast: HTMLElement | null = null;
let toastTimeoutId: number | null = null;

export function showBulkActionToast(message: string, durationMs = 2500): void {
  if (activeToast) {
    activeToast.remove();
    activeToast = null;
  }
  if (toastTimeoutId !== null) {
    window.clearTimeout(toastTimeoutId);
    toastTimeoutId = null;
  }

  const toast = document.createElement('div');
  toast.className = 'gv-bulk-action-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  activeToast = toast;

  // Trigger animation frame for transition
  window.requestAnimationFrame(() => {
    toast.classList.add('gv-bulk-action-toast-visible');
  });

  toastTimeoutId = window.setTimeout(() => {
    toast.classList.remove('gv-bulk-action-toast-visible');
    window.setTimeout(() => {
      toast.remove();
      if (activeToast === toast) activeToast = null;
    }, 300);
    toastTimeoutId = null;
  }, durationMs);
}

export function removeBulkActionToast(): void {
  if (toastTimeoutId !== null) {
    window.clearTimeout(toastTimeoutId);
    toastTimeoutId = null;
  }
  if (activeToast) {
    activeToast.remove();
    activeToast = null;
  }
}
