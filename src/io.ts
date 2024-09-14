import { TRAY_DATA_KEY } from "./const";
import { Tray, element2TrayMap } from "./app";
import {
  getRootElement,
  getUrlParameter,
  createDefaultRootTray,
} from "./utils";
import { createHamburgerMenu } from "./humberger";

export function exportData(): void {
  const data = localStorage.getItem(TRAY_DATA_KEY);

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
        localStorage.setItem("imported_tray", content);
        localStorage.setItem(TRAY_DATA_KEY, content);

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
export function saveToLocalStorage(key: string | null = null): void {
  try {
    const sessionId: string | null = getUrlParameter("sessionId");
    const rootElement = getRootElement();

    if (!rootElement) {
      console.error("Root element not found");
      return;
    }

    const tray = element2TrayMap.get(rootElement as HTMLElement) as Tray;
    const data = serialize(tray);
    // const serializedData = JSON.stringify(data);

    let keyToUse: string;

    if (key){
      keyToUse = key as string
    }
    else{
      if (sessionId){
        keyToUse = sessionId
      } 
      else{
        keyToUse = TRAY_DATA_KEY
      }
    }

    const savedData = localStorage.getItem(keyToUse);

    if (savedData !== data) {
      localStorage.setItem(keyToUse, data);

      // if (AUTO_SYNC) {
      //   uploadAllData();
      // }
      console.log(keyToUse)
      console.log("Data saved successfully");
    }
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}
export function loadFromLocalStorage(key: string = TRAY_DATA_KEY): void {
  let rootTray: Tray;
  try {
    const savedDataString = localStorage.getItem(key);
    let savedData;
    if (savedDataString){
      savedData = JSON.parse(savedDataString)
    }else{
      savedData = createDefaultRootTray
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

export function serialize(tray: Tray) {
  // let tmp = tray;
  return JSON.stringify(tray);
}

function ddo(the_data: any) {
  let url;
  if (the_data.host_url){
    url = the_data.host_url
  }else{
    url = the_data.url
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
    the_data.filename
  );
  let children = the_data.children as [];
  if (children.length > 0){
  children
  .map((d) => ddo(d))
  // .sort((a, b) => a.created_dt.getTime() - b.created_dt.getTime())
  .sort((a, b) => new Date(a.created_dt).getTime() - new Date(b.created_dt).getTime())
  .map(t => tray.addChild(t))}
  return tray;
}

export function deserialize(data: string) {
  let the_data = JSON.parse(data);
  return ddo(the_data);
}
