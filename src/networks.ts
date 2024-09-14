import { Tray } from "./app";
import { deserialize, serialize } from "./io";
export function fetchTrayList(tray: Tray) {
  const defaultServer = localStorage.getItem("defaultServer") || "";
  const url = prompt("Enter server URL:", defaultServer);
  if (!url) return;

  fetch(`${url}/tray/list`, {
    method: "GET",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      showTraySelectionDialog(tray, url, data.files);
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Failed to fetch tray list from server.");
    });
}
export function showTraySelectionDialog(
  parent: Tray,
  url: string,
  files: string[]
): void {
  const dialog = document.createElement("div");
  dialog.classList.add("tray-selection-dialog");
  dialog.innerHTML = `
        <h3>Select a tray to add:</h3>
        <select id="tray-select">
          ${files
            .map((file) => `<option value="${file}">${file}</option>`)
            .join("")}
        </select>
        <button id="add-tray-btn">Add Tray</button>
        <button id="cancel-btn">Cancel</button>
      `;

  document.body.appendChild(dialog);

  const addButton = document.getElementById(
    "add-tray-btn"
  ) as HTMLButtonElement;
  const cancelButton = document.getElementById(
    "cancel-btn"
  ) as HTMLButtonElement;
  const traySelect = document.getElementById(
    "tray-select"
  ) as HTMLSelectElement;

  addButton.addEventListener("click", () => {
    const selectedFile = traySelect.value;
    addTrayFromServer(parent, url, selectedFile);
    dialog.remove();
  });

  cancelButton.addEventListener("click", () => {
    dialog.remove();
  });
}
export async function addTrayFromServer(
  parent: Tray,
  host_url: string,
  filename: string
) {
  try {
    const response = await fetch(`${host_url}/tray/load`, {
      method: "GET",
      headers: {
        filename: filename,
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    parent.addChild(deserialize(JSON.stringify(data)));
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to add tray from server.");
  }
}
export async function uploadData(tray: Tray) {
    const data = JSON.parse(serialize(tray));
    
    if (!tray.filename){return}
    if (!tray.host_url){return}
  
    try {
      const response = await fetch(`${tray.host_url}/tray/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          filename: tray.filename, // filenameはnullでないことが保証される
        },
        body: JSON.stringify({ data: data }),
      });
  
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
  
      const result = await response.text();
      console.log(result);
      showUploadNotification("Data uploaded successfully.");
    } catch (error) {
      console.error("Error:", error);
      showUploadNotification("Failed to upload data.", true);
      throw error;
    }
  }
  
export async function downloadData(tray: Tray) {
    if (!tray.filename){return}
    if (!tray.host_url){return}

  
    try {
      const response = await fetch(`${tray.host_url}/tray/load`, {
        method: "GET",
        headers: {
          filename: tray.filename, // filenameはnullでないことが保証される
        },
      });
  
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
  
      const data = await response.json();
      const downloadedTray = deserialize(data);
      
      // ダウンロードされたtrayの処理（コメント解除して使う）
      // let parent = getTrayFromId(this.parentId);
      // parent.addChild(downloadedTray);
      // parent.updateAppearance();
      // this.element = downloadedTray.element;
      // notifyUser('データのダウンロードに成功しました。');
  
      return downloadedTray;
    } catch (error) {
      console.error("Error:", error);
      showUploadNotification("データのダウンロードに失敗しました。");
      throw error;
    }
  }
  
export function showUploadNotification(message:string, isError = false) {
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.position = "fixed";
    notification.style.bottom = "20px";
    notification.style.right = "20px";
    notification.style.padding = "10px";
    notification.style.borderRadius = "5px";
    notification.style.color = "white";
    notification.style.backgroundColor = isError ? "red" : "green";
    notification.style.zIndex = "1000";

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transition = "opacity 0.5s";
      notification.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 3000);
  }

export function setNetworkOption(tray: Tray) {
  const hostUrl = prompt('ホストURLを入力してください (空欄の場合、nullになります):', tray.host_url || "");
  const filename = prompt('ファイル名を入力してください (空欄の場合、nullになります):', tray.filename || "");

  tray.host_url = hostUrl? (hostUrl.trim() === "" ? null : hostUrl) : null;
  tray.filename = filename? (filename.trim() === "" ? null : filename) : null
}