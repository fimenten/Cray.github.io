import { createSlice } from "@reduxjs/toolkit";
const initialState = {
    lastFocused: null,
    menuOpening: false,
    autoUpload: false,
};
const appSlice = createSlice({
    name: "app",
    initialState,
    reducers: {
        setLastFocused(state, action) {
            // console.log(action)
            const id = action.payload.id;
            if (id) {
                state.lastFocused = action.payload.id;
            }
        },
        toggleMenuOpening(state) {
            state.menuOpening = !state.menuOpening;
        },
        openMenu(state) {
            state.menuOpening = true;
        },
        closeMenu(state) {
            state.menuOpening = false;
        },
        toggleAutoUpload(state) {
            state.autoUpload = !state.autoUpload;
        },
    },
});
export const { setLastFocused, toggleMenuOpening, openMenu, closeMenu, toggleAutoUpload, } = appSlice.actions;
export default appSlice.reducer;
