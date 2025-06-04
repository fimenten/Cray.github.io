import { element2TrayMap } from "./app";
import { deserialize, saveToIndexedDB, serialize } from "./io";
import { Tray } from "./tray";

export function getTrayFromId(Id: string): Tray | undefined {
  const element = document.querySelector(
    `[data-tray-id="${Id}"]`,
  ) as HTMLElement | null;

  // If the element is found, return its `__trayInstance` property, otherwise return null
  return element2TrayMap.get(element as HTMLElement);
}

export function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export function getWhiteColor() {
  return "#f5f5f5";
}

export function getUrlParameter(name: string) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " ")).trim();
}
export function getRootElement() {
  const rootTrayElement = document.querySelector("body > div.tray");
  if (rootTrayElement) {
    return rootTrayElement;
  }
  return null;
}

export function createDefaultRootTray() {
  const rootTray = new Tray("0", "0", "Root Tray");
  const content = rootTray.element.querySelector(".tray-content");

  const tray1 = new Tray(rootTray.id, generateUUID(), "ToDo");
  const tray2 = new Tray(rootTray.id, generateUUID(), "Doing");
  const tray3 = new Tray(rootTray.id, generateUUID(), "Done");

  rootTray.addChild(tray1);
  rootTray.addChild(tray2);
  rootTray.addChild(tray3);

  return rootTray;
}
export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function cloneTray(tray: Tray) {
  let ret = JSON.parse(JSON.stringify(tray)) as Tray;
  ret.id = generateUUID();
  return ret;
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

export function expandChildrenOneLevel(tray: Tray) {
  tray.children.forEach((child) => {
    child.isFolded = false;
    child.updateAppearance();
  });
}