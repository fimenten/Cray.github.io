export const getParent = (state, action) => {
    return state.toFrom[action.id];
};
export const getChildren = (state, action) => {
    return state.fromTo[action.id];
};
export const moveNode = (state, action) => {
    const { newParent, dropped } = action.payload;
    const parentOfDropped = getParent(state, dropped)[0];
    if (parentOfDropped) {
        state.fromTo[parentOfDropped] = state.fromTo[parentOfDropped].filter((childId) => childId !== dropped.id);
    }
    if (!state.fromTo[newParent.id]) {
        state.fromTo[newParent.id] = [];
    }
    state.fromTo[newParent.id].push(dropped.id);
    state.toFrom[dropped.id] = [newParent.id];
};
export const addNode = (state, action) => {
    state.nodes[action.payload.id] = action.payload;
    if (!state.fromTo[action.payload.id]) {
        state.fromTo[action.payload.id] = [];
    }
};
export const addEdge = (state, action) => {
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
export const removeEdge = (state, action) => {
    const { from, to } = action.payload;
    if (state.fromTo[from]) {
        state.fromTo[from] = state.fromTo[from].filter((target) => target !== to);
    }
    if (state.toFrom[to]) {
        state.toFrom[to] = state.toFrom[to].filter((source) => source !== from);
    }
};
export const updateNodeInfo = (state, action) => {
    const { id, key, info } = action.payload;
    if (!state.nodeInfo.information[id]) {
        state.nodeInfo.information[id] = {};
    }
    state.nodeInfo.information[id][key] = info;
};
export const fetchNodeInfo = (state, action) => {
    const { id, key } = action.payload;
    return state.nodeInfo.information[id]
        ? state.nodeInfo.information[id][key]
        : null;
};
