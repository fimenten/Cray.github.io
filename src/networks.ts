import { Tray } from "./tray";
import { deserialize, serialize } from "./io";
import { getTrayFromId } from "./utils";
import { deleteTray } from "./functions";

import type { TrayId } from "./tray";

const lastSerializedMap = new Map<TrayId, string>();
const intervalIds = new Map<TrayId, number>();

export function newestTimestamp(tray: Tray): number {
  let latest = new Date(tray.created_dt).getTime();
  for (const child of tray.children) {
    const t = newestTimestamp(child);
    if (t > latest) latest = t;
  }
  return latest;
}

export async function syncTray(tray: Tray) {
  const current = serialize(tray);
  const last = lastSerializedMap.get(tray.id) || "";
  if (current === last) return;
  let remote: Tray | undefined;
  try {
    remote = await downloadData(tray);
  } catch (e) {
    remote = undefined;
  }
  if (remote && newestTimestamp(remote) > newestTimestamp(tray)) {
    const parent = getTrayFromId(tray.parentId) as Tray;
    deleteTray(tray);
    parent.addChild(remote);
    parent.updateAppearance();
    lastSerializedMap.set(tray.id, serialize(remote));
    return;
  }
  await uploadData(tray);
  lastSerializedMap.set(tray.id, current);
}

export function startAutoUpload(tray: Tray) {
  stopAutoUpload(tray);
  const id = window.setInterval(() => {
    syncTray(tray).catch(console.error);
  }, 60000);
  intervalIds.set(tray.id, id);
}

export function stopAutoUpload(tray: Tray) {
  const id = intervalIds.get(tray.id);
  if (id !== undefined) {
    clearInterval(id);
    intervalIds.delete(tray.id);
  }
}
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

function getPasswordForServer(serverUrl: string): string | null {
  const normalizedUrl = normalizeUrl(serverUrl);
  const serverPasswords = JSON.parse(
    localStorage.getItem("serverPasswords") || "{}",
  );
  
  // Try exact match first
  if (serverPasswords[normalizedUrl]) {
    return serverPasswords[normalizedUrl];
  }
  
  // Try to find a match with different variations
  for (const [storedUrl, password] of Object.entries(serverPasswords)) {
    if (normalizeUrl(storedUrl) === normalizedUrl) {
      return password as string;
    }
  }
  
  // Fall back to legacy password
  const trayPassword = localStorage.getItem("trayPassword");
  return trayPassword || null;
}

