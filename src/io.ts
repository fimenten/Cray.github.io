import { TRAY_DATA_KEY } from "./const";
import { element2TrayMap } from "./app";
import {
  getRootElement,
  getUrlParameter,
  createDefaultRootTray,
} from "./utils";
import { createHamburgerMenu } from "./humberger";
import { Tray, TrayId } from "./tray";
import { createActionButtons } from "./actionbotton";
import { graph } from "./render";
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
    const request = indexedDB.open("TrayDatabase", 1);
    let db: IDBDatabase;

    request.onupgradeneeded = (event) => {
      db = request.result;
      if (!db.objectStoreNames.contains("trays")) {
        db.createObjectStore("trays", { keyPath: "id" });
      }
    };

    request.onerror = (event) => {
      reject(`Error opening database: ${request.error}`);
    };

    request.onsuccess = () => {
      db = request.result;
      const sessionId: string | null = getUrlParameter("sessionId");
      const rootElement = getRootElement();

      if (!rootElement) {
        reject("Root element not found");
        return;
      }

      const tray = element2TrayMap.get(rootElement as HTMLElement) as Tray;
      const data = content ? content : serialize(tray);

      if (!data) {
        reject("Serialize failed");
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
        
        // Uncomment if auto-sync functionality is needed
        // if (AUTO_SYNC) {
        //   uploadAllData();
        // }
        
        resolve(keyToUse);
      };

      putRequest.onerror = (event) => {
        reject(`Error saving to IndexedDB: ${putRequest.error}`);
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
        rootTray = deserialize(savedData.value as string) as Tray;
        // const data = savedData.value as string
        // Object.assign(graph, JSON.parse(data));

      } catch (error) {
        console.error("Error deserializing data:", error);
        rootTray = createDefaultRootTray();
      }
    } else {
      rootTray = createDefaultRootTray();
    }

    initializeTray(rootTray);
  } catch (error) {
    console.error("Error loading from IndexedDB:", error);
    const rootTray = createDefaultRootTray();
    initializeTray(rootTray);
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("TrayDatabase", 1);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains("trays")) {
        db.createObjectStore("trays", { keyPath: "id" });
      }
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

function initializeTray(rootTray: Tray) {
  // rootTray.isFolded = false;

  // Minimize DOM manipulation
  // const trayContainer = document.createElement("div");
  // trayContainer.appendChild(rootTray.element);

  // Update only when necessary
  document.body.innerHTML = "";
  document.body.appendChild(rootTray.element);

  createHamburgerMenu();
  const actio = createActionButtons()
  // document.body.appendChild(hamb);
  document.body.appendChild(actio);


}

export function serialize(tray: Tray) {
  // let tmp = tray;
  return JSON.stringify(tray);
}

function ddo(the_data: any) {
  // console.log("help");
  let url;
  if (the_data.host_url) {
    url = the_data.host_url;
  } else {
    url = the_data.url;
  }
  let tray = new Tray(
    the_data.parentId,
    the_data.id,
    the_data.name,
    the_data.borderColor,
    the_data.labels,
    the_data.created_dt,
    the_data.flexDirection,
    url,
    the_data.filename,
    typeof the_data.isFolded === "boolean" ? the_data.isFolded : true,
    the_data.properties ?? {},
    the_data.encryptionKey ?? null
  );
  const children = Array.isArray(the_data.children)
    ? (the_data.children as any[])
    : [];
  if (children.length > 0) {
    children
      .map((d) => ddo(d))
      // Sort older items first because addChild prepends
      .sort(
        (a, b) =>
          new Date(a.created_dt).getTime() - new Date(b.created_dt).getTime(),
      )
      .map((t) => tray.addChild(t));
  }
  return tray;
}

export function deserialize(data: string) {
  let the_data = JSON.parse(data);
  return ddo(the_data);
}
export interface Traydata{
    id: TrayId;
    name: string;
    // children: Tray[];
    childrenIds:TrayId[];
    labels: string[];
    parentId: TrayId;
    borderColor: string;
    created_dt: Date;
    flexDirection: "column" | "row";
    host_url: string | null;
    filename: string | null;
    encryptionKey: string | null;
    isFolded: boolean;
    properties: Record<string, any>;

}

export function deserializeJSONL(data:string){
  const lines = data.split("\n").map((l)=>JSON.parse(l) as Traydata)
  
  const id2Tray:Map<string,Tray> = new Map()
  lines.forEach(td=>{
    const t = new Tray(td.parentId,td.id,td.name,td.borderColor,td.labels,td.created_dt,td.flexDirection,td.host_url,td.filename,td.isFolded,td.properties ?? {},td.encryptionKey ?? null)
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

export async function listSessions(): Promise<Array<{ id: string; title: string }>> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("trays", "readonly");
    const store = tx.objectStore("trays");
    const request = store.getAllKeys();
    request.onsuccess = () => {
      const ids = request.result as string[];
      const sessions = ids.map((id) => ({
        id,
        title: localStorage.getItem(id + "_title") || id,
      }));
      resolve(sessions);
    };
    request.onerror = () => reject(request.error);
  });
}
