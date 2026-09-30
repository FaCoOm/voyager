import { getAssistantTurnSelectors, getUserTurnSelectors } from '@/core/utils/selectors';

import type { MessageRole, SelectableTurn } from './types';

const INJECTED_UI_SELECTOR =
  '.gv-fork-btn, .gv-fork-confirm, .gv-fork-indicator-group, .gv-msg-select-checkbox, .gv-selection-toolbar, .gv-bulk-actions-toolbar';

/**
 * Strips Voyager-injected controls and hidden nodes to extract clean textual content.
 */
export function extractCleanTurnText(element: HTMLElement): string {
  try {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(INJECTED_UI_SELECTOR).forEach((el) => el.remove());
    return (clone.textContent || '').trim();
  } catch {
    return (element.textContent || '').trim();
  }
}

/**
 * Determines whether an element represents a user prompt turn.
 */
export function isUserTurnElement(element: HTMLElement): boolean {
  const userSelectors = getUserTurnSelectors();
  return userSelectors.some((sel) => element.matches(sel) || !!element.closest(sel));
}

/**
 * Collects all candidate message turns (both user prompts and model responses)
 * from the conversation container in proper document order.
 */
export function findMessageTurns(root: ParentNode = document): SelectableTurn[] {
  const userSelectors = getUserTurnSelectors();
  const assistantSelectors = getAssistantTurnSelectors();

  const userNodes = Array.from(root.querySelectorAll<HTMLElement>(userSelectors.join(', ')));
  const assistantNodes = Array.from(
    root.querySelectorAll<HTMLElement>(assistantSelectors.join(', ')),
  );

  // Filter out any descendants of elements that already matched
  const isTopLevel = (el: HTMLElement, list: HTMLElement[]) =>
    !list.some((other) => other !== el && other.contains(el));

  const topUserNodes = userNodes.filter((el) => isTopLevel(el, userNodes));
  const topAssistantNodes = assistantNodes.filter((el) => isTopLevel(el, assistantNodes));

  const allElements = [...topUserNodes, ...topAssistantNodes];

  // Exclude deep-research immersive panels or toolbars if present
  const validElements = allElements.filter((el) => !el.closest('deep-research-immersive-panel'));

  // Sort elements in DOM appearance order
  validElements.sort((a, b) => {
    const position = a.compareDocumentPosition(b);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  return validElements.map((element, index) => {
    const isUser = topUserNodes.includes(element);
    const role: MessageRole = isUser ? 'user' : 'assistant';
    const id = element.dataset.gvTurnId || `gv-turn-${role}-${index}`;
    element.dataset.gvTurnId = id;

    return {
      id,
      role,
      element,
      text: extractCleanTurnText(element),
    };
  });
}

/**
 * Toggles a visual collapse state on a turn element.
 * Returns true if collapsed, false if expanded.
 */
export function toggleTurnCollapse(element: HTMLElement, forceCollapse?: boolean): boolean {
  const shouldCollapse =
    forceCollapse !== undefined ? forceCollapse : !element.classList.contains('gv-turn-collapsed');

  element.classList.toggle('gv-turn-collapsed', shouldCollapse);
  return shouldCollapse;
}
