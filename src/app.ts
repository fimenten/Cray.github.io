// import {exportData,importData} from "./io"
import { getRandomColor, getWhiteColor } from "./utils";
import { getTrayFromId } from "./trayOperations";
import { generateUUID, getRootElement } from "./utils";
import { cloneTray } from "./trayFactory";
import { getUrlParameter } from "./utils";
import {
  serialize,
  deserialize,
  loadFromIndexedDB,
  saveToIndexedDB,
} from "./io";
import { createHamburgerMenu, selected_trays } from "./hamburger";
import {
  downloadData,
  showUploadNotification,
  uploadData,
  fetchTrayList,
  setNetworkOption,
  syncTray,
} from "./networks";
import { meltTray } from "./functions";
import { Tray } from "./tray";
import { TrayId } from "./types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import store from "./store";
import { setLastFocused } from "./state";
import { createActionButtons } from "./actionbotton";
import { pluginManager } from "./pluginManager";
import { pluginStorage } from "./pluginStorage";


export const element2TrayMap = new WeakMap<HTMLElement, Tray>();
export const id2TrayData = new Map<TrayId, Tray>();

const TRAY_DATA_KEY = "trayData";

window.addEventListener("storage", (ev) => {
  if (document.visibilityState === "hidden") {
    const sessionId = getUrlParameter("sessionId") || TRAY_DATA_KEY;
    if (ev.key === `update_${sessionId}`) {
      loadFromIndexedDB(sessionId);
    }
  }
});



window.addEventListener("DOMContentLoaded", async () => {
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
    await loadFromIndexedDB(sessionId);
  } else {
    await loadFromIndexedDB();
  }
  console.log("loaded");
  if (sessionId) {
    const savedTitle = localStorage.getItem(sessionId + "_title");
    if (savedTitle) {
      document.title = savedTitle;
    }
  }

  // Initialize plugin system
  try {
    const enabledPlugins = await pluginStorage.getEnabledPlugins();
    for (const plugin of enabledPlugins) {
      try {
        await pluginManager.registerPlugin(plugin);
        console.log(`Plugin ${plugin.manifest.name} loaded successfully`);
      } catch (error) {
        console.error(`Failed to load plugin ${plugin.manifest.name}:`, error);
      }
    }
  } catch (error) {
    console.error("Failed to initialize plugin system:", error);
  }

  // Sync indicator system removed

  const root = getRootElement();
  if (root) {
    const tray = element2TrayMap.get(root as HTMLElement) as Tray;
    if (tray) {
      await syncTray(tray);
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