export function fetchTrayList(tray: Tray) {
  const defaultServer = localStorage.getItem("defaultServer") || "";
  const url = prompt("Enter server URL:", defaultServer);
  if (!url) return;

  const password = getPasswordForServer(url);
  if (!password) {
    alert("No password configured for this server. Please set up server passwords in the hamburger menu.");
    return;
  }

  fetch(`${url}/tray/list_auth`, {
    method: "GET",
    headers: {
      "Authorization": password,
    },
  })
    .then((response) => {
      if (response.status === 401) {
        alert("Authentication failed. Please check your password.");
        return;
      }
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data) {
        showTraySelectionDialog(tray, url, data.files);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Failed to fetch tray list from server.");
    });
}
export function showTraySelectionDialog(
  parent: Tray,
  url: string,
  files: string[],
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
    "add-tray-btn",
  ) as HTMLButtonElement;
  const cancelButton = document.getElementById(
    "cancel-btn",
  ) as HTMLButtonElement;
  const traySelect = document.getElementById(
    "tray-select",
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
  filename: string,
) {
  try {
    const password = getPasswordForServer(host_url);
    if (!password) {
      alert("No password configured for this server. Please set up server passwords in the hamburger menu.");
      return;
    }

    const response = await fetch(`${host_url}/tray/load_auth`, {
      method: "GET",
      headers: {
        "Authorization": password,
        "filename": filename,
      },
    });

    if (response.status === 401) {
      alert("Authentication failed. Please check your password in the hamburger menu.");
      return;
    }

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

  if (!tray.filename) {
    return;
  }
  if (!tray.host_url) {
    return;
  }

  const password = getPasswordForServer(tray.host_url);
  if (!password) {
    showUploadNotification(
      "Password is required for secure upload.",
      true,
    );
    return;
  }

  try {
    const response = await fetch(`${tray.host_url}/tray/upload_auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": password,
        "filename": tray.filename,
      },
      body: JSON.stringify({ data: data }),
    });

    if (response.status === 401) {
      showUploadNotification("Authentication failed. Please check your password in the hamburger menu.", true);
      return;
    }

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
  if (!tray.filename) {
    return;
  }
  if (!tray.host_url) {
    return;
  }

  const password = getPasswordForServer(tray.host_url);
  if (!password) {
    showUploadNotification("No password configured for this server. Please set up server passwords in the hamburger menu.", true);
    return;
  }

  try {
    const response = await fetch(`${tray.host_url}/tray/load_auth`, {
      method: "GET",
      headers: {
        "Authorization": password,
        "filename": tray.filename,
      },
    });

    if (response.status === 401) {
      showUploadNotification("Authentication failed. Please check your password in the hamburger menu.", true);
      return;
    }

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    const downloadedTray = deserialize(JSON.stringify(data));

    return downloadedTray;
  } catch (error) {
    console.error("Error:", error);
    showUploadNotification("Failed to download data.", true);
    throw error;
  }
}

export async function updateData(tray: Tray) {
  if (!tray.filename || !tray.host_url) {
    return;
  }

  const current = serialize(tray);
  const last = lastSerializedMap.get(tray.id);

  let remote: Tray | undefined;
  try {
    remote = await downloadData(tray);
  } catch (error) {
    throw error;
  }

  if (!last) {
    if (remote) {
      const parent = getTrayFromId(tray.parentId) as Tray;
      deleteTray(tray);
      parent.addChild(remote);
      parent.updateAppearance();
      lastSerializedMap.set(tray.id, serialize(remote));
    } else {
      await uploadData(tray);
      lastSerializedMap.set(tray.id, current);
    }
    return;
  }

  const remoteSerialized = remote ? serialize(remote) : "";
  const localChanged = current !== last;
  const remoteChanged = remote ? remoteSerialized !== last : false;

  if (localChanged && remoteChanged) {
    throw new Error("Data conflict");
  }

  if (remoteChanged) {
    const parent = getTrayFromId(tray.parentId) as Tray;
    deleteTray(tray);
    parent.addChild(remote as Tray);
    parent.updateAppearance();
    lastSerializedMap.set(tray.id, remoteSerialized);
  } else if (localChanged) {
    await uploadData(tray);
    lastSerializedMap.set(tray.id, current);
  }
}

export function showUploadNotification(message: string, isError = false) {
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
  const hostUrl = prompt(
    "ホストURLを入力してください (空欄の場合、nullになります):",
    tray.host_url || "",
  );
  const filename = prompt(
    "ファイル名を入力してください (空欄の場合、nullになります):",
    tray.filename || "",
  );

  tray.host_url = hostUrl ? (hostUrl.trim() === "" ? null : hostUrl) : null;
  tray.filename = filename ? (filename.trim() === "" ? null : filename) : null;
}

export function showNetworkOptions(tray: Tray) {
  let d;
  if (tray.host_url) {
    d = tray.host_url;
  } else {
    d = localStorage.getItem("defaultServer");
  }

  const url = prompt("Enter URL:", d ? d : "");
  const filename = prompt(
    "Enter filename:",
    tray.filename ? tray.filename : "",
  );

  if (url) tray.host_url = url;
  if (filename) tray.filename = filename;
}


export async function removeDataFromServer(tray: Tray) {
  if (!tray.filename) {
    showUploadNotification("No filename specified for removal.", true);
    return;
  }
  if (!tray.host_url) {
    showUploadNotification("No server URL specified for removal.", true);
    return;
  }

  const password = getPasswordForServer(tray.host_url);
  if (!password) {
    showUploadNotification("No password configured for this server. Please set up server passwords in the hamburger menu.", true);
    return;
  }

  try {
    const response = await fetch(`${tray.host_url}/tray/remove`, {
      method: "DELETE",
      headers: {
        "Authorization": password,
        "filename": tray.filename,
      },
    });

    if (response.status === 401) {
      showUploadNotification("Authentication failed. Please check your password in the hamburger menu.", true);
      return;
    }

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    showUploadNotification("File removed from server successfully.");
  } catch (error) {
    console.error("Error:", error);
    showUploadNotification("Failed to remove file from server.", true);
    throw error;
  }
}

export function ondownloadButtonPressed(tray: Tray) {
  // First, show a confirmation dialog
  if (confirm("Are you sure you want to download?")) {
    downloadData(tray)
      .then((downloaded) => {
        // Update the current tray with the downloaded data
        let parent = getTrayFromId(tray.parentId) as Tray;
        deleteTray(tray);
        parent.addChild(downloaded as Tray);
        parent.updateAppearance();

        // Notify user of successful download
        showUploadNotification("Download completed successfully.");
      })
      .catch((error) => {
        console.error("Download failed:", error);
        showUploadNotification(
          "Download failed. Please check your connection.",
        );
      });
  } else {
    // If user cancels, notify them
    showUploadNotification("Download cancelled.");
  }
}
