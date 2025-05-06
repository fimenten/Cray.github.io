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
// import { LabelManager } from "./label";
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
import { createActionButtons } from "./actionbotton";


export const element2TrayMap = new WeakMap<HTMLElement, Tray>();
export const id2TrayData = new Map<TrayId, Tray>();

const TRAY_DATA_KEY = "trayData";

// export const globalLabelManager = new LabelManager();


window.addEventListener("DOMContentLoaded", () => {
  // const actionButtons = createActionButtons();
  // Attempt alternative insertion if needed
  // document.body.appendChild(actionButtons);
  let sessionId = getUrlParameter("sessionId");
  if (sessionId == "new") {
    let id = generateUUID();
    window.location.replace(
      window.location.href.replace("?sessionId=new", "?sessionId=" + id),
    );
  }
  if (sessionId) {
    loadFromIndexedDB(sessionId);
  } else {
    loadFromIndexedDB();
  }
  console.log("loaded");
  if (sessionId) {
    const savedTitle = localStorage.getItem(sessionId + "_title");
    if (savedTitle) {
      document.title = savedTitle;
    }
  }

  // const { leftBar } = createHamburgerMenu();
  // console.log("leftBar:", leftBar); // Debug log
  // document.body.insertBefore(leftBar, document.body.firstChild);
  // document.body.appendChild(leftBar);



  // document.body.insertBefore(actionButtons, leftBar);
  
  // const root = getRootElement(); // Removed TypeScript casting for generality
  // setLastFocused(element2TrayMap.get(root) as Tray);
  // root.focus();
});


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
