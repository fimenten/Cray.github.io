import { element2TrayMap } from "./app";
import { getRootElement } from "./utils";
import type { Tray } from "./tray";

const history: string[] = [];

export function recordState(state?: string) {
  if (!state) {
    const io = require("./io");
    const root = getRootElement();
    if (!root) return;
    const tray = element2TrayMap.get(root as HTMLElement) as Tray;
    if (!tray) return;
    state = io.serialize(tray);
  }
  history.push(state as string);
  if (history.length > 50) history.shift();
}

export function undo() {
  if (history.length < 2) return;
  history.pop();
  const prev = history[history.length - 1];
  const io = require("./io");
  const tray = io.deserialize(prev) as Tray;
  io.renderRootTray(tray);
}

export function _getHistoryLength() {
  return history.length;
}
