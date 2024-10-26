import { element2TrayMap } from "./app";
import { setLastFocused } from "./state";
import { Tray } from "./tray";
import store from "./store";

export function watchFocusedElement(): () => void {
    let lastFocusedElement: Element | null = document.activeElement;

    const intervalId = setInterval(() => {
        const currentFocusedElement = document.activeElement;

        if (currentFocusedElement !== lastFocusedElement) {
            lastFocusedElement = currentFocusedElement;

            // Execute focus-changed logic every time the focus changes
            if (!currentFocusedElement) return;
            
            const focusedTray = element2TrayMap.get(currentFocusedElement as HTMLDivElement);
            if (!focusedTray) return;

            store.dispatch(setLastFocused(focusedTray as Tray));
        }
    }, 10);

    // Return cleanup function to stop watching
    return () => clearInterval(intervalId);
}

// Usage

// Call stopWatching() to stop observing when no longer needed
// stopWatching();
