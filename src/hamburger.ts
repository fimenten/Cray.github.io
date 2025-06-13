import {
  cloneTray,
  createDefaultRootTray,
  generateUUID,
  getRootElement,
  getTrayFromId,
} from "./utils";
import { exportData, importData, getAllSessionIds, saveToIndexedDB } from "./io";
import { getUrlParameter } from "./utils";
import { element2TrayMap } from "./app";
import { Tray } from "./tray";
import { downloadData, uploadData } from "./networks";
import { copyTray, deleteTray } from "./functions";
import { setLastFocused } from "./state";

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
  { action: "newSession", label: "New Session" },
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
    newSession: openNewSession,
    cutSelected: cutSelected,
    copySelected: copySelected,
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
    min-width: 400px;
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
    min-width: 400px;
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
