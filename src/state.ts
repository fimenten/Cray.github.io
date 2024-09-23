import { createSlice,PayloadAction } from "@reduxjs/toolkit";
import { Tray } from "./tray";

interface AppState {
    lastFocused: string|null;
    menuOpening: boolean;
  }
  
  const initialState: AppState = {
    lastFocused: null,
    menuOpening: false,
  };
  
  const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
      setLastFocused(state, action: PayloadAction<Tray>) {
        state.lastFocused = action.payload.id
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
    },
  });
  
  export const { setLastFocused, toggleMenuOpening, openMenu, closeMenu } = appSlice.actions;
  export default appSlice.reducer;