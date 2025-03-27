import { configureStore } from "@reduxjs/toolkit";
import state from "./state";
// Configure the store with your reducers
const store = configureStore({
    reducer: {
        app: state, // Add your app slice here
        // Add other reducers here if needed in the future
    },
});
export default store;
