// Factory functions for creating Tray instances
// This breaks the circular dependency between tray.ts and utils.ts

import { Tray } from "./tray";
import { generateUUID } from "./utils";

export function createDefaultRootTray() {
  const rootTray = new Tray("0", "0", "Root Tray", null, null, "column", null, null, false); // root should be unfolded
  const content = rootTray.element.querySelector(".tray-content");

  const tray1 = new Tray(rootTray.id, generateUUID(), "ToDo");
  const tray2 = new Tray(rootTray.id, generateUUID(), "Doing");
  const tray3 = new Tray(rootTray.id, generateUUID(), "Done");

  // Add in reverse order since addChild uses unshift (prepends)
  rootTray.addChild(tray3);
  rootTray.addChild(tray2);
  rootTray.addChild(tray1);

  return rootTray;
}

export function cloneTray(tray: Tray) {
  let ret = JSON.parse(JSON.stringify(tray)) as Tray;
  ret.id = generateUUID();
  return ret;
}