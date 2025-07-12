import { TRAY_DATA_KEY } from "./const";
import { element2TrayMap } from "./app";
import {
  getRootElement,
  getUrlParameter,
} from "./utils";
import { createDefaultRootTray } from "./trayFactory";
import { createHamburgerMenu } from "./hamburger";
import { Tray } from "./tray";
import { createActionButtons } from "./actionbotton";
import { graph } from "./render";
import { TrayId, ISerializedTrayData, IJSONLTrayData, IIOError } from "./types";
import { IOError } from "./errors";
import { LazyTrayLoader } from "./lazyLoader";
export function exportData(): void {
  const data = serialize(element2TrayMap.get(getRootElement() as HTMLDivElement) as Tray);

  if (!data) {
    console.error("No data found to export.");
    return;
  }

  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tray_data.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files ? target.files[0] : null;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvent: ProgressEvent<FileReader>) => {
      try {
        const content = readerEvent.target?.result as string;
        JSON.parse(content); // Validate JSON
        saveToIndexedDB("imported", content);
        saveToIndexedDB(TRAY_DATA_KEY, content);
        // initializeTray(deserialize(content))
        // location.reload();
        return;
      } catch (error) {
        console.error("Invalid JSON file:", error);
        alert("無効なJSONファイルです。");
        return;
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  input.click();
}
export async function saveToIndexedDB(
  key: string | null = null,
  content: string | null = null,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("TrayDatabase", 4);
    let db: IDBDatabase;

    request.onupgradeneeded = (event) => {
      db = request.result;
      if (!db.objectStoreNames.contains("trays")) {
        db.createObjectStore("trays", { keyPath: "id" });
      }
    };

    request.onerror = (event) => {
      reject(IOError.saveFailure("indexeddb", `Error opening database: ${request.error}`));
    };

    request.onsuccess = () => {
      db = request.result;
      const sessionId: string | null = getUrlParameter("sessionId");
      const rootElement = getRootElement();

      if (!rootElement) {
        reject(IOError.saveFailure("indexeddb", "Root element not found"));
        return;
      }

      const tray = element2TrayMap.get(rootElement as HTMLElement) as Tray;
      const data = content ? content : serialize(tray);
      // record current state for undo history
      try {
        const { recordState } = require('./history');
        recordState(data);
      } catch {}

      if (!data) {
        reject(IOError.saveFailure("indexeddb", "Serialize failed"));
        return;
      }

      let keyToUse: string;
      if (key) {
        keyToUse = key as string;
      } else {
        keyToUse = sessionId ? sessionId : TRAY_DATA_KEY;
      }

      const transaction = db.transaction("trays", "readwrite");
      const store = transaction.objectStore("trays");

      const putRequest = store.put({ id: keyToUse, value: data });

      putRequest.onsuccess = () => {
        console.log(keyToUse);
        console.log("Data saved successfully");

        try {
          localStorage.setItem(
            `update_${keyToUse}`,
            Date.now().toString(),
          );
        } catch {}

        // Uncomment if auto-sync functionality is needed
        // if (AUTO_SYNC) {
        //   uploadAllData();
        // }
        
        resolve(keyToUse);
      };

      putRequest.onerror = (event) => {
        reject(IOError.saveFailure("indexeddb", `Error saving to IndexedDB: ${putRequest.error}`));
      };
    };
  });
}

export async function loadFromIndexedDB(
  key: string = TRAY_DATA_KEY,
): Promise<void> {
  try {
    const db = await openDatabase(); // Open the database
    const savedData = await fetchDataFromStore(db, key); // Fetch data using the key

    let rootTray: Tray;
    if (savedData) {
      try {
        const dataString = savedData.value as string;
        
        // Show loading indicator for large files
        if (dataString.length > 100000) {  // 100KB threshold
          showLoadingIndicator();
        }
        
        // Use lazy loader for better performance
        rootTray = await LazyTrayLoader.deserializeLazy(dataString, {
          onProgress: (loaded, total) => {
            updateLoadingProgress(loaded, total);
          }
        });

      } catch (error) {
        console.error("Error deserializing data:", error);
        rootTray = createDefaultRootTray();
      } finally {
        hideLoadingIndicator();
      }
    } else {
      rootTray = createDefaultRootTray();
    }

    renderRootTray(rootTray);
    try {
      const { recordState } = require('./history');
      recordState(serialize(rootTray));
    } catch {}
  } catch (error) {
    console.error("Error loading from IndexedDB:", error);
    const rootTray = createDefaultRootTray();
    renderRootTray(rootTray);
    try {
      const { recordState } = require('./history');
      recordState(serialize(rootTray));
    } catch {}
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("TrayDatabase", 4);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains("trays")) {
        db.createObjectStore("trays", { keyPath: "id" });
      }
      // Plugin store will be handled by pluginStorage
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function fetchDataFromStore(db: IDBDatabase, key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("trays", "readonly");
    const store = transaction.objectStore("trays");
    const getRequest = store.get(key);

    getRequest.onsuccess = () => {
      resolve(getRequest.result);
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };
  });
}

export async function getAllSessionIds(): Promise<string[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("trays", "readonly");
    const store = transaction.objectStore("trays");
    const request = store.getAllKeys();
    request.onsuccess = () => {
      resolve((request.result as string[]).filter((k) => typeof k === "string"));
    };
    request.onerror = () => reject(request.error);
  });
}

let loadingIndicator: HTMLElement | null = null;

function showLoadingIndicator(): void {
  loadingIndicator = document.createElement("div");
  loadingIndicator.className = "loading-indicator";
  loadingIndicator.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading data...</div>
      <div class="loading-progress">
        <div class="loading-progress-bar" style="width: 0%"></div>
      </div>
    </div>
  `;
  
  // Add styles
  const style = document.createElement("style");
  style.textContent = `
    .loading-indicator {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .loading-content {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      text-align: center;
    }
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .loading-progress {
      width: 200px;
      height: 4px;
      background: #f0f0f0;
      border-radius: 2px;
      margin-top: 1rem;
      overflow: hidden;
    }
    .loading-progress-bar {
      height: 100%;
      background: #3498db;
      transition: width 0.3s ease;
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(loadingIndicator);
}

function updateLoadingProgress(loaded: number, total: number): void {
  if (!loadingIndicator) return;
  
  const progressBar = loadingIndicator.querySelector(".loading-progress-bar") as HTMLElement;
  const progressText = loadingIndicator.querySelector(".loading-text") as HTMLElement;
  
  if (progressBar && total > 0) {
    const percentage = Math.round((loaded / total) * 100);
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `Loading data... ${percentage}%`;
  }
}

function hideLoadingIndicator(): void {
  if (loadingIndicator) {
    loadingIndicator.remove();
    loadingIndicator = null;
  }
}

export function renderRootTray(rootTray: Tray) {
  // Use requestAnimationFrame for smoother rendering
  requestAnimationFrame(() => {
    // Clear body more efficiently
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    
    document.body.appendChild(rootTray.element);
    
    createHamburgerMenu();
    const actio = createActionButtons();
    document.body.appendChild(actio);
  });
}

export function serialize(tray: Tray) {
  // let tmp = tray;
  return JSON.stringify(tray);
}

export async function serializeAsync(tray: Tray): Promise<string> {
  return Promise.resolve().then(() => JSON.stringify(tray));
}

function ddo(the_data: ISerializedTrayData | (ISerializedTrayData & { url?: string })) {
  // console.log("help");
  let url;
  if (the_data.host_url) {
    url = the_data.host_url;
  } else {
    url = (the_data as any).url || null; // Legacy support
  }
  let tray = new Tray(
    the_data.parentId || "",
    the_data.id,
    the_data.name,
    the_data.borderColor,
    new Date(the_data.created_dt),
    the_data.flexDirection,
    url,
    the_data.filename,
    typeof the_data.isFolded === "boolean" ? the_data.isFolded : true,
    the_data.properties ?? {},
    the_data.hooks ?? [],
    the_data.isDone ?? false
  );
  const children = the_data.children as [];
  if (children.length > 0) {
    // Process children in reverse since addChild prepends
    children
      .slice()
      .reverse()
      .map((d) => ddo(d))
      .forEach((t) => tray.addChild(t));
  }
  return tray;
}

export function deserialize(data: string) {
  let the_data = JSON.parse(data);
  return ddo(the_data);
}
// Legacy interface - use IJSONLTrayData from types.ts instead
export interface Traydata{
    id: TrayId;
    name: string;
    // children: Tray[];
    childrenIds:TrayId[];
    parentId: TrayId;
    borderColor: string;
    created_dt: Date;
    flexDirection: "column" | "row";
    host_url: string | null;
    filename: string | null;
    isFolded: boolean;
    properties: Record<string, any>;
    hooks: string[];
    isDone: boolean;
}

export function deserializeJSONL(data:string){
  const lines = data.split("\n").map((l)=>JSON.parse(l) as Traydata)
  
  const id2Tray:Map<string,Tray> = new Map()
  lines.forEach(td=>{
    const t = new Tray(td.parentId,td.id,td.name,td.borderColor,td.created_dt,td.flexDirection,td.host_url,td.filename,td.isFolded,td.properties ?? {},td.hooks ?? [],td.isDone ?? false)
    id2Tray.set(td.id,t)
    const p = id2Tray.get(td.parentId)
    if (p){
      p.children.push(t)
    }
  })
  const root = crawl(id2Tray)
  return root
}

function crawl(id2Tray:Map<string,Tray> ){
  const start = id2Tray.get(id2Tray.keys().next().value as string) as Tray
  let now = start
  while (true){
    const p = id2Tray.get(now?.parentId)
    if (p){
      now = p
    }else{break}
  }
  return now
}


export function loadFromLocalStorage(key: string = TRAY_DATA_KEY): void {
  let rootTray: Tray;
  try {
    const savedDataString = localStorage.getItem(key);
    let savedData;
    if (savedDataString) {
      savedData = JSON.parse(savedDataString);
    } else {
      savedData = createDefaultRootTray;
    }

    console.log(savedData);
    if (savedData) {
      rootTray = deserialize(JSON.stringify(savedData)) as Tray; // Ensure the deserialized data is of type Tray
    } else {
      rootTray = createDefaultRootTray();
    }

    rootTray.isFolded = false;

    rootTray.updateAppearance();
    rootTray.updateChildrenAppearance();
  } catch (error) {
    console.error("Error loading from localStorage:", error);

    rootTray = createDefaultRootTray();
  }
  document.body.innerHTML = "";
  document.body.appendChild(rootTray.element);
  createHamburgerMenu();
}
