import { PayloadAction } from "@reduxjs/toolkit";

// Nodeインターフェースをジェネリクス対応に
export interface Vertex<T = string> {
  id: T;
}

export interface DiGraph<T extends Vertex> {
  nodes: Record<string, T>;
  fromTo: Record<string, string[]>;
  toFrom: Record<string, string[]>;
  nodeInfo: {
    information: Record<string, Record<string, any>>;
  };
}
export interface Tree<T extends Vertex> extends DiGraph<T> {}

export const getParent = <T extends Vertex>(state: DiGraph<T>, action: T) => {
  return state.toFrom[action.id];
};

export const getChildren = <T extends Vertex>(state: DiGraph<T>, action: T) => {
  return state.fromTo[action.id];
};

export const moveNode = <T extends Vertex>(
  state: DiGraph<T>,
  action: PayloadAction<{ newParent: T; dropped: T }>,
) => {
  const { newParent, dropped } = action.payload;

  const parentOfDropped = getParent(state, dropped)[0];

  if (parentOfDropped) {
    state.fromTo[parentOfDropped] = state.fromTo[parentOfDropped].filter(
      (childId) => childId !== dropped.id,
    );
  }

  if (!state.fromTo[newParent.id]) {
    state.fromTo[newParent.id] = [];
  }
  state.fromTo[newParent.id].push(dropped.id);

  state.toFrom[dropped.id] = [newParent.id];
};

export const addNode = <T extends Vertex>(
  state: DiGraph<T>,
  action: PayloadAction<T>,
) => {
  state.nodes[action.payload.id] = action.payload;
  if (!state.fromTo[action.payload.id]) {
    state.fromTo[action.payload.id] = [];
  }
};

export const addEdge = <T extends Vertex>(
  state: DiGraph<T>,
  action: PayloadAction<{ from: string; to: string }>,
) => {
  const { from, to } = action.payload;
  if (!state.fromTo[to]) {
    state.fromTo[to] = [];
  }
  if (!state.toFrom[to]) {
    state.toFrom[to] = [];
  }
  state.fromTo[from].push(to);
  state.toFrom[to].push(from);
};

export const removeEdge = <T extends Vertex>(
  state: DiGraph<T>,
  action: PayloadAction<{ from: string; to: string }>,
) => {
  const { from, to } = action.payload;
  if (state.fromTo[from]) {
    state.fromTo[from] = state.fromTo[from].filter((target) => target !== to);
  }
  if (state.toFrom[to]) {
    state.toFrom[to] = state.toFrom[to].filter((source) => source !== from);
  }
};

export const updateNodeInfo = <T extends Vertex>(
  state: DiGraph<T>,
  action: PayloadAction<{ id: string; key: string; info: any }>,
) => {
  const { id, key, info } = action.payload;
  if (!state.nodeInfo.information[id]) {
    state.nodeInfo.information[id] = {};
  }
  state.nodeInfo.information[id][key] = info;
};

export const fetchNodeInfo = <T extends Vertex>(
  state: DiGraph<T>,
  action: PayloadAction<{ id: string; key: string }>,
) => {
  const { id, key } = action.payload;
  return state.nodeInfo.information[id]
    ? state.nodeInfo.information[id][key]
    : null;
};
