// import {exportData,importData} from "./io"
import {getTrayFromId,getRandomColor,getWhiteColor} from "./utils"
import { generateUUID,getRootElement,cloneTray} from "./utils";
import { getUrlParameter } from "./utils";
import { serialize,deserialize, loadFromIndexedDB, saveToIndexedDB } from "./io";
import { createHamburgerMenu,selected_trays } from "./humberger";
import { LabelManager } from "./label";
import { downloadData,showUploadNotification,uploadData,fetchTrayList, setNetworkOption } from "./networks";
import { meltTray } from "./functions";
import {Tray,TrayId} from "./tray"
import { createSlice,PayloadAction } from "@reduxjs/toolkit";
import store from "./store";
import { setLastFocused } from "./state";



export const element2TrayMap = new WeakMap<HTMLElement, Tray>();
export const id2TrayData = new Map<TrayId, Tray>();

const TRAY_DATA_KEY = "trayData";

export const globalLabelManager = new LabelManager();










window.addEventListener("DOMContentLoaded", () => {
  let sessionId = getUrlParameter("sessionId");
  if (sessionId == "new") {
    let id = generateUUID();
    window.location.replace(
      window.location.href.replace("?sessionId=new", "?sessionId=" + id)
    );
  }
  if (sessionId) {
    loadFromIndexedDB(sessionId);
  } else {
    loadFromIndexedDB();
  }
  console.log("loaded")
  if (sessionId) {
    const savedTitle = localStorage.getItem(sessionId + "_title");
    if (savedTitle) {
      document.title = savedTitle;
    }
  }

  const { leftBar } = createHamburgerMenu();
  document.body.insertBefore(leftBar, document.body.firstChild);
  const actionButtons = createActionButtons();
  document.body.appendChild(actionButtons);
  const root = getRootElement() as HTMLDivElement;
  setLastFocused(element2TrayMap.get(root) as Tray);
  root.focus();

});





function createActionButtons() {
  const buttonContainer = document.createElement("div");
  buttonContainer.classList.add("action-buttons");

  const addButton = document.createElement("button");
  addButton.textContent = "+";
  addButton.classList.add("action-button", "add-button");
  addButton.addEventListener("click", addNewTrayToParent);

  const insertButton = document.createElement("button");
  insertButton.textContent = "↩";
  insertButton.classList.add("action-button", "insert-button");
  insertButton.addEventListener("click", addNewTrayToFocused)

  buttonContainer.appendChild(addButton);
  buttonContainer.appendChild(insertButton);

  return buttonContainer;
}

function addNewTrayToParent() {
  const lastFocusedTray = getTrayFromId(store.getState().app.lastFocused as string) as Tray;
  const parentTray = getTrayFromId(lastFocusedTray.parentId);

  if (parentTray) {
    const newTray = new Tray(parentTray.id, Date.now().toString(), "New Tray");
    parentTray.addChild(newTray);
    parentTray.isFolded = false;
    parentTray.updateAppearance();
    newTray.element.focus();
    const newTitleElement = newTray.element.querySelector(
      ".tray-title"
    ) as HTMLDivElement;
    newTray.startTitleEdit(newTitleElement);
  }
}

function addNewTrayToFocused() {
  const lastFocusedId = store.getState().app.lastFocused
  if (!lastFocusedId){return}
  const lastFocusedTray = getTrayFromId(lastFocusedId);
  if (!lastFocusedTray){return}

  
  
  const newTray = new Tray(lastFocusedTray.id, Date.now().toString(), "New Tray");
  lastFocusedTray.addChild(newTray);
  lastFocusedTray.isFolded = false;
  lastFocusedTray.updateAppearance();
  newTray.element.focus();
  const newTitleElement = newTray.element.querySelector(
    ".tray-title"
  ) as HTMLDivElement;
  newTray.startTitleEdit(newTitleElement);
}


// function labelFilteringWithDestruction(labelName:string, tray:Tray) {
//     console.log(tray.labels);
//     console.log(tray.labels.includes(labelName));

//     if (tray.labels.includes(labelName)) {
//       return tray;
//     } else {
//       let children_pre = tray.children;
//       let children_after = [];
//       children_after = children_pre
//         .map((t) => this.labelFilteringWithDestruction(labelName, t))
//         .filter((t) => t != null);

//       console.log(children_after.length);
//       if (children_after.length != 0) {
//         tray.children = [];
//         children_pre.map((t) => {
//           t.element.remove();
//         });
//         console.log(tray.children.length);
//         children_after.map((t) => tray.addChild(t));
//         tray.updateAppearance();
//         return tray;
//       }
//     }
//     return null;
//   }

