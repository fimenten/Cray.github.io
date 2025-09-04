import { Tray } from "./tray";
import { serializeAsync, deserialize } from "./io";
import { detectConflict, ConflictError, updateLastKnownState, ConflictDetectionResult } from './conflictResolution';

const lastSerializedMap = new Map<string, string>();

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

export function newestTimestamp(tray1: Tray, tray2: Tray): Tray {
  // Handle both Date objects and ISO strings
  const getTimestamp = (date: any) => {
    if (!date) return 0;
    if (typeof date === 'string') return new Date(date).getTime();
    if (date.getTime) return date.getTime();
    return 0;
  };
  
  const ts1 = getTimestamp(tray1.created_dt);
  const ts2 = getTimestamp(tray2.created_dt);
  return ts1 > ts2 ? tray1 : tray2;
}

function mergeTrays(local: Tray, remote: Tray) {
  // Simple merge strategy - take the newest timestamp
  const newest = newestTimestamp(local, remote);
  if (newest === remote) {
    // Update local with remote data
    local.name = remote.name;
    local.properties = remote.properties;
    local.hooks = remote.hooks;
    local.isDone = remote.isDone;
  }
  // If local is newest, no changes needed
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

export async function syncTray(tray: Tray) {
  if (!tray.host_url || !tray.filename) {
    return;
  }
  
  try {
    await updateData(tray);
  } catch (error) {
    console.error("Sync failed:", error);
    throw error;
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
        if (downloaded) {
          // Replace current tray content with downloaded content
          tray.name = downloaded.name;
          tray.children = downloaded.children;
          // Preserve network settings
          downloaded.host_url = tray.host_url;
          downloaded.filename = tray.filename;
          showUploadNotification("Data downloaded successfully.");
        }
      })
      .catch((error) => {
        console.error("Download failed:", error);
        showUploadNotification("Failed to download data.", true);
      });
  }
}

// Auto-upload management
const autoUploadTimers = new Map<string, number>();
const pendingUploads = new Set<string>();
const UPLOAD_DEBOUNCE_DELAY = 2000; // 2 seconds

export async function startAutoUpload(tray: Tray): Promise<void> {
  if (!tray.host_url || !tray.filename) {
    console.warn(`Cannot start auto-upload for tray ${tray.id}: missing host_url or filename`);
    return;
  }

  console.log(`Starting auto-upload for tray: ${tray.name} (${tray.id})`);
  
  // Update initial baseline state
  await updateLastKnownState(tray);
}

export function stopAutoUpload(tray: Tray): void {
  const timerId = autoUploadTimers.get(tray.id);
  if (timerId) {
    clearTimeout(timerId);
    autoUploadTimers.delete(tray.id);
  }
  pendingUploads.delete(tray.id);
  console.log(`Stopped auto-upload for tray: ${tray.name} (${tray.id})`);
}

export function stopAllAutoUploads(): void {
  autoUploadTimers.forEach(timerId => clearTimeout(timerId));
  autoUploadTimers.clear();
  pendingUploads.clear();
  console.log("Stopped all auto-uploads");
}

export function scheduleAutoUpload(tray: Tray): void {
  if (!tray.host_url || !tray.filename) {
    return;
  }

  if (pendingUploads.has(tray.id)) {
    return; // Upload already scheduled
  }

  // Clear existing timer if any
  const existingTimer = autoUploadTimers.get(tray.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Mark as pending
  pendingUploads.add(tray.id);

  // Schedule upload with debounce
  const timerId = setTimeout(async () => {
    try {
      await performAutoUpload(tray);
    } catch (error) {
      console.error(`Auto-upload failed for tray ${tray.id}:`, error);
      showUploadNotification(`Auto-upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    } finally {
      autoUploadTimers.delete(tray.id);
      pendingUploads.delete(tray.id);
    }
  }, UPLOAD_DEBOUNCE_DELAY);

  autoUploadTimers.set(tray.id, timerId as unknown as number);
  console.log(`Auto-upload scheduled for tray ${tray.name} in ${UPLOAD_DEBOUNCE_DELAY}ms`);
}

async function performAutoUpload(tray: Tray): Promise<void> {
  if (!tray.host_url || !tray.filename) {
    throw new Error('Missing host_url or filename');
  }

  console.log(`Performing auto-upload for tray: ${tray.name} (${tray.id})`);

  try {
    // Download remote version to check for conflicts
    let remoteTray: Tray | undefined;
    try {
      remoteTray = await downloadData(tray);
    } catch (error) {
      // If download fails, assume no remote version exists
      console.log(`No remote version found for ${tray.name}, proceeding with upload`);
      remoteTray = undefined;
    }

    if (remoteTray) {
      // Perform conflict detection
      const conflictResult = await detectConflict(tray, remoteTray);
      
      await handleConflictResult(conflictResult, tray, remoteTray);
    } else {
      // No remote version, safe to upload
      await uploadData(tray);
      await updateLastKnownState(tray);
      console.log(`Auto-upload completed for tray: ${tray.name}`);
    }

  } catch (error) {
    if (error instanceof ConflictError) {
      // Show conflict notification to user
      showConflictNotification(error);
      throw error;
    } else {
      // Other errors - retry logic handled by global sync manager
      throw error;
    }
  }
}

async function handleConflictResult(
  conflictResult: ConflictDetectionResult, 
  localTray: Tray, 
  remoteTray: Tray
): Promise<void> {
  switch (conflictResult.action) {
    case 'upload':
      await uploadData(localTray);
      await updateLastKnownState(localTray);
      showUploadNotification(`Auto-upload: ${localTray.name}`);
      break;
      
    case 'download':
      // Update local tray with remote data
      localTray.name = remoteTray.name;
      localTray.children = remoteTray.children;
      localTray.properties = remoteTray.properties;
      localTray.hooks = remoteTray.hooks;
      localTray.isDone = remoteTray.isDone;
      // Preserve network settings
      remoteTray.host_url = localTray.host_url;
      remoteTray.filename = localTray.filename;
      
      await updateLastKnownState(localTray);
      showUploadNotification(`Auto-download: ${localTray.name}`);
      break;
      
    case 'conflict':
      // Throw conflict error for manual resolution
      throw new ConflictError(
        `Sync conflict detected for ${localTray.name}: ${conflictResult.reason}`,
        conflictResult.conflictType || 'both_updated',
        localTray,
        remoteTray
      );
      
    case 'nothing':
      // No action needed
      console.log(`No sync needed for tray: ${localTray.name}`);
      break;
      
    default:
      throw new Error(`Unknown conflict resolution action: ${conflictResult.action}`);
  }
}

function showConflictNotification(error: ConflictError): void {
  const message = `Conflict detected for "${error.localTray.name}". Manual resolution required.`;
  showUploadNotification(message, true);
  
  // Could show a more sophisticated conflict resolution dialog here
  console.log('Conflict details:', {
    type: error.conflictType,
    local: error.localTray.name,
    remote: error.remoteTray.name,
    message: error.message
  });
}