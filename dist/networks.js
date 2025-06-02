var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { deserialize, serialize } from "./io";
import { getTrayFromId } from "./utils";
import { deleteTray } from "./functions";
export function fetchTrayList(tray) {
    const defaultServer = localStorage.getItem("defaultServer") || "";
    const url = prompt("Enter server URL:", defaultServer);
    if (!url)
        return;
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
export function showTraySelectionDialog(parent, url, files) {
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
    const addButton = document.getElementById("add-tray-btn");
    const cancelButton = document.getElementById("cancel-btn");
    const traySelect = document.getElementById("tray-select");
    addButton.addEventListener("click", () => {
        const selectedFile = traySelect.value;
        addTrayFromServer(parent, url, selectedFile);
        dialog.remove();
    });
    cancelButton.addEventListener("click", () => {
        dialog.remove();
    });
}
export function addTrayFromServer(parent, host_url, filename) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${host_url}/tray/load`, {
                method: "GET",
                headers: {
                    filename: filename,
                },
            });
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data = yield response.json();
            console.log(data);
            parent.addChild(deserialize(JSON.stringify(data)));
        }
        catch (error) {
            console.error("Error:", error);
            alert("Failed to add tray from server.");
        }
    });
}
export function uploadData(tray) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = JSON.parse(serialize(tray));
        if (!tray.filename) {
            return;
        }
        if (!tray.host_url) {
            return;
        }
        try {
            const response = yield fetch(`${tray.host_url}/tray/save`, {
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
            const result = yield response.text();
            console.log(result);
            showUploadNotification("Data uploaded successfully.");
        }
        catch (error) {
            console.error("Error:", error);
            showUploadNotification("Failed to upload data.", true);
            throw error;
        }
    });
}
export function downloadData(tray) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!tray.filename) {
            return;
        }
        if (!tray.host_url) {
            return;
        }
        try {
            const response = yield fetch(`${tray.host_url}/tray/load`, {
                method: "GET",
                headers: {
                    filename: tray.filename, // filenameはnullでないことが保証される
                },
            });
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data = yield response.json();
            const downloadedTray = deserialize(JSON.stringify(data));
            // ダウンロードされたtrayの処理（コメント解除して使う）
            // let parent = getTrayFromId(this.parentId);
            // parent.addChild(downloadedTray);
            // parent.updateAppearance();
            // this.element = downloadedTray.element;
            // notifyUser('データのダウンロードに成功しました。');
            return downloadedTray;
        }
        catch (error) {
            console.error("Error:", error);
            showUploadNotification("データのダウンロードに失敗しました。");
            throw error;
        }
    });
}
export function showUploadNotification(message, isError = false) {
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
export function setNetworkOption(tray) {
    const hostUrl = prompt("ホストURLを入力してください (空欄の場合、nullになります):", tray.host_url || "");
    const filename = prompt("ファイル名を入力してください (空欄の場合、nullになります):", tray.filename || "");
    tray.host_url = hostUrl ? (hostUrl.trim() === "" ? null : hostUrl) : null;
    tray.filename = filename ? (filename.trim() === "" ? null : filename) : null;
}
export function showNetworkOptions(tray) {
    let d;
    if (tray.host_url) {
        d = tray.host_url;
    }
    else {
        d = localStorage.getItem("defaultServer");
    }
    const url = prompt("Enter URL:", d ? d : "");
    const filename = prompt("Enter filename:", tray.filename ? tray.filename : "");
    if (url)
        tray.host_url = url;
    if (filename)
        tray.filename = filename;
}
export function ondownloadButtonPressed(tray) {
    // First, show a confirmation dialog
    if (confirm("Are you sure you want to download?")) {
        downloadData(tray)
            .then((downloaded) => {
            // Update the current tray with the downloaded data
            let parent = getTrayFromId(tray.parentId);
            deleteTray(tray);
            parent.addChild(downloaded);
            parent.updateAppearance();
            // Notify user of successful download
            showUploadNotification("Download completed successfully.");
        })
            .catch((error) => {
            console.error("Download failed:", error);
            showUploadNotification("Download failed. Please check your connection.");
        });
    }
    else {
        // If user cancels, notify them
        showUploadNotification("Download cancelled.");
    }
}
