// Tray manipulation operations
// This breaks the circular dependency between tray.ts and utils.ts

import { Tray } from "./tray";
import { element2TrayMap } from "./app";

export function getTrayFromId(Id: string): Tray | undefined {
  const element = document.querySelector(
    `[data-tray-id="${Id}"]`,
  ) as HTMLElement | null;

  // If the element is found, return its __trayInstance property, otherwise return null
  return element2TrayMap.get(element as HTMLElement);
}

export function toggleEditMode(tray: Tray) {
  console.log("editing");
  // Click event on tray-title to allow editing
  const titleElement = tray.element.querySelector(
    ".tray-title",
  ) as HTMLElement | null;
  if (titleElement) {
    titleElement.contentEditable = "true";
    titleElement.focus();
    tray.isEditing = true;
    // Select all text for editing
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(titleElement);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}

export function expandAll(tray: Tray) {
  tray.isFolded = false;
  for (const child of tray.children) {
    expandAll(child);
  }
  tray.updateChildrenAppearance();
}

export function expandChildrenOneLevel(tray: Tray) {
  for (const child of tray.children) {
    child.isFolded = false;
    child.updateAppearance();
  }
}

export function collapseChildrenOneLevel(tray: Tray) {
  for (const child of tray.children) {
    child.isFolded = true;
    child.updateAppearance();
  }
}