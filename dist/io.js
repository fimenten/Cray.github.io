"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportData = exportData;
exports.importData = importData;
exports.saveToLocalStorage = saveToLocalStorage;
exports.loadFromLocalStorage = loadFromLocalStorage;
exports.serialize = serialize;
exports.deserialize = deserialize;
const const_1 = require("./const");
const app_1 = require("./app");
const utils_1 = require("./utils");
const humberger_1 = require("./humberger");
function exportData() {
  const data = localStorage.getItem(const_1.TRAY_DATA_KEY);
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
function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const target = e.target;
    const file = target.files ? target.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      var _a;
      try {
        const content =
          (_a = readerEvent.target) === null || _a === void 0
            ? void 0
            : _a.result;
        JSON.parse(content); // Validate JSON
        localStorage.setItem("imported_tray", content);
        localStorage.setItem(const_1.TRAY_DATA_KEY, content);
        alert("データのインポートに成功しました。");
        location.reload();
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
function saveToLocalStorage(key = null) {
  try {
    const sessionId = (0, utils_1.getUrlParameter)("sessionId");
    const rootElement = (0, utils_1.getRootElement)();
    if (!rootElement) {
      console.error("Root element not found");
      return;
    }
    const tray = app_1.element2TrayMap.get(rootElement);
    const data = serialize(tray);
    const serializedData = JSON.stringify(data);
    let keyToUse;
    if (key !== null) {
      keyToUse = key;
    } else {
      keyToUse =
        sessionId !== null && sessionId !== void 0
          ? sessionId
          : const_1.TRAY_DATA_KEY;
    }
    const savedData = localStorage.getItem(keyToUse);
    if (savedData !== serializedData) {
      localStorage.setItem(keyToUse, serializedData);
      // if (AUTO_SYNC) {
      //   uploadAllData();
      // }
      console.log("Data saved successfully");
    }
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}
function loadFromLocalStorage(key = const_1.TRAY_DATA_KEY) {
  let rootTray;
  try {
    const savedData = localStorage.getItem(key);
    console.log(savedData);
    if (savedData) {
      const data = JSON.parse(savedData);
      rootTray = deserialize(data); // Ensure the deserialized data is of type Tray
    } else {
      rootTray = (0, utils_1.createDefaultRootTray)();
    }
    rootTray.isFolded = false;
    rootTray.updateAppearance();
    rootTray.updateChildrenAppearance();
  } catch (error) {
    console.error("Error loading from localStorage:", error);
    rootTray = (0, utils_1.createDefaultRootTray)();
  }
  document.body.innerHTML = "";
  document.body.appendChild(rootTray.element);
  (0, humberger_1.createHamburgerMenu)();
}
function serialize(tray) {
  // let tmp = tray;
  return JSON.stringify(tray);
}
function deserialize(data) {
  return JSON.parse(data);
}
