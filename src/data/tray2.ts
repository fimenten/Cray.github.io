import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  addNode,
  addEdge,
  removeEdge,
  fetchNodeInfo,
  updateNodeInfo,
  moveNode,
  Vertex,
  Tree,
} from "../graphCore";
import storage from "redux-persist/lib/storage";
import { serialize } from "v8";
import { RootState } from ".";
import { generateUUID } from "../utils";

// Trayインターフェース

export interface TrayInfo {
  id: string;
  name: string;
  flexDirection: "column" | "row";
  color?: string;
  URL?: string | null;
  filename?: string | null;
}

export interface Tray extends Vertex {
  data: TrayInfo;
}

export interface visualTray extends Tray {
  isFolded: boolean | true;
  isSelected?: boolean | false;
}

export interface LinkingTray {
  fromTo: { string: string[] };
  toFrom: { string: string };
}

// TrayGraphインターフェース
export interface TrayVisualGraph extends Tree<visualTray> {
  rootId: string;
  editingId: string | null;
  focusingId: string | null;
  selectedId: string[];
  contextMenuOpening: boolean;
  trayInformation: { [key: string]: TrayInfo }; // 修正された部分
}

// 初期状態の定義

const rootTrayInfo: TrayInfo = {
  id: "root",
  name: "root",
  flexDirection: "column",
};
const rootTray: visualTray = {
  id: generateUUID(),
  data: rootTrayInfo,
  isFolded: false,
};

const initialState: TrayVisualGraph = {
  nodes: { [rootTray.id]: rootTray },
  fromTo: { [rootTray.id]: [] },
  toFrom: { [rootTray.id]: [] },
  trayInformation: {},
  nodeInfo: { information: {} },
  selectedId: [],
  rootId: rootTray.id,
  editingId: null,
  focusingId: rootTray.id,
  contextMenuOpening: false,
};

// trayGraphSliceの作成
const trayGraphSlice = createSlice({
  name: "trayGraph",
  initialState,
  reducers: {
    addNode,
    addEdge,
    removeEdge,
    moveNode,
    fetchNodeInfo,
    updateNodeInfo,
    mergeGraph: (
      state,
      action: PayloadAction<{ pastedGraph: TrayVisualGraph }>
    ) => {
      const { pastedGraph } = action.payload;
      state.nodes = { ...state.nodes, ...pastedGraph.nodes };
      state.trayInformation = {
        ...state.trayInformation,
        ...pastedGraph.trayInformation,
      };
      state.fromTo = { ...state.fromTo, ...pastedGraph.fromTo };
      state.toFrom = { ...state.toFrom, ...pastedGraph.toFrom };
      state.nodeInfo = { ...state.nodeInfo, ...pastedGraph.nodeInfo };
    },
    toggleFold: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      state.nodes[id].isFolded = !state.nodes[id].isFolded;
    },
    updateTrayName: (
      state,
      action: PayloadAction<{ id: string; name: string }>
    ) => {
      const { id, name } = action.payload;
      state.nodes[id].data.name = name;
      state.trayInformation[state.nodes[id].data.id] = state.nodes[id].data;
    },
    updateTraycolor: (
      state,
      action: PayloadAction<{ id: string; color: string }>
    ) => {
      const { id, color } = action.payload;
      state.nodes[id].data.color = color;
      state.trayInformation[state.nodes[id].data.id] = state.nodes[id].data;
    },
    updateTrayURL: (
      state,
      action: PayloadAction<{ id: string; URL: string }>
    ) => {
      const { id, URL } = action.payload;
      state.nodes[id].data.URL = URL;
      state.trayInformation[state.nodes[id].data.id] = state.nodes[id].data;
    },
    updateTrayFilename: (
      state,
      action: PayloadAction<{ id: string; filename: string }>
    ) => {
      const { id, filename } = action.payload;
      state.nodes[id].data.filename = filename;
      state.trayInformation[state.nodes[id].data.id] = state.nodes[id].data;
    },
    updateTrayVisFold: (
      state,
      action: PayloadAction<{ id: string; fold: boolean }>
    ) => {
      const { id, fold } = action.payload;
      state.nodes[id].isFolded = fold;
    },
    updateTrayFlex: (
      state,
      action: PayloadAction<{ id: string; flexDirection: "row" | "column" }>
    ) => {
      const { id, flexDirection } = action.payload;
      state.nodes[id].data.flexDirection = flexDirection;
      state.trayInformation[state.nodes[id].data.id] = state.nodes[id].data;
    },
    updateSelected(
      state,
      action: PayloadAction<{ id: string; checked: boolean }>
    ) {
      const { id, checked } = action.payload;
      if (checked) {
        state.selectedId.push(id);
      } else {
        state.selectedId = state.selectedId.filter((vid) => vid != id);
      }
    },

    setRootId: (state, action: PayloadAction<string>) => {
      state.rootId = action.payload;
    },
    setEditingId: (state, action: PayloadAction<string | null>) => {
      state.editingId = action.payload;
    },
    setfocusingId: (state, action: PayloadAction<string | null>) => {
      state.focusingId = action.payload;
    },
    setContextMenuOpening: (state, action: PayloadAction<boolean>) => {
      state.contextMenuOpening = action.payload;
    },
    resetAllTray: (state) => {
      state.fromTo[state.rootId] = [];
    },
    moveFocus: (
      state,
      action: PayloadAction<{
        direction: "left" | "right" | "upper" | "lower";
        visId: string;
      }>
    ) => {
      const { direction, visId } = action.payload;
      if (direction === "left") {
        const parentId = state.toFrom[visId][0];
        if (parentId && parentId !== "null") {
          state.focusingId = parentId;
        }
      } else if (direction === "right") {
        const children = state.fromTo[visId];
        if (children && children.length > 0) {
          state.focusingId = children[0];
        }
      } else if (direction === "upper" || direction === "lower") {
        const parentId = state.toFrom[visId][0];
        if (parentId && parentId !== "null") {
          const siblings = state.fromTo[parentId];
          const index = siblings.indexOf(visId);
          if (direction === "upper" && index > 0) {
            state.focusingId = siblings[index - 1];
          } else if (direction === "lower" && index < siblings.length - 1) {
            state.focusingId = siblings[index + 1];
          }
        }
      }
    },
  },
});

// アクションとリデューサーのエクスポート
export const {
  addNode: addTray,
  addEdge: addTrayEdge,
  removeEdge: removeTrayEdge,
  fetchNodeInfo: fetchTrayNodeInfo,
  updateNodeInfo: updateTrayNodeInfo,
  moveNode: moveTray,
  setRootId,
  setEditingId,
  setfocusingId,
  setContextMenuOpening,
  updateTrayFilename,
  updateTrayName,
  updateTrayURL,
  updateTraycolor,
  updateTrayVisFold,
  updateTrayFlex,
  updateSelected,
  moveFocus,
  resetAllTray,
  toggleFold,
  mergeGraph,
} = trayGraphSlice.actions;

export default trayGraphSlice.reducer;
