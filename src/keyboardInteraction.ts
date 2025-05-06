
import { copyTray, cutTray, deleteTray, pasteFromClipboardInto, showMarkdownOutput } from "./functions";
import store from "./store";
import { Tray } from "./tray";
import { getTrayFromId, toggleEditMode } from "./utils";


export function handleKeyDown(tray: Tray, event: KeyboardEvent): void {
  if (store.getState().app.menuOpening) {
    return;
  }
  event.stopPropagation();

  if (tray.isEditing) {
    switch (event.key) {
      case "Enter":
        if (!event.shiftKey) {
          event.preventDefault();
          tray.finishTitleEdit(event.target as HTMLDivElement);
        }
        break;
      case "Escape":
        event.preventDefault();
        tray.cancelTitleEdit(event.target as HTMLDivElement);
        break;
    }
    return;
  }

  tray.element.focus();
  switch (event.key) {
    case "ArrowUp":
      event.preventDefault();
      moveFocus(tray, "up");
      break;
    case "ArrowDown":
      event.preventDefault();
      moveFocus(tray, "down");
      break;
    case "ArrowLeft":
      event.preventDefault();
      moveFocus(tray, "left");
      break;
    case "ArrowRight":
      event.preventDefault();
      moveFocus(tray, "right");
      break;
    case "Enter":
      event.preventDefault();
      if (event.ctrlKey) {
        tray.addNewChild();
      } else if (event.shiftKey) {
        toggleEditMode(tray);
      } else {
        tray.toggleFold();
      }
      break;
    case "Delete":
      event.preventDefault();
      if (event.ctrlKey) {
        deleteTray(tray);
      }
      break;
    case "c":
      if (event.ctrlKey) {
        event.preventDefault();
        copyTray(tray);
      }
      break;
    case "x":
      if (event.ctrlKey) {
        event.preventDefault();
        cutTray(tray);
      }
      break;
    case "v":
      if (event.ctrlKey) {
        event.preventDefault();
        pasteFromClipboardInto(tray);
      }
      break;
    case "m":
      if (event.ctrlKey){
        event.preventDefault();
        showMarkdownOutput(tray)
        break
      }
    // case " ":
    //   if (event.ctrlKey) {
    //     event.preventDefault();
    //     this.onContextMenu(event);
    //   }
    //   break;
  }
}
export function moveFocus(
  tray: Tray,
  direction: "up" | "down" | "left" | "right",
) {
  if (tray.isEditing) {
    return;
  }
  if (store.getState().app.menuOpening) {
    return;
  }

  let nextTray;
  switch (direction) {
    case "up":
      nextTray = getPreviousSibling(tray);
      break;
    case "down":
      nextTray = getNextSibling(tray);
      break;
    case "left":
      nextTray = getTrayFromId(tray.parentId);
      break;
    case "right":
      nextTray = tray.children[0];
      break;
  }
  if (nextTray) {
    nextTray.element.focus();
  }
}
export function getPreviousSibling(tray: Tray) {
  if (tray.parentId) {
    const parent = getTrayFromId(tray.parentId) as Tray;
    const index = parent.children.indexOf(tray);
    return parent.children[index - 1] || null;
  }
  return null;
}

export function getNextSibling(tray: Tray) {
  if (tray.parentId) {
    const parent = getTrayFromId(tray.parentId) as Tray;
    const index = parent.children.indexOf(tray);
    return parent.children[index + 1] || null;
  }
  return null;
}
