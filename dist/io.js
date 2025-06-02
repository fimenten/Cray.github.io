var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { TRAY_DATA_KEY } from "./const";
import { element2TrayMap } from "./app";
import { getRootElement, getUrlParameter, createDefaultRootTray, } from "./utils";
import { createHamburgerMenu } from "./humberger";
import { Tray } from "./tray";
import { createActionButtons } from "./actionbotton";
export function exportData() {
    const data = serialize(element2TrayMap.get(getRootElement()));
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
export function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
        const target = e.target;
        const file = target.files ? target.files[0] : null;
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            var _a;
            try {
                const content = (_a = readerEvent.target) === null || _a === void 0 ? void 0 : _a.result;
                JSON.parse(content); // Validate JSON
                saveToIndexedDB("imported", content);
                saveToIndexedDB(TRAY_DATA_KEY, content);
                // initializeTray(deserialize(content))
                // location.reload();
                return;
            }
            catch (error) {
                console.error("Invalid JSON file:", error);
                alert("無効なJSONファイルです。");
                return;
            }
        };
        reader.readAsText(file, "UTF-8");
    };
    input.click();
}
export function saveToIndexedDB() {
    return __awaiter(this, arguments, void 0, function* (key = null, content = null) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("TrayDatabase", 1);
            let db;
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
                const sessionId = getUrlParameter("sessionId");
                const rootElement = getRootElement();
                if (!rootElement) {
                    reject("Root element not found");
                    return;
                }
                const tray = element2TrayMap.get(rootElement);
                const data = content ? content : serialize(tray);
                if (!data) {
                    reject("Serialize failed");
                    return;
                }
                let keyToUse;
                if (key) {
                    keyToUse = key;
                }
                else {
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
    });
}
export function loadFromIndexedDB() {
    return __awaiter(this, arguments, void 0, function* (key = TRAY_DATA_KEY) {
        try {
            const db = yield openDatabase(); // Open the database
            const savedData = yield fetchDataFromStore(db, key); // Fetch data using the key
            let rootTray;
            if (savedData) {
                try {
                    rootTray = deserialize(savedData.value);
                    // const data = savedData.value as string
                    // Object.assign(graph, JSON.parse(data));
                }
                catch (error) {
                    console.error("Error deserializing data:", error);
                    rootTray = createDefaultRootTray();
                }
            }
            else {
                rootTray = createDefaultRootTray();
            }
            initializeTray(rootTray);
        }
        catch (error) {
            console.error("Error loading from IndexedDB:", error);
            const rootTray = createDefaultRootTray();
            initializeTray(rootTray);
        }
    });
}
function openDatabase() {
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
function fetchDataFromStore(db, key) {
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
export function getAllSessionIds() {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("trays", "readonly");
            const store = transaction.objectStore("trays");
            const request = store.getAllKeys();
            request.onsuccess = () => {
                resolve(request.result.filter((k) => typeof k === "string"));
            };
            request.onerror = () => reject(request.error);
        });
    });
}
function initializeTray(rootTray) {
    // rootTray.isFolded = false;
    // Minimize DOM manipulation
    // const trayContainer = document.createElement("div");
    // trayContainer.appendChild(rootTray.element);
    // Update only when necessary
    document.body.innerHTML = "";
    document.body.appendChild(rootTray.element);
    createHamburgerMenu();
    const actio = createActionButtons();
    // document.body.appendChild(hamb);
    document.body.appendChild(actio);
}
export function serialize(tray) {
    // let tmp = tray;
    return JSON.stringify(tray);
}
function ddo(the_data) {
    var _a;
    // console.log("help");
    let url;
    if (the_data.host_url) {
        url = the_data.host_url;
    }
    else {
        url = the_data.url;
    }
    let tray = new Tray(the_data.parentId, the_data.id, the_data.name, the_data.borderColor, the_data.labels, the_data.created_dt, the_data.flexDirection, url, the_data.filename, the_data.isFolded instanceof Boolean ? the_data.isFolded : true, (_a = the_data.properties) !== null && _a !== void 0 ? _a : {});
    let children = the_data.children;
    if (children.length > 0) {
        children
            .map((d) => ddo(d))
            // Sort older items first because addChild prepends
            .sort((a, b) => new Date(a.created_dt).getTime() - new Date(b.created_dt).getTime())
            .map((t) => tray.addChild(t));
    }
    return tray;
}
export function deserialize(data) {
    let the_data = JSON.parse(data);
    return ddo(the_data);
}
export function deserializeJSONL(data) {
    const lines = data.split("\n").map((l) => JSON.parse(l));
    const id2Tray = new Map();
    lines.forEach(td => {
        var _a;
        const t = new Tray(td.parentId, td.id, td.name, td.borderColor, td.labels, td.created_dt, td.flexDirection, td.host_url, td.filename, td.isFolded, (_a = td.properties) !== null && _a !== void 0 ? _a : {});
        id2Tray.set(td.id, t);
        const p = id2Tray.get(td.parentId);
        if (p) {
            p.children.push(t);
        }
    });
    const root = crawl(id2Tray);
    return root;
}
function crawl(id2Tray) {
    const start = id2Tray.get(id2Tray.keys().next().value);
    let now = start;
    while (true) {
        const p = id2Tray.get(now === null || now === void 0 ? void 0 : now.parentId);
        if (p) {
            now = p;
        }
        else {
            break;
        }
    }
    return now;
}
export function loadFromLocalStorage(key = TRAY_DATA_KEY) {
    let rootTray;
    try {
        const savedDataString = localStorage.getItem(key);
        let savedData;
        if (savedDataString) {
            savedData = JSON.parse(savedDataString);
        }
        else {
            savedData = createDefaultRootTray;
        }
        console.log(savedData);
        if (savedData) {
            rootTray = deserialize(JSON.stringify(savedData)); // Ensure the deserialized data is of type Tray
        }
        else {
            rootTray = createDefaultRootTray();
        }
        rootTray.isFolded = false;
        rootTray.updateAppearance();
        rootTray.updateChildrenAppearance();
    }
    catch (error) {
        console.error("Error loading from localStorage:", error);
        rootTray = createDefaultRootTray();
    }
    document.body.innerHTML = "";
    document.body.appendChild(rootTray.element);
    createHamburgerMenu();
}
