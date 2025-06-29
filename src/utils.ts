import { deserialize, saveToIndexedDB, serialize } from "./io";

export function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export function getWhiteColor() {
  return "#f5f5f5";
}

export function getUrlParameter(name: string) {
  const params = new URLSearchParams(window.location.search);
  const value = (params.get(name) || "").trim();
  if (!value && name === "sessionId") {
    return "default";
  }
  return value;
}
export function getRootElement() {
  const rootTrayElement = document.querySelector("body > div.tray");
  if (rootTrayElement) {
    return rootTrayElement;
  }
  return null;
}

export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

