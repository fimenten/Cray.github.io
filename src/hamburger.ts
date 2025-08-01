import {
  generateUUID,
  getRootElement,
} from "./utils";
import { createDefaultRootTray, cloneTray } from "./trayFactory";
import { getTrayFromId } from "./trayOperations";
import { exportData, importData, getAllSessionIds, saveToIndexedDB } from "./io";
import { getUrlParameter } from "./utils";
import { element2TrayMap } from "./app";
import { Tray } from "./tray";
import { downloadData, uploadData } from "./networks";
import { copyTray, deleteTray } from "./functions";
import { setLastFocused, toggleAutoUpload, selectAutoUploadEnabled } from "./state";
import { showPluginManagerDialog } from "./pluginUI";
import store from "./store";
import { globalSyncManager } from "./globalSync";

// Notification system for hook tasks
export function showHookNotification(hookNames: string[]): void {
  if (hookNames.length === 0) return;
  
  const notification = document.createElement("div");
  notification.classList.add("hook-notification");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #28a745;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10001;
    font-size: 14px;
    max-width: 300px;
    animation: slideInRight 0.3s ease-out;
  `;
  
  const hookText = hookNames.map(hook => `@${hook}`).join(', ');
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>🏷️</span>
      <span>Task added with hooks: ${hookText}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}


export let selected_trays: Tray[] = [];

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Build the normalized URL
    let normalized = urlObj.origin;
    
    // Add pathname if it's not just '/'
    if (urlObj.pathname && urlObj.pathname !== '/') {
      // Remove trailing slash from pathname
      normalized += urlObj.pathname.replace(/\/$/, '');
    }
    
    return normalized;
  } catch (e) {
    // If URL parsing fails, just trim whitespace and trailing slashes
    return url.trim().replace(/\/$/, '');
  }
}

export interface HamburgerMenuItem {
  action: string;
  label: string;
}

export const GENERAL_MENU_ITEMS: HamburgerMenuItem[] = [
  { action: "search", label: "🔍 Search Trays" },
  { action: "autoSyncSettings", label: "🔄 Auto-Sync Settings" },
  { action: "reset", label: "トレイをリセット" },
  { action: "save", label: "現在の状態を保存" },
  { action: "load", label: "保存した状態を読み込む" },
  { action: "export", label: "データのエクスポート" },
  { action: "import", label: "データのインポート" },
  { action: "set_default_server", label: "set_default_server" },
  { action: "manage_server_passwords", label: "Manage Server Passwords" },
  {
    action: "import_network_tray_directly_as_root",
    label: "import_network_tray_directly_as_root",
  },
  { action: "editTitle", label: "ページタイトルを編集" },
  { action: "uploadAll", label: "Upload All" },
  { action: "downloadAll", label: "Download All" },
  { action: "editSessionId", label: "セッションIDを編集" },
  { action: "newSession", label: "New Session" },
  { action: "temporalTray", label: "Temporal Tray" },
  { action: "pluginManager", label: "🔌 Plugin Manager" },
];

export const SELECTION_MENU_ITEMS: HamburgerMenuItem[] = [
  { action: "copySelected", label: "Copy selected" },
  { action: "cutSelected", label: "Cut selected" },
];

function appendMenuItems(
  menu: HTMLElement,
  items: Array<{ action: string; label: string }>,
) {
  items.forEach(({ action, label }) => {
    const item = document.createElement("div");
    item.classList.add("menu-item");
    item.dataset.action = action;
    item.textContent = label;
    menu.appendChild(item);
  });
}

export function clearSelectedTrays(): void {
  selected_trays = [];
  const checkboxes = document.querySelectorAll<HTMLInputElement>(".tray-checkbox");
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });
}

function resetAllTrays() {
  localStorage.removeItem("trayData");
  const rootTray = createDefaultRootTray();
  document.body.innerHTML = "";
  document.body.appendChild(rootTray.element);
  createHamburgerMenu();
}
export function createHamburgerMenu() {
  const leftBar = document.createElement("div");
  leftBar.classList.add("left-bar");
  document.body.appendChild(leftBar);
  const hamburger = document.createElement("div");
  hamburger.classList.add("hamburger-menu");
  hamburger.innerHTML = "☰";
  leftBar.appendChild(hamburger);

  const sessionButton = document.createElement("div");
  sessionButton.classList.add("session-list-button");
  sessionButton.innerHTML = "📑";
  leftBar.appendChild(sessionButton);
  sessionButton.addEventListener("click", showSessionList);

  const selectionButton = document.createElement("div");
  selectionButton.classList.add("selection-menu-button");
  selectionButton.innerHTML = "✔";
  leftBar.appendChild(selectionButton);

  const hookButton = document.createElement("div");
  hookButton.classList.add("hook-view-button");
  hookButton.innerHTML = "🏷️";
  leftBar.appendChild(hookButton);
  hookButton.addEventListener("click", showHookViewDialog);


  const selectionMenu = document.createElement("div");
  selectionMenu.classList.add("selection-menu-items");
  selectionMenu.style.display = "none";
  leftBar.appendChild(selectionMenu);
  selectionMenu.style.position = "fixed";
  appendMenuItems(selectionMenu, SELECTION_MENU_ITEMS);


  const menu = document.createElement("div");
  menu.classList.add("hamburger-menu-items");
  menu.style.display = "none";
  leftBar.appendChild(menu);
  menu.style.position = "fixed";
  appendMenuItems(menu, GENERAL_MENU_ITEMS);

  document.body.appendChild(menu);

  // メニュー項目のスタイリング
  const menuItems: NodeListOf<HTMLElement> =
    menu.querySelectorAll(".menu-item");

  menuItems.forEach((item: HTMLElement) => {
    item.style.padding = "5px 10px";
    item.style.cursor = "pointer";
    item.style.transition = "background-color 0.3s";
  });

  hamburger.addEventListener("click", (event) => {
    menu.style.display = menu.style.display === "none" ? "block" : "none";
    if (menu.style.display === "block") {
      const rect = leftBar.getBoundingClientRect();
      menu.style.left = `${rect.right}px`;
      menu.style.top = `${rect.top}px`;
    }
    event.stopPropagation();
  });

  selectionButton.addEventListener("click", (event) => {
    selectionMenu.style.display =
      selectionMenu.style.display === "none" ? "block" : "none";
    if (selectionMenu.style.display === "block") {
      const rect = leftBar.getBoundingClientRect();
      selectionMenu.style.left = `${rect.right}px`;
      selectionMenu.style.top = `${rect.top}px`;
    }
    event.stopPropagation();
  });

  document.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    if (
      !menu.contains(target) &&
      target !== hamburger &&
      !selectionMenu.contains(target) &&
      target !== selectionButton
    ) {
      menu.style.display = "none";
      selectionMenu.style.display = "none";
    }
  });

  const menuActions: Record<string, () => void> = {
    search: showSearchDialog,
    autoSyncSettings: showAutoSyncDialog,
    reset: () => {
      if (
        confirm("すべてのトレイをリセットしますか？この操作は元に戻せません。")
      ) {
        resetAllTrays();
      }
    },
    export: exportData,
    import: importData,
    set_default_server: set_default_server,
    manage_server_passwords: showServerPasswordManager,
    editTitle: editPageTitle,
    uploadAll: () => uploadAllData(),
    downloadAll: () => downloadAllData(),
    editSessionId: editSessionId,
    newSession: openNewSession,
    temporalTray: openTemporalTray,
    cutSelected: cutSelected,
    copySelected: copySelected,
    pluginManager: showPluginManagerDialog,
  };

  menu.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const action = target.getAttribute("data-action") || "";

    const handler = menuActions[action];
    if (handler) {
      handler();
    }

    menu.style.display = "none";
  });

  selectionMenu.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const action = target.getAttribute("data-action") || "";

    const handler = menuActions[action];
    if (handler) {
      handler();
    }

    selectionMenu.style.display = "none";
  });

  // ホバー効果の追加
  menuItems.forEach((item) => {
    item.addEventListener("mouseover", () => {
      item.style.backgroundColor = "#f0f0f0";
    });
    item.addEventListener("mouseout", () => {
      item.style.backgroundColor = "transparent";
    });
  });

  return { hamburger, menu, selectionMenu, leftBar };
}
function editPageTitle() {
  const currentTitle = document.title;
  const newTitle = prompt(
    "新しいページタイトルを入力してください:",
    currentTitle,
  );
  if (newTitle !== null && newTitle.trim() !== "") {
    document.title = newTitle.trim();
    const sessionId = getUrlParameter("sessionId");
    if (sessionId) {
      localStorage.setItem(sessionId + "_title", newTitle.trim());
      alert("ページタイトルを更新しました。");
    }
  }
}

export function editSessionId() {
  const currentId = getUrlParameter("sessionId");
  const newId = prompt("新しいセッションIDを入力してください:", currentId || "");
  if (newId && newId.trim() !== "") {
    window.location.href = `${window.location.pathname}?sessionId=${newId.trim()}`;
  }
}

// function updateAllTrayDirections() {
//   const allTrays = document.querySelectorAll(".tray");
//   allTrays.forEach((trayElement) => {
//     const trayInstance = trayElement.__trayInstance;
//     if (
//       trayInstance &&
//       typeof trayInstance.updateSplitDirection === "function"
//     ) {
//       trayInstance.updateSplitDirection();
//     }
//   });
// }

function uploadAllData(tray: null | Tray = null) {
  if (!tray) {
    tray = element2TrayMap.get(getRootElement() as HTMLDivElement) as Tray;
  }
  if (tray.host_url) {
    uploadData(tray);
  }
  if (tray.children.length) {
    tray.children.map((t) => uploadAllData(t));
  }
}
function downloadAllData(tray: null | Tray = null) {
  if (!tray) {
    tray = element2TrayMap.get(getRootElement() as HTMLDivElement) as Tray;
  }
  if (tray.host_url) {
    downloadData(tray);
  }
  if (tray.children.length) {
    tray.children.map((t) => downloadAllData(t));
  }
}

// function import_network_tray_directly_as_root() {
//   let url = prompt("server host?", localStorage.getItem("defaultServer"));
//   let name = prompt("name?");
//   let tray_data;
//   fetch(`${url}/tray/load`, {
//     method: "GET",
//     headers: {
//       filename: name,
//     },
//   })
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error("Network response was not ok");
//       }
//       return response.json();
//     })
//     .then((data) => {
//       console.log(data);
//       localStorage.setItem("downloaded_data", JSON.stringify(data));
//       notifyUser("データのダウンロードに成功しました。");
//       return data;
//     })
//     .catch((error) => {
//       console.error("Error:", error);
//       notifyUser("データのダウンロードに失敗しました。");
//     });
//   document.body.innerHTML = "";

//   loadFromLocalStorage("downloaded_data");
//   saveToLocalStorage();
//   hamburgerElements = createHamburgerMenu();
//   updateAllTrayDirections();
//   window.addEventListener("resize", updateAllTrayDirections);
// }

async function showSessionList() {
  const ids = (await getAllSessionIds()).filter((id) => id !== "trayData");
  const dialog = document.createElement("div");
  dialog.classList.add("session-selection-dialog");
  dialog.innerHTML = `
      <h3>Sessions</h3>
      <select id="session-select">
        ${ids.map((id) => `<option value="${id}">${id}</option>`).join("")}
      </select>
      <button id="session-open">Open</button>
      <button id="session-cancel">Cancel</button>
    `;
  document.body.appendChild(dialog);
  const openBtn = dialog.querySelector<HTMLButtonElement>("#session-open")!;
  const cancelBtn = dialog.querySelector<HTMLButtonElement>("#session-cancel")!;
  const select = dialog.querySelector<HTMLSelectElement>("#session-select")!;
  openBtn.addEventListener("click", () => {
    const id = select.value;
    if (id) {
      window.location.href = `${window.location.pathname}?sessionId=${id}`;
    }
  });
  cancelBtn.addEventListener("click", () => dialog.remove());
}

export function openNewSession() {
  const id = generateUUID();
  window.open(`${window.location.pathname}?sessionId=${id}`, "_blank");
}

export const GLOBAL_TEMPORAL_TRAY_ID = "temp-global";

export function openTemporalTray() {
  window.open(
    `${window.location.pathname}?sessionId=${GLOBAL_TEMPORAL_TRAY_ID}`,
    "_blank",
  );
}

function set_default_server() {
  let url = localStorage.getItem("defaultServer");
  url = prompt("set default URL", url ? url : "");
  if (!url) {
    return;
  }
  localStorage.setItem("defaultServer", normalizeUrl(url));
}
export function cutSelected(): void {
  if (selected_trays.length !== 0) {
    // Copy the selected trays
    const t = new Tray(generateUUID(), generateUUID(), "selected Trays");
    selected_trays.forEach((tt) => t.children.push(cloneTray(tt)));
    copyTray(t);

    selected_trays.forEach((t) => deleteTray(t));
    clearSelectedTrays();
  }
}

export function copySelected(): void {
  if (selected_trays.length !== 0) {
    // Copy the selected trays
    const t = new Tray(generateUUID(), generateUUID(), "selected Trays");
    selected_trays.forEach((tt) => t.children.push(cloneTray(tt)));
    copyTray(t);
    clearSelectedTrays();
  }
}

export function deleteSelected(): void {
  if (selected_trays.length !== 0) {
    selected_trays.forEach((t) => deleteTray(t));
    clearSelectedTrays();
  }
}

function showServerPasswordManager() {
  const serverPasswords = JSON.parse(localStorage.getItem("serverPasswords") || "{}");
  
  const dialog = document.createElement("div");
  dialog.classList.add("server-password-dialog");
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 20px;
    z-index: 10000;
    width: 90vw;
    max-width: 600px;
    min-width: 320px;
    max-height: 70vh;
    overflow-y: auto;
  `;
  
  dialog.innerHTML = `
    <h3>Manage Server Passwords</h3>
    <div id="server-list"></div>
    <div style="margin-top: 15px;">
      <input type="text" id="new-server" placeholder="Server URL" style="width: 200px; margin-right: 10px;">
      <input type="password" id="new-password" placeholder="Password" style="width: 150px; margin-right: 10px;">
      <button id="add-server">Add</button>
    </div>
    <div style="margin-top: 15px;">
      <button id="close-dialog">Close</button>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  function updateServerList() {
    const serverList = dialog.querySelector("#server-list")!;
    serverList.innerHTML = "";
    
    Object.entries(serverPasswords).forEach(([server]) => {
      const row = document.createElement("div");
      row.style.cssText = "display: flex; align-items: center; margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 4px;";
      row.innerHTML = `
        <span style="flex: 1; font-weight: bold;">${server}</span>
        <span style="flex: 1; font-family: monospace;">••••••••</span>
        <button class="edit-btn" data-server="${server}" style="margin-left: 10px;">Edit</button>
        <button class="delete-btn" data-server="${server}" style="margin-left: 5px;">Delete</button>
      `;
      serverList.appendChild(row);
    });
  }
  
  updateServerList();
  
  dialog.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    
    if (target.classList.contains("delete-btn")) {
      const server = target.getAttribute("data-server")!;
      if (confirm(`Delete password for ${server}?`)) {
        delete serverPasswords[server];
        localStorage.setItem("serverPasswords", JSON.stringify(serverPasswords));
        updateServerList();
      }
    }
    
    if (target.classList.contains("edit-btn")) {
      const server = target.getAttribute("data-server")!;
      const newPassword = prompt(`Enter new password for ${server}:`, "");
      if (newPassword !== null) {
        serverPasswords[server] = newPassword;
        localStorage.setItem("serverPasswords", JSON.stringify(serverPasswords));
        updateServerList();
      }
    }
    
    if (target.id === "add-server") {
      const serverInput = dialog.querySelector("#new-server") as HTMLInputElement;
      const passwordInput = dialog.querySelector("#new-password") as HTMLInputElement;
      
      const server = serverInput.value.trim();
      const password = passwordInput.value;
      
      if (server && password) {
        const normalizedServer = normalizeUrl(server);
        serverPasswords[normalizedServer] = password;
        localStorage.setItem("serverPasswords", JSON.stringify(serverPasswords));
        serverInput.value = "";
        passwordInput.value = "";
        updateServerList();
      } else {
        alert("Please enter both server URL and password");
      }
    }
    
    if (target.id === "close-dialog") {
      dialog.remove();
    }
  });
}

function getAllTrays(rootTray: Tray): Tray[] {
  const allTrays: Tray[] = [];
  const visited = new Set<string>();
  
  function traverse(tray: Tray) {
    if (!tray || visited.has(tray.id)) {
      return; // Prevent circular references and null trays
    }
    visited.add(tray.id);
    allTrays.push(tray);
    
    if (tray.children && Array.isArray(tray.children)) {
      for (const child of tray.children) {
        traverse(child);
      }
    }
  }
  
  traverse(rootTray);
  return allTrays;
}

function expandAllParentsAndFocus(tray: Tray): void {
  console.log("expandAllParentsAndFocus called for:", tray.name, tray.id);
  
  try {
    const rootTray = element2TrayMap.get(getRootElement() as HTMLDivElement);
    if (!rootTray) {
      console.log("No root tray found");
      return;
    }
    
    // Use a simpler approach - walk up from the tray using parentId
    const pathToRoot: Tray[] = [];
    const visited = new Set<string>();
    let current: Tray | undefined = tray;
    
    // Build path from target to root
    while (current && current.parentId && !visited.has(current.id)) {
      visited.add(current.id);
      
      // Find parent tray using getTrayFromId utility
      const parent = getTrayFromId(current.parentId);
      if (parent && !visited.has(parent.id)) {
        pathToRoot.push(parent);
        current = parent;
      } else {
        break;
      }
    }
    
    console.log("Path to root:", pathToRoot.map(t => t.name));
    
    // Expand all parents (from root to target) without folding children
    pathToRoot.reverse().forEach(t => {
      if (t.isFolded) {
        console.log("Expanding parent:", t.name);
        // Manually unfold without calling toggleFold to avoid folding children
        t.isFolded = false;
        t.updateAppearance();
      }
    });
    
    // Save the changes
    saveToIndexedDB();
    
    // Focus and scroll to the target tray
    console.log("Focusing and scrolling to:", tray.name);
    setLastFocused(tray);
    
    // Use setTimeout to ensure DOM is updated before focusing
    setTimeout(() => {
      tray.element.focus();
      tray.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
  } catch (error) {
    console.error("Error in expandAllParentsAndFocus:", error);
  }
}

function showSearchDialog(): void {
  const rootTray = element2TrayMap.get(getRootElement() as HTMLDivElement);
  if (!rootTray) return;
  
  const dialog = document.createElement("div");
  dialog.classList.add("search-dialog");
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 20px;
    z-index: 10000;
    width: 90vw;
    max-width: 600px;
    min-width: 320px;
    max-height: 70vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  `;
  
  dialog.innerHTML = `
    <h3>Search Trays</h3>
    <div style="margin-bottom: 15px;">
      <input type="text" id="search-input" placeholder="Enter search term..." 
             style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;">
    </div>
    <div id="search-results" style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px; padding: 10px;">
      <div style="text-align: center; color: #999; padding: 20px;">Enter a search term to find trays</div>
    </div>
    <div style="margin-top: 15px; text-align: right;">
      <button id="close-search" style="padding: 8px 16px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">Close</button>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  const searchInput = dialog.querySelector("#search-input") as HTMLInputElement;
  const searchResults = dialog.querySelector("#search-results") as HTMLDivElement;
  const closeButton = dialog.querySelector("#close-search") as HTMLButtonElement;
  
  function performSearch(query: string): void {
    if (!query.trim()) {
      searchResults.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Enter a search term to find trays</div>';
      return;
    }
    
    const allTrays = getAllTrays(rootTray!);
    const matches = allTrays.filter(tray => {
      if (!tray || !tray.name) return false;
      try {
        const nameMatch = tray.name.toLowerCase().includes(query.toLowerCase());
        const propMatch = tray.properties && 
          typeof tray.properties === 'object' &&
          Object.values(tray.properties).some(value => 
            value != null && String(value).toLowerCase().includes(query.toLowerCase())
          );
        return nameMatch || propMatch;
      } catch (e) {
        console.error("Error filtering tray:", e, tray);
        return false;
      }
    });
    
    if (matches.length === 0) {
      searchResults.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No trays found matching your search</div>';
      return;
    }
    
    searchResults.innerHTML = '';
    matches.forEach(tray => {
      const resultItem = document.createElement("div");
      resultItem.style.cssText = `
        padding: 10px;
        border-bottom: 1px solid #eee;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      
      const displayName = tray.name || 'Untitled';
      const displayId = tray.id || 'unknown';
      const displayDate = tray.created_dt ? tray.created_dt.toLocaleDateString() : 'unknown date';
      
      resultItem.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">${displayName}</div>
        <div style="font-size: 0.8em; color: #666;">ID: ${displayId}</div>
        <div style="font-size: 0.8em; color: #666;">Created: ${displayDate}</div>
      `;
      
      resultItem.addEventListener("mouseenter", () => {
        resultItem.style.backgroundColor = "#f0f0f0";
      });
      
      resultItem.addEventListener("mouseleave", () => {
        resultItem.style.backgroundColor = "transparent";
      });
      
      resultItem.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Search result clicked:", tray.name, tray.id);
        expandAllParentsAndFocus(tray);
        dialog.remove();
      });
      
      searchResults.appendChild(resultItem);
    });
  }
  
  searchInput.addEventListener("input", (e) => {
    const query = (e.target as HTMLInputElement).value;
    performSearch(query);
  });
  
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dialog.remove();
    }
  });
  
  closeButton.addEventListener("click", () => {
    dialog.remove();
  });
  
  // Focus the search input
  searchInput.focus();
  
  // Close dialog when clicking outside
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      dialog.remove();
    }
  });
  
  // Prevent search results container from closing dialog
  searchResults.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

export function showHookViewDialog(): void {
  const rootTray = element2TrayMap.get(getRootElement() as HTMLDivElement);
  if (!rootTray) return;

  const dialog = document.createElement("div");
  dialog.classList.add("hook-view-dialog");
  
  // Check if mobile device
  const isMobile = window.innerWidth <= 768;
  const padding = isMobile ? "15px" : "20px";
  
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: ${padding};
    z-index: 10000;
    width: 90vw;
    max-width: 800px;
    min-width: 320px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  `;

  dialog.innerHTML = `
    <h3 style="margin-bottom: 15px;">Tasks Organized by Hooks</h3>
    <div id="hook-content" style="max-height: 60vh; overflow-y: auto;">
      <div style="text-align: center; color: #999; padding: 20px;">Loading hooks...</div>
    </div>
    <div style="margin-top: 15px; text-align: right;">
      <button id="close-hook-view" style="padding: 8px 16px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">Close</button>
    </div>
  `;

  document.body.appendChild(dialog);

  const hookContent = dialog.querySelector("#hook-content") as HTMLDivElement;
  const closeButton = dialog.querySelector("#close-hook-view") as HTMLButtonElement;

  // State management for each hook's visibility
  const hookVisibilityState = new Map<string, boolean>();

  // Collect all trays with hooks
  const allTrays = getAllTrays(rootTray);
  const hookMap = new Map<string, Tray[]>();

  allTrays.forEach(tray => {
    if (tray.hooks && tray.hooks.length > 0) {
      tray.hooks.forEach(hook => {
        if (!hookMap.has(hook)) {
          hookMap.set(hook, []);
        }
        hookMap.get(hook)!.push(tray);
      });
    }
  });

  if (hookMap.size === 0) {
    hookContent.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No tasks with hooks found. Use @hookname in tray names to organize by hooks.</div>';
  } else {
    hookContent.innerHTML = '';

    // Sort hooks by number of tasks and move hooks with only done tasks to the bottom
    const hookEntries = Array.from(hookMap.entries());
    hookEntries.sort((a, b) => {
      const aDoneOnly = a[1].every(t => t.isDone);
      const bDoneOnly = b[1].every(t => t.isDone);
      if (aDoneOnly !== bDoneOnly) {
        return aDoneOnly ? 1 : -1; // done-only hooks last
      }
      if (b[1].length !== a[1].length) {
        return b[1].length - a[1].length; // sort by count desc
      }
      return a[0].localeCompare(b[0]);
    });

    hookEntries.forEach(([hook, taskList]) => {
      const hookSection = document.createElement("div");
      const sectionPadding = isMobile ? "10px" : "15px";
      hookSection.style.cssText = `margin-bottom: 20px; border: 1px solid #ddd; border-radius: 6px; padding: ${sectionPadding};`;

      const hookTitle = document.createElement("h4");
      hookTitle.textContent = `@${hook}`;
      const titleFontSize = isMobile ? "1em" : "1.1em";
      hookTitle.style.cssText = `margin: 0 0 10px 0; color: #333; font-size: ${titleFontSize}; font-weight: bold; cursor: pointer; transition: color 0.2s; user-select: none;`;
      
      // Initialize visibility state (default: hide done tasks)
      const hasDoneTasks = taskList.some(t => t.isDone);
      hookVisibilityState.set(hook, false);
      
      // Create tasks container
      const tasksContainer = document.createElement("div");
      tasksContainer.id = `tasks-${hook}`;
      
      function renderTasks() {
        const showDone = hookVisibilityState.get(hook) || false;
        tasksContainer.innerHTML = '';
        
        taskList.forEach(tray => {
          const isDone = tray.isDone;
          
          // Skip done tasks if not showing them
          if (isDone && !showDone) return;
          
          const taskItem = document.createElement("div");
          
          taskItem.style.cssText = `
            padding: 8px 12px;
            margin-bottom: 6px;
            background: ${isDone ? '#f0f0f0' : '#f8f9fa'};
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
            border-left: 3px solid ${tray.borderColor};
            ${isDone ? 'opacity: 0.7;' : ''}
          `;
          
          const displayName = tray.name || 'Untitled';
          const displayDate = tray.created_dt ? tray.created_dt.toLocaleDateString() : 'unknown date';
          
          taskItem.innerHTML = `
            <div style="font-weight: 500; margin-bottom: 2px; ${isDone ? 'text-decoration: line-through; color: #999;' : ''}">${displayName}</div>
            <div style="font-size: 0.8em; color: #666;">Created: ${displayDate}${isDone ? ' • ✓ Done' : ''}</div>
          `;
          
          taskItem.addEventListener("mouseenter", () => {
            taskItem.style.backgroundColor = isDone ? "#e0e0e0" : "#e9ecef";
          });
          
          taskItem.addEventListener("mouseleave", () => {
            taskItem.style.backgroundColor = isDone ? "#f0f0f0" : "#f8f9fa";
          });
          
          taskItem.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            expandAllParentsAndFocus(tray);
            dialog.remove();
          });
          
          tasksContainer.appendChild(taskItem);
        });
        
        // Update hook title to show status
        const doneCount = taskList.filter(t => t.isDone).length;
        const totalCount = taskList.length;
        const statusIcon = showDone ? '👁️' : '👁️‍🗨️';
        hookTitle.textContent = `@${hook} (${totalCount - doneCount}/${totalCount}) ${hasDoneTasks ? statusIcon : ''}`;
      }
      
      // Add click handler to toggle visibility
      hookTitle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentState = hookVisibilityState.get(hook) || false;
        hookVisibilityState.set(hook, !currentState);
        renderTasks();
      });
      
      hookTitle.addEventListener("mouseenter", () => {
        hookTitle.style.color = "#0066cc";
      });
      
      hookTitle.addEventListener("mouseleave", () => {
        hookTitle.style.color = "#333";
      });
      
      hookSection.appendChild(hookTitle);
      hookSection.appendChild(tasksContainer);
      
      // Initial render
      renderTasks();
      
      hookContent.appendChild(hookSection);
    });
  }

  closeButton.addEventListener("click", () => {
    cleanup();
  });

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      cleanup();
    }
  }

  function onOutsideClick(e: MouseEvent) {
    if (!dialog.contains(e.target as Node)) {
      cleanup();
    }
  }

  function cleanup() {
    dialog.remove();
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("click", onOutsideClick);
  }

  // Add event listeners after a small delay to avoid immediate cleanup from the button click
  setTimeout(() => {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onOutsideClick);
  }, 100);

  // Prevent hook content from closing dialog
  hookContent.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

function showAutoSyncDialog(): void {
  const dialog = document.createElement("div");
  dialog.classList.add("auto-sync-dialog");
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 20px;
    z-index: 10000;
    width: 90vw;
    max-width: 500px;
    min-width: 320px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  `;

  const currentState = store.getState();
  const autoUploadEnabled = selectAutoUploadEnabled(currentState);
  
  dialog.innerHTML = `
    <h3 style="margin: 0 0 20px 0; color: #333;">🔄 Auto-Sync Settings</h3>
    
    <div style="margin-bottom: 20px;">
      <label style="display: flex; align-items: center; cursor: pointer;">
        <input type="checkbox" id="autoSyncToggle" ${autoUploadEnabled ? 'checked' : ''} 
               style="margin-right: 10px; transform: scale(1.2);">
        <span style="font-weight: 500;">Enable Global Auto-Sync</span>
      </label>
      <p style="margin: 8px 0 0 30px; font-size: 0.9em; color: #666;">
        Automatically sync all network-enabled trays in the background
      </p>
    </div>
    
    <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
      <h4 style="margin: 0 0 10px 0; color: #555;">📊 Sync Status</h4>
      <div id="syncStatusInfo" style="font-size: 0.9em; color: #666;">
        Loading status...
      </div>
    </div>
    
    <div style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
      <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Conflict Resolution</h4>
      <p style="margin: 0; font-size: 0.9em; color: #856404;">
        When conflicts occur, you'll be prompted to choose how to resolve them. 
        Enhanced conflict resolution is coming soon.
      </p>
    </div>
    
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button id="cancelAutoSync" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">
        Cancel
      </button>
      <button id="saveAutoSync" style="padding: 8px 16px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">
        Save
      </button>
    </div>
  `;

  document.body.appendChild(dialog);

  // Update sync status info
  const updateSyncStatus = () => {
    const statusElement = dialog.querySelector('#syncStatusInfo');
    if (statusElement) {
      const syncStatus = globalSyncManager.getSyncStatus();
      
      statusElement.innerHTML = `
        <div>Network-enabled trays: <strong>${syncStatus.networkTrays}</strong></div>
        <div>Auto-syncing trays: <strong>${syncStatus.autoSyncTrays}</strong></div>
        <div>Sync queue: <strong>${syncStatus.queueLength}</strong></div>
        <div>Active syncs: <strong>${syncStatus.activeSyncs}</strong></div>
        <div>Global sync manager: <strong>${syncStatus.isRunning ? 'Running' : 'Stopped'}</strong></div>
      `;
    }
  };

  updateSyncStatus();

  // Event handlers
  const autoSyncToggle = dialog.querySelector('#autoSyncToggle') as HTMLInputElement;
  const cancelButton = dialog.querySelector('#cancelAutoSync') as HTMLButtonElement;
  const saveButton = dialog.querySelector('#saveAutoSync') as HTMLButtonElement;

  cancelButton.addEventListener('click', () => {
    dialog.remove();
  });

  saveButton.addEventListener('click', () => {
    const newState = autoSyncToggle.checked;
    if (newState !== autoUploadEnabled) {
      store.dispatch(toggleAutoUpload());
      
      // Show notification
      const notification = document.createElement("div");
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        z-index: 10001;
        font-size: 14px;
      `;
      notification.textContent = `Auto-sync ${newState ? 'enabled' : 'disabled'}`;
      document.body.appendChild(notification);
      
      setTimeout(() => notification.remove(), 3000);
    }
    dialog.remove();
  });

  // Close dialog on outside click
  const closeDialog = (event: MouseEvent) => {
    if (event.target === dialog) {
      dialog.remove();
      document.removeEventListener('click', closeDialog);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeDialog);
  }, 100);

  // Close on Escape key
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      dialog.remove();
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', closeDialog);
    }
  };
  
  document.addEventListener('keydown', onKeyDown);
}

// Helper function to get all network-enabled trays
function getAllNetworkTrays(tray: Tray): Tray[] {
  const networkTrays: Tray[] = [];
  
  if (tray.host_url && tray.filename) {
    networkTrays.push(tray);
  }
  
  tray.children.forEach(child => {
    networkTrays.push(...getAllNetworkTrays(child));
  });
  
  return networkTrays;
}
