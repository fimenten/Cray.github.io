import { element2TrayMap } from "./app";
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
export function getEventCoordinates(
  event: MouseEvent | TouchEvent,
): [number, number] {
  if (event instanceof MouseEvent) {
    return [event.clientX, event.clientY];
  } else if (event instanceof TouchEvent && event.touches.length > 0) {
    return [event.touches[0].clientX, event.touches[0].clientY];
  }
  return [0, 0];
}
