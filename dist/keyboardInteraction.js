import { copyTray, cutTray, deleteTray, pasteTray, toggleEditMode, } from "./contextMenu";
import store from "./store";
import { getTrayFromId } from "./utils";
export function handleKeyDown(tray, event) {
    if (store.getState().app.menuOpening) {
        return;
    }
    event.stopPropagation();
    if (tray.isEditing) {
        switch (event.key) {
            case "Enter":
                if (!event.shiftKey) {
                    event.preventDefault();
                    tray.finishTitleEdit(event.target);
                }
                break;
            case "Escape":
                event.preventDefault();
                tray.cancelTitleEdit(event.target);
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
            }
            else if (event.shiftKey) {
                toggleEditMode(tray);
            }
            else {
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
                pasteTray(tray);
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
export function moveFocus(tray, direction) {
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
export function getPreviousSibling(tray) {
    if (tray.parentId) {
        const parent = getTrayFromId(tray.parentId);
        const index = parent.children.indexOf(tray);
        return parent.children[index - 1] || null;
    }
    return null;
}
export function getNextSibling(tray) {
    if (tray.parentId) {
        const parent = getTrayFromId(tray.parentId);
        const index = parent.children.indexOf(tray);
        return parent.children[index + 1] || null;
    }
    return null;
}
