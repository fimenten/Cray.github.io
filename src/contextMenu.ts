import { cloneTray, generateUUID, getTrayFromId, getWhiteColor } from "./utils";
import { Tray } from "./tray";
import { deserialize, saveToIndexedDB, serialize } from "./io";
import { showLabelRemover, showLabelSelector } from "./label";
import { fetchTrayList, setNetworkOption } from "./networks";
import { meltTray, showMarkdownOutput } from "./functions";
import { toggleFold } from "./data/tray2";

export function onContextMenu(
  tray: Tray,
  event: MouseEvent | TouchEvent,
): void {
  event.preventDefault();
  event.stopPropagation();
  // Remove existing context menu
  const existingMenu = document.querySelector(
    ".context-menu",
  ) as HTMLElement | null;
  existingMenu?.remove();

  // Determine the color to show
  const showColor = tray.borderColor || getWhiteColor();

  // Create the context menu
  const menu = document.createElement("div");
  menu.classList.add("context-menu");
  menu.setAttribute("tabindex", "-1");
  menu.innerHTML = `
      <div class="menu-item" data-action="fetchTrayFromServer" tabindex="0">Fetch Tray from Server</div>
      <div class="menu-item" data-action="networkSetting" tabindex="1">networkSetting</div>
      <div class="menu-item" data-action="open_this_in_other" tabindex="2">Open This in Other</div>
      <div class="menu-item" data-action="toggleFlexDirection" tabindex="3">Toggle Flex Direction</div>
      <div class="menu-item" data-action="meltTray" tabindex="0">Melt this tray</div>
      <div class="menu-item" data-action="expandAll" tabindex="0">Expand All</div>

      <div class="menu-item" data-action="copy" tabindex="0">Copy</div>
      <div class="menu-item" data-action="paste" tabindex="0">Paste</div>
      <div class="menu-item" data-action="cut" tabindex="0">Cut</div>
      <div class="menu-item" data-action="delete" tabindex="0">Remove</div>
      <div class="menu-item" data-action="add_fetch_networkTray_to_child" tabindex="0">Add Fetch NetworkTray to Child</div>
      <div class="menu-item" data-action="add_child_from_localStorage" tabindex="0">Add Child from Local Storage</div>
      <div class="menu-item" data-action="addLabelTray" tabindex="0">Add Label Tray</div>
      <div class="menu-item" data-action="addLabel" tabindex="0">Add Label</div>
      <div class="menu-item" data-action="removeLabel" tabindex="0">Edit Labels</div>
      <div class="menu-item" data-action="outputMarkdown" tabindex="0">Output as Markdown</div>
      <div class="menu-item" data-action="addTemplateTray" tabindex="0">Add Template Tray</div>
      <div class="menu-item" tabindex="0">
        <input type="color" id="borderColorPicker" value="${showColor}">
      </div>
    `;

  document.body.appendChild(menu);
  positionMenu(event, menu);

  // Add event listeners
  const menuItems = menu.querySelectorAll(
    ".menu-item",
  ) as NodeListOf<HTMLElement>;
  let currentFocus = 0;

  const handler = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      menuItems[currentFocus].classList.remove("focused");
      currentFocus =
        e.key === "ArrowDown"
          ? (currentFocus + 1) % menuItems.length
          : (currentFocus - 1 + menuItems.length) % menuItems.length;
      menuItems[currentFocus].classList.add("focused");
      menuItems[currentFocus].focus();
    } else if (e.key === "Enter") {
      menuItems[currentFocus].click();
    } else if (e.key === "Escape") {
      menu.remove();
    }
  };

  document.addEventListener("keydown", handler.bind(tray),{once:true});

  menuItems[0].classList.add("focused");
  menuItems[0].focus();

  const colorPicker = menu.querySelector(
    "#borderColorPicker",
  ) as HTMLInputElement;
  colorPicker.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLInputElement;
    tray.borderColor = target.value;
    tray.changeBorderColor(target.value);
    tray.updateAppearance();
    menu.remove();
  });

  const handleMenuClick = (e: MouseEvent) => {
    const action = (e.target as HTMLElement).getAttribute("data-action");
    if (action) executeMenuAction(tray, action, event, menu);
  };

  const handleOutsideClick = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) {
      menu.remove();
      document.removeEventListener("click", handleOutsideClick);
    }
  };

  menu.addEventListener("click", handleMenuClick);
  document.addEventListener("click", handleOutsideClick);
  // this.setupKeyboardNavigation(this.element);
}

export function positionMenu(
  event: MouseEvent | TouchEvent,
  menu: HTMLElement,
): void {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Determine the initial position based on the event type
  let left: number;
  let top: number;

  if (event instanceof MouseEvent) {
    // For mouse events, use clientX and clientY
    left = event.clientX;
    top = event.clientY;
  } else if (event instanceof TouchEvent && event.touches.length > 0) {
    // For touch events, use the first touch point's clientX and clientY
    left = event.touches[0].clientX;
    top = event.touches[0].clientY;
  } else {
    // Default position if event data is not available
    left = 0;
    top = 0;
  }

  menu.style.visibility = "hidden";
  menu.style.display = "block";
  menu.style.position = "absolute";

  setTimeout(() => {
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;

    // Adjust position to fit within the viewport
    left = left > viewportWidth / 2 ? left - menuWidth : left;
    top = top > viewportHeight / 2 ? top - menuHeight : top;

    left = Math.max(0, Math.min(left, viewportWidth - menuWidth));
    top = Math.max(0, Math.min(top, viewportHeight - menuHeight));

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.visibility = "visible";
  }, 0);
}

export function copyTray(tray: Tray) {
  const serialized = serialize(cloneTray(tray));
  navigator.clipboard.writeText(serialized);
}

export function renameTray(tray: Tray) {
  const title = tray.element.querySelector(".tray-title");
  if (!title) {
    return;
  }
  title.setAttribute("contenteditable", "true");
  // title.focus();
  saveToIndexedDB();
}

export function cutTray(tray: Tray) {
  const serialized = serialize(cloneTray(tray));
  navigator.clipboard.writeText(serialized);
}

export function pasteTray(tray: Tray) {
  const serialized = navigator.clipboard.readText().then((str) => {
    try {
      let newTray = deserialize(str);
      if (!newTray) {
        return;
      }
      tray.addChild(newTray);
    } catch {
      const texts = str.split("\n").filter((line) => line.trim() !== "");
      const trays = texts.map(
        (text) => new Tray(tray.id, generateUUID(), text),
      );
      trays.map((t) => tray.addChild(t));
    }
  });
}

export function deleteTray(tray: Tray) {
  const parent = getTrayFromId(tray.parentId) as Tray;
  const indexInParent = parent.children.findIndex(
    (child) => child.id === tray.id,
  );

  parent.removeChild(tray.id);
  tray.element.remove();

  tray.moveFocusAfterDelete(parent, indexInParent);

  saveToIndexedDB();
}
export function executeMenuAction(
  tray: Tray,
  action: string,
  event: MouseEvent | TouchEvent,
  menu: HTMLElement,
): void {
  switch (action) {
    case "copy":
      copyTray(tray);
      break;
    case "rename":
      renameTray(tray);
      break;
    case "cut":
      cutTray(tray);
      break;
    case "paste":
      pasteTray(tray);
      saveToIndexedDB();
      break;
    case "addLabel":
      showLabelSelector(tray, event);
      break;
    case "removeLabel":
      showLabelRemover(tray);
      break;
    case "delete":
      deleteTray(tray);
      break;
    case "toggleFlexDirection":
      tray.toggleFlexDirection();
      break;
    case "networkSetting":
      setNetworkOption(tray);
      saveToIndexedDB();
      break;
    case "meltTray":
      meltTray(tray);
      saveToIndexedDB();
      break;
    case "expandAll":
      expandAll(tray);
      break;
    //   case "add_fetch_networkTray_to_child":
    // this.add_fetch_networkTray_to_child();
    // break;
    // case "open_this_in_other":
    //   this.open_this_in_other();
    //   break;

    case "fetchTrayFromServer":
      fetchTrayList(tray);
      break;
    //   case "addLabelTray":
    //     this.addLabelTray();
    //     break;
    case "outputMarkdown":
      showMarkdownOutput(tray);
      break;
    // case "addTemplateTray":
    //   console.log("Add Template Tray clicked");
    //   this.showTemplateSelectionPopup(event);
    //   break;
  }
  menu.remove();
  saveToIndexedDB;
}
export function toggleEditMode(tray: Tray) {
  const titleElement = tray.element.querySelector(
    ".tray-title",
  ) as HTMLDivElement;
  if (!titleElement) {
    return;
  }
  if (titleElement.getAttribute("contenteditable") === "true") {
    tray.finishTitleEdit(titleElement);
  } else {
    tray.startTitleEdit(titleElement);
  }
}
export function expandAll(tray: Tray) {
  tray.isFolded = false;
  tray.children.map((t) => expandAll(t));
  tray.updateAppearance();
}
