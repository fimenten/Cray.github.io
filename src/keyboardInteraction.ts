
import { copyTray, cutTray, deleteTray, pasteFromClipboardInto, copyMarkdownToClipboard } from "./functions";
import store from "./store";
import { Tray } from "./tray";
import { getTrayFromId, toggleEditMode } from "./trayOperations";
import { selected_trays, cutSelected, copySelected, deleteSelected, showHookViewDialog } from "./hamburger";
import { openContextMenuKeyboard } from "./contextMenu";
import { undo } from "./history";

let lastEnter = { trayId: "", time: 0 };


export function handleKeyDown(tray: Tray, event: KeyboardEvent): void {
  if (store.getState().app.app.hamburgerMenuOpen) {
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
  if (event.ctrlKey && event.key === "ArrowUp") {
    event.preventDefault();
    tray.moveUp();
    return;
  }
  if (event.ctrlKey && event.key === "ArrowDown") {
    event.preventDefault();
    tray.moveDown();
    return;
  }
  if (event.ctrlKey && event.key === "ArrowRight") {
    event.preventDefault();
    tray.indentRight();
    return;
  }
  if (event.ctrlKey && event.key === "ArrowLeft") {
    event.preventDefault();
    tray.indentLeft();
    return;
  }
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
        const now = Date.now();
        if (lastEnter.trayId === tray.id && now - lastEnter.time < 300) {
          tray.unfoldChildren();
        } else {
          tray.toggleFold();
        }
        lastEnter = { trayId: tray.id, time: now };
      }
      break;
    case "Delete":
      event.preventDefault();
      if (event.ctrlKey) {
        if (selected_trays.length > 0) {
          deleteSelected();
        } else {
          deleteTray(tray);
        }
      }
      break;
    case "c":
      if (event.ctrlKey) {
        event.preventDefault();
        if (selected_trays.length > 0) {
          copySelected();
        } else {
          copyTray(tray);
        }
      }
      break;
    case "x":
      if (event.ctrlKey) {
        event.preventDefault();
        if (selected_trays.length > 0) {
          cutSelected();
        } else {
          cutTray(tray);
        }
      }
      break;
    case "v":
      if (event.ctrlKey) {
        event.preventDefault();
        pasteFromClipboardInto(tray);
      }
      break;
    case "z":
      if (event.ctrlKey) {
        event.preventDefault();
        undo();
      }
      break;
    case "m":
      if (event.ctrlKey){
        event.preventDefault();
        copyMarkdownToClipboard(tray);
        break
      }
    case "j":
      if (event.ctrlKey) {
        event.preventDefault();
        tray.toggleCheckbox();
      }
      break;
    case " ":
      if (event.ctrlKey) {
        event.preventDefault();
        openContextMenuKeyboard(tray);
      }
      break;
    case "ContextMenu":
      event.preventDefault();
      openContextMenuKeyboard(tray);
      break;
    case "F10":
      if (event.shiftKey) {
        event.preventDefault();
        openContextMenuKeyboard(tray);
      }
      break;
    case "t":
      if (event.ctrlKey) {
        event.preventDefault();
        showHookViewDialog();
      }
      break;
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
  if (store.getState().app.app.hamburgerMenuOpen) {
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
    const rect = nextTray.element.getBoundingClientRect();
    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < 0 || rect.bottom > viewHeight) {
      nextTray.element.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
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
