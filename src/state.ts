import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Tray } from "./tray";

interface AppState {
  lastFocused: string | null;
  menuOpening: boolean;
  autoUpload: boolean;
}

const initialState: AppState = {
  lastFocused: null,
  menuOpening: false,
  autoUpload: false,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setLastFocused(state, action: PayloadAction<Tray>) {
      const { id } = action.payload;
      if (id) {
        state.lastFocused = id; // Directly use id
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

export const {
  setLastFocused,
  toggleMenuOpening,
  openMenu,
  closeMenu,
  toggleAutoUpload,
} = appSlice.actions;

export default appSlice.reducer;
