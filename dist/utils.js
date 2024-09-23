"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrayFromId = getTrayFromId;
exports.getRandomColor = getRandomColor;
exports.getWhiteColor = getWhiteColor;
exports.getUrlParameter = getUrlParameter;
exports.getRootElement = getRootElement;
exports.createDefaultRootTray = createDefaultRootTray;
exports.generateUUID = generateUUID;
exports.cloneTray = cloneTray;
const app_1 = require("./app");
function getTrayFromId(Id) {
  const element = document.querySelector(`[data-tray-id="${Id}"]`);
  // If the element is found, return its `__trayInstance` property, otherwise return null
  return app_1.element2TrayMap.get(element);
}
function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
function getWhiteColor() {
  return "#f5f5f5";
}
function getUrlParameter(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}
function getRootElement() {
  const rootTrayElement = document.querySelector("body > div.tray");
  if (rootTrayElement) {
    return rootTrayElement;
  }
  return null;
}
function createDefaultRootTray() {
  const rootTray = new app_1.Tray("0", "0", "Root Tray");
  const content = rootTray.element.querySelector(".tray-content");
  const tray1 = new app_1.Tray(rootTray.id, generateUUID(), "ToDo");
  const tray2 = new app_1.Tray(rootTray.id, generateUUID(), "Doing");
  const tray3 = new app_1.Tray(rootTray.id, generateUUID(), "Done");
  rootTray.addChild(tray1);
  rootTray.addChild(tray2);
  rootTray.addChild(tray3);
  return rootTray;
}
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
function cloneTray(tray) {
  let ret = JSON.parse(JSON.stringify(tray));
  ret.id = generateUUID();
  return ret;
}
