import { createSlice } from "@reduxjs/toolkit";
import { addNode, addEdge, removeEdge, fetchNodeInfo, updateNodeInfo, moveNode, } from "../graphCore";
import { generateUUID } from "../utils";
// 初期状態の定義
const rootTrayInfo = {
    id: "root",
    name: "root",
    flexDirection: "column",
};
const rootTray = {
    id: generateUUID(),
    data: rootTrayInfo,
    isFolded: false,
};
const initialState = {
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
        mergeGraph: (state, action) => {
            const { pastedGraph } = action.payload;
            state.nodes = Object.assign(Object.assign({}, state.nodes), pastedGraph.nodes);
            state.trayInformation = Object.assign(Object.assign({}, state.trayInformation), pastedGraph.trayInformation);
            state.fromTo = Object.assign(Object.assign({}, state.fromTo), pastedGraph.fromTo);
            state.toFrom = Object.assign(Object.assign({}, state.toFrom), pastedGraph.toFrom);
            state.nodeInfo = Object.assign(Object.assign({}, state.nodeInfo), pastedGraph.nodeInfo);
        },
        toggleFold: (state, action) => {
            const { id } = action.payload;
            state.nodes[id].isFolded = !state.nodes[id].isFolded;
        },
        updateTrayName: (state, action) => {
            const { id, name } = action.payload;
            state.nodes[id].data.name = name;
            state.trayInformation[state.nodes[id].data.id] = state.nodes[id].data;
        },
        updateTraycolor: (state, action) => {
            const { id, color } = action.payload;
            state.nodes[id].data.color = color;
            state.trayInformation[state.nodes[id].data.id] = state.nodes[id].data;
        },
        updateTrayURL: (state, action) => {
            const { id, URL } = action.payload;
            state.nodes[id].data.URL = URL;
            state.trayInformation[state.nodes[id].data.id] = state.nodes[id].data;
        },
        updateTrayFilename: (state, action) => {
            const { id, filename } = action.payload;
            state.nodes[id].data.filename = filename;
            state.trayInformation[state.nodes[id].data.id] = state.nodes[id].data;
        },
        updateTrayVisFold: (state, action) => {
            const { id, fold } = action.payload;
            state.nodes[id].isFolded = fold;
        },
        updateTrayFlex: (state, action) => {
            const { id, flexDirection } = action.payload;
            state.nodes[id].data.flexDirection = flexDirection;
            state.trayInformation[state.nodes[id].data.id] = state.nodes[id].data;
        },
        updateSelected(state, action) {
            const { id, checked } = action.payload;
            if (checked) {
                state.selectedId.push(id);
            }
            else {
                state.selectedId = state.selectedId.filter((vid) => vid != id);
            }
        },
        setRootId: (state, action) => {
            state.rootId = action.payload;
        },
        setEditingId: (state, action) => {
            state.editingId = action.payload;
        },
        setfocusingId: (state, action) => {
            state.focusingId = action.payload;
        },
        setContextMenuOpening: (state, action) => {
            state.contextMenuOpening = action.payload;
        },
        resetAllTray: (state) => {
            state.fromTo[state.rootId] = [];
        },
        moveFocus: (state, action) => {
            const { direction, visId } = action.payload;
            if (direction === "left") {
                const parentId = state.toFrom[visId][0];
                if (parentId && parentId !== "null") {
                    state.focusingId = parentId;
                }
            }
            else if (direction === "right") {
                const children = state.fromTo[visId];
                if (children && children.length > 0) {
                    state.focusingId = children[0];
                }
            }
            else if (direction === "upper" || direction === "lower") {
                const parentId = state.toFrom[visId][0];
                if (parentId && parentId !== "null") {
                    const siblings = state.fromTo[parentId];
                    const index = siblings.indexOf(visId);
                    if (direction === "upper" && index > 0) {
                        state.focusingId = siblings[index - 1];
                    }
                    else if (direction === "lower" && index < siblings.length - 1) {
                        state.focusingId = siblings[index + 1];
                    }
                }
            }
        },
    },
});
// アクションとリデューサーのエクスポート
export const { addNode: addTray, addEdge: addTrayEdge, removeEdge: removeTrayEdge, fetchNodeInfo: fetchTrayNodeInfo, updateNodeInfo: updateTrayNodeInfo, moveNode: moveTray, setRootId, setEditingId, setfocusingId, setContextMenuOpening, updateTrayFilename, updateTrayName, updateTrayURL, updateTraycolor, updateTrayVisFold, updateTrayFlex, updateSelected, moveFocus, resetAllTray, toggleFold, mergeGraph, } = trayGraphSlice.actions;
export default trayGraphSlice.reducer;
