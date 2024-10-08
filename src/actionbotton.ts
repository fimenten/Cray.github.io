// import {exportData,importData} from "./io"
import { getTrayFromId, getRandomColor, getWhiteColor } from "./utils";
import { generateUUID, getRootElement, cloneTray } from "./utils";
import { getUrlParameter } from "./utils";
import {
  serialize,
  deserialize,
  loadFromIndexedDB,
  saveToIndexedDB,
} from "./io";
import { createHamburgerMenu, selected_trays } from "./humberger";
import { LabelManager } from "./label";
import {
  downloadData,
  showUploadNotification,
  uploadData,
  fetchTrayList,
  setNetworkOption,
} from "./networks";
import { meltTray } from "./functions";
import { Tray, TrayId } from "./tray";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import store from "./store";
import { setLastFocused } from "./state";

export function createActionButtons() {
    console.log("Creating action buttons");
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("action-buttons");
  
    const addButton = document.createElement("button");
    addButton.textContent = "+";
    addButton.classList.add("action-button", "add-button");
    addButton.addEventListener("click", addNewTrayToParent);
  
    const insertButton = document.createElement("button");
    insertButton.textContent = "↩";
    insertButton.classList.add("action-button", "insert-button");
    insertButton.addEventListener("click", addNewTrayToFocused);
  
    buttonContainer.appendChild(addButton);
    buttonContainer.appendChild(insertButton);
  
    console.log("Action buttons created:", buttonContainer);
    return buttonContainer;
  }
  
  function addNewTrayToParent() {
    const lastFocusedId = store.getState().app.lastFocused;
    if (!lastFocusedId) {
      return;
    }
    const lastFocusedTray = getTrayFromId(lastFocusedId);
    if (!lastFocusedTray) {
      return;
    }
    const parentTray = getTrayFromId(lastFocusedTray.parentId);
  
    if (parentTray) {
      const newTray = new Tray(parentTray.id, Date.now().toString(), "New Tray");
      parentTray.addChild(newTray);
      parentTray.isFolded = false;
      parentTray.updateAppearance();
      newTray.element.focus();
      const newTitleElement = newTray.element.querySelector(
        ".tray-title",
      ) as HTMLDivElement;
      newTray.startTitleEdit(newTitleElement);
    }
  }
  
  function addNewTrayToFocused() {
    const lastFocusedId = store.getState().app.lastFocused;
    if (!lastFocusedId) {
      return;
    }
    const lastFocusedTray = getTrayFromId(lastFocusedId);
    if (!lastFocusedTray) {
      return;
    }
  
    const newTray = new Tray(
      lastFocusedTray.id,
      Date.now().toString(),
      "New Tray",
    );
    lastFocusedTray.addChild(newTray);
    lastFocusedTray.isFolded = false;
    lastFocusedTray.updateAppearance();
    newTray.element.focus();
    const newTitleElement = newTray.element.querySelector(
      ".tray-title",
    ) as HTMLDivElement;
    newTray.startTitleEdit(newTitleElement);
  }