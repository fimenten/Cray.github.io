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
import { TrayId, ISerializedTrayData, IJSONLTrayData, IIOError, TrayData, DATA_VERSION } from "./types";
import { IOError } from "./errors";
import { migrationService } from "./migration";
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
    reader.onload = async (readerEvent: ProgressEvent<FileReader>) => {
      try {
        const content = readerEvent.target?.result as string;
        let parsedData;
        
        try {
          parsedData = JSON.parse(content); // Validate JSON
        } catch (parseError) {
          console.error("Invalid JSON file:", parseError);
          alert("無効なJSONファイルです。");
          return;
        }

        // Check if migration is needed for imported data
        const dataVersion = migrationService.detectVersion(parsedData);
        const currentVersion = DATA_VERSION.CURRENT;
        let finalContent = content;
        
        if (dataVersion < currentVersion) {
          console.log(`Migrating imported data from version ${dataVersion} to ${currentVersion}`);
          
          try {
            let migratedTray: Tray;
            
            if (parsedData.children && Array.isArray(parsedData.children)) {
              // Use hierarchical migration for tree structure
              const migrationResult = await migrationService.migrateHierarchical(parsedData);
              console.log(`Import migration completed with ${migrationResult.warnings?.length || 0} warnings`);
              
              if (migrationResult.warnings && migrationResult.warnings.length > 0) {
                console.warn("Import migration warnings:", migrationResult.warnings);
              }
              
              // Convert back to legacy format for deserialize
              const legacyFormat = migrationService.convertToLegacyFormat(migrationResult.root);
              if (migrationResult.allTrays) {
                const addChildrenToLegacy = (legacyTray: any, trayId: string) => {
                  const childTrays = Object.values(migrationResult.allTrays)
                    .filter((tray: TrayData) => tray.parentId === trayId)
                    .map((childTray: TrayData) => {
                      const childLegacy = migrationService.convertToLegacyFormat(childTray);
                      addChildrenToLegacy(childLegacy, childTray.id);
                      return childLegacy;
                    });
                  legacyTray.children = childTrays;
                };
                addChildrenToLegacy(legacyFormat, migrationResult.root.id);
              }
              migratedTray = deserialize(JSON.stringify(legacyFormat)) as Tray;
            } else {
              // Use single tray migration
              const migrationResult = await migrationService.migrate(parsedData);
              console.log(`Import migration completed with ${migrationResult.warnings?.length || 0} warnings`);
              
              if (migrationResult.warnings && migrationResult.warnings.length > 0) {
                console.warn("Import migration warnings:", migrationResult.warnings);
              }
              
              const legacyFormat = migrationService.convertToLegacyFormat(migrationResult.data as TrayData);
              migratedTray = deserialize(JSON.stringify(legacyFormat)) as Tray;
            }
            
            finalContent = serialize(migratedTray);
          } catch (migrationError) {
            console.error("Import migration failed, using original data:", migrationError);
            finalContent = content;
          }
        }
        
        // Save the imported data (migrated if needed)
        await saveToIndexedDB("imported", finalContent);
        await saveToIndexedDB(TRAY_DATA_KEY, finalContent);
        
        // Replace current tray structure with imported data
        const importedTray = deserialize(finalContent);
        const rootElement = getRootElement() as HTMLDivElement;
        const currentRootTray = element2TrayMap.get(rootElement);
        
        if (currentRootTray && importedTray) {
          // Ensure imported tray is unfolded to show children
          importedTray.isFolded = false;
          
          // Recursively unfold important trays to make them visible
          const unfoldTray = (tray: Tray) => {
            tray.isFolded = false;
            tray.updateAppearance();
            tray.children.forEach(child => unfoldTray(child));
          };
          unfoldTray(importedTray);
          
          // Clear existing content
          const existingContent = rootElement.querySelector('.tray-content');
          if (existingContent) {
            existingContent.innerHTML = '';
          }
          
          // Replace the root tray content with imported tray
          element2TrayMap.delete(rootElement);
          rootElement.innerHTML = '';
          rootElement.appendChild(importedTray.element);
          element2TrayMap.set(rootElement, importedTray);
          
          console.log('Data imported successfully');
        }
        
        return;
      } catch (error) {
        console.error("Import error:", error);
        alert("データのインポート中にエラーが発生しました。");
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
        const rawData = savedData.value as string;
        console.log("Loading data from IndexedDB, checking for migration...");
        
        // Parse the raw data to check its format
        let parsedData;
        try {
          parsedData = JSON.parse(rawData);
        } catch (parseError) {
          console.error("Invalid JSON data in IndexedDB:", parseError);
          rootTray = createDefaultRootTray();
          renderRootTray(rootTray);
          return;
        }

        // Detect if migration is needed
        const dataVersion = migrationService.detectVersion(parsedData);
        const currentVersion = DATA_VERSION.CURRENT;
        
        if (dataVersion < currentVersion) {
          console.log(`Migrating data from version ${dataVersion} to ${currentVersion}`);
          
          try {
            // Check if data has hierarchical structure (children arrays)
            if (parsedData.children && Array.isArray(parsedData.children)) {
              // Use hierarchical migration for tree structure
              const migrationResult = await migrationService.migrateHierarchical(parsedData);
              console.log(`Migration completed with ${migrationResult.warnings?.length || 0} warnings`);
              
              if (migrationResult.warnings && migrationResult.warnings.length > 0) {
                console.warn("Migration warnings:", migrationResult.warnings);
              }
              
              // Convert the migrated root TrayData back to legacy format for deserialize
              const legacyFormat = migrationService.convertToLegacyFormat(migrationResult.root);
              
              // Add children back to the legacy format for deserialization
              if (migrationResult.allTrays) {
                const addChildrenToLegacy = (legacyTray: any, trayId: string) => {
                  const childTrays = Object.values(migrationResult.allTrays)
                    .filter((tray: TrayData) => tray.parentId === trayId)
                    .map((childTray: TrayData) => {
                      const childLegacy = migrationService.convertToLegacyFormat(childTray);
                      addChildrenToLegacy(childLegacy, childTray.id);
                      return childLegacy;
                    });
                  legacyTray.children = childTrays;
                };
                addChildrenToLegacy(legacyFormat, migrationResult.root.id);
              }
              
              rootTray = deserialize(JSON.stringify(legacyFormat)) as Tray;
              
              // Save the migrated data back to IndexedDB
              const migratedDataString = serialize(rootTray);
              await saveToIndexedDB(key, migratedDataString);
              console.log("Migrated data saved back to IndexedDB");
              
            } else {
              // Use single tray migration
              const migrationResult = await migrationService.migrate(parsedData);
              console.log(`Migration completed with ${migrationResult.warnings?.length || 0} warnings`);
              
              if (migrationResult.warnings && migrationResult.warnings.length > 0) {
                console.warn("Migration warnings:", migrationResult.warnings);
              }
              
              // Convert migrated data back to legacy format for deserialize
              const legacyFormat = migrationService.convertToLegacyFormat(migrationResult.data as TrayData);
              rootTray = deserialize(JSON.stringify(legacyFormat)) as Tray;
              
              // Save the migrated data back to IndexedDB
              const migratedDataString = serialize(rootTray);
              await saveToIndexedDB(key, migratedDataString);
              console.log("Migrated data saved back to IndexedDB");
            }
          } catch (migrationError) {
            console.error("Migration failed, falling back to direct deserialization:", migrationError);
            rootTray = deserialize(rawData) as Tray;
          }
        } else {
          // Data is current version, deserialize normally
          console.log("Data is current version, no migration needed");
          rootTray = deserialize(rawData) as Tray;
        }
        
      } catch (error) {
        console.error("Error processing data:", error);
        rootTray = createDefaultRootTray();
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

export function renderRootTray(rootTray: Tray) {
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
  
  // Handle malformed date strings
  let created_date: Date;
  try {
    created_date = new Date(the_data.created_dt);
    // Check if date is invalid
    if (isNaN(created_date.getTime())) {
      created_date = new Date(); // Default to current date for invalid dates
    }
  } catch {
    created_date = new Date(); // Default to current date for any parsing errors
  }
  
  let tray = new Tray(
    the_data.parentId || "",
    the_data.id,
    the_data.name,
    the_data.borderColor,
    created_date,
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


export async function loadFromLocalStorage(key: string = TRAY_DATA_KEY): Promise<void> {
  let rootTray: Tray;
  try {
    const savedDataString = localStorage.getItem(key);
    if (!savedDataString) {
      rootTray = createDefaultRootTray();
    } else {
      let savedData;
      try {
        savedData = JSON.parse(savedDataString);
      } catch (parseError) {
        console.error("Invalid JSON in localStorage:", parseError);
        rootTray = createDefaultRootTray();
        renderRootTray(rootTray);
        return;
      }

      console.log("Loading from localStorage, checking for migration...");
      
      // Check if migration is needed
      const dataVersion = migrationService.detectVersion(savedData);
      const currentVersion = DATA_VERSION.CURRENT;
      
      if (dataVersion < currentVersion) {
        console.log(`Migrating localStorage data from version ${dataVersion} to ${currentVersion}`);
        
        try {
          if (savedData.children && Array.isArray(savedData.children)) {
            // Use hierarchical migration for tree structure
            const migrationResult = await migrationService.migrateHierarchical(savedData);
            console.log(`localStorage migration completed with ${migrationResult.warnings?.length || 0} warnings`);
            
            if (migrationResult.warnings && migrationResult.warnings.length > 0) {
              console.warn("localStorage migration warnings:", migrationResult.warnings);
            }
            
            // Convert back to legacy format for deserialize
            const legacyFormat = migrationService.convertToLegacyFormat(migrationResult.root);
            if (migrationResult.allTrays) {
              const addChildrenToLegacy = (legacyTray: any, trayId: string) => {
                const childTrays = Object.values(migrationResult.allTrays)
                  .filter((tray: TrayData) => tray.parentId === trayId)
                  .map((childTray: TrayData) => {
                    const childLegacy = migrationService.convertToLegacyFormat(childTray);
                    addChildrenToLegacy(childLegacy, childTray.id);
                    return childLegacy;
                  });
                legacyTray.children = childTrays;
              };
              addChildrenToLegacy(legacyFormat, migrationResult.root.id);
            }
            rootTray = deserialize(JSON.stringify(legacyFormat)) as Tray;
          } else {
            // Use single tray migration
            const migrationResult = await migrationService.migrate(savedData);
            console.log(`localStorage migration completed with ${migrationResult.warnings?.length || 0} warnings`);
            
            if (migrationResult.warnings && migrationResult.warnings.length > 0) {
              console.warn("localStorage migration warnings:", migrationResult.warnings);
            }
            
            const legacyFormat = migrationService.convertToLegacyFormat(migrationResult.data as TrayData);
            rootTray = deserialize(JSON.stringify(legacyFormat)) as Tray;
          }
          
          // Save migrated data back to localStorage
          const migratedDataString = serialize(rootTray);
          localStorage.setItem(key, migratedDataString);
          console.log("Migrated data saved back to localStorage");
        } catch (migrationError) {
          console.error("localStorage migration failed, using original data:", migrationError);
          rootTray = deserialize(savedDataString) as Tray;
        }
      } else {
        console.log("localStorage data is current version, no migration needed");
        rootTray = deserialize(savedDataString) as Tray;
      }
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
