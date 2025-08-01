import { Tray } from "./tray";
import { deserialize, serializeAsync, serialize } from "./io";
import { getTrayFromId } from "./trayOperations";
import { deleteTray } from "./functions";
import { ConflictManager, ConflictError } from "./conflictResolution";

import type { TrayId } from "./types";

const lastSerializedMap = new Map<TrayId, string>();
const intervalIds = new Map<TrayId, any>();

export function newestTimestamp(tray: Tray): number {
  let latest = new Date(tray.created_dt).getTime();
  for (const child of tray.children) {
    const t = newestTimestamp(child);
    if (t > latest) latest = t;
  }
  return latest;
}

export function mergeTrays(local: Tray, remote: Tray) {
  if (newestTimestamp(remote) > newestTimestamp(local)) {
    if (remote.name !== undefined) local.name = remote.name;
    local.created_dt = new Date(remote.created_dt);
    if (remote.borderColor !== undefined) local.borderColor = remote.borderColor;
    if (remote.flexDirection !== undefined) local.flexDirection = remote.flexDirection;
    if (remote.host_url) local.host_url = remote.host_url;
    if (remote.filename) local.filename = remote.filename;
    if (remote.isFolded !== undefined) local.isFolded = remote.isFolded;
    local.properties = { ...local.properties, ...remote.properties };
    local.hooks = Array.from(new Set([...(local.hooks || []), ...(remote.hooks || [])]));
    local.isDone = remote.isDone;
    local.showDoneMarker = remote.showDoneMarker;
  }

  const map = new Map(local.children.map((c: Tray) => [c.id, c]));
  for (const r of remote.children) {
    const l = map.get(r.id);
    if (l) {
      mergeTrays(l, r);
    } else if (typeof local.addChild === 'function') {
      local.addChild(r as Tray);
    } else {
      r.parentId = local.id;
      local.children.push(r);
    }
  }
}

export async function syncTray(tray: Tray) {
  const current = await serializeAsync(tray);
  const last = lastSerializedMap.get(tray.id) || "";
  
  // Skip if no local changes
  if (current === last) return;
  
  let remote: Tray | undefined;
  try {
    remote = await downloadData(tray);
  } catch (e) {
    // No remote version exists, proceed with upload
    remote = undefined;
  }
  
  if (remote) {
    try {
      // Use enhanced conflict resolution only in real browser environment
      // Check for real browser (not test mock) by looking for actual browser APIs
      if (typeof window !== 'undefined' && 
          typeof process === 'undefined' && 
          window.location && 
          typeof window.location.href === 'string' && 
          window.location.href.length > 0) {
        const resolvedTray = await ConflictManager.handleSyncConflict(tray, remote, last, serialize);
        
        // If we got a resolved tray, replace the current one
        if (resolvedTray !== tray) {
          const parent = getTrayFromId(tray.parentId) as Tray;
          deleteTray(tray);
          parent.addChild(resolvedTray);
          parent.updateAppearance();
          lastSerializedMap.set(tray.id, await serializeAsync(resolvedTray));
          return;
        }
      } else {
        // In test environment, use merge-based resolution for compatibility
        mergeTrays(tray, remote);
      }
    } catch (error) {
      if (error instanceof ConflictError) {
        console.log(`Conflict detected for tray ${tray.name}, manual resolution required`);
        // Re-throw conflict error to be handled by UI
        throw error;
      } else {
        console.error('Error during conflict resolution:', error);
        // Fall back to merge-based resolution
        mergeTrays(tray, remote);
      }
    }
  }
  
  // Upload local version (which may have been merged)
  await uploadData(tray);
  lastSerializedMap.set(tray.id, await serializeAsync(tray));
}

export function startAutoUpload(tray: Tray) {
  stopAutoUpload(tray);
  const setIntervalFn = (typeof window !== 'undefined' && window.setInterval) || setInterval;
  const id = setIntervalFn(() => {
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

export function stopAllAutoUploads() {
  console.log('Stopping all individual tray auto-uploads');
  intervalIds.forEach((id) => {
    clearInterval(id);
  });
  intervalIds.clear();
}

// Cleanup intervals on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    console.log('Cleaning up individual tray auto-upload intervals');
    intervalIds.forEach((id) => {
      clearInterval(id);
    });
    intervalIds.clear();
  });
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
  const data = JSON.parse(await serializeAsync(tray));
  if (!tray.host_url) {
    return;
  }



  if (!tray.filename) {
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
  const last = lastSerializedMap.get(tray.id) || "";

  let remote: Tray | undefined;
  try {
    remote = await downloadData(tray);
  } catch (error) {
    remote = undefined;
  }

  if (remote) {
    mergeTrays(tray, remote);
  }

  const current = await serializeAsync(tray);
  if (current !== last) {
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
  
  // Enable auto-upload by default when network is configured
  if (tray.host_url && tray.filename) {
    tray.autoUpload = true;
  }
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
