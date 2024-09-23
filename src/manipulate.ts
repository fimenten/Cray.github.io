import {Tray} from "./tray"
import {getTrayFromId} from "./utils"
// export function addNewTrayToParent(last_focused:Tray) {

//     const parentTray = getTrayFromId(last_focused.parentId);
  
//     if (parentTray) {
//       const newTray = new Tray(parentTray.id, Date.now().toString(), "New Tray");
//       parentTray.addChild(newTray);
//       parentTray.isFolded = false;
//       parentTray.updateAppearance();
//       newTray.element.focus();
//       const newTitleElement = newTray.element.querySelector(
//         ".tray-title"
//       ) as HTMLDivElement;
//       newTray.startTitleEdit(newTitleElement);
//     }
//   }
  
// export function addNewTrayToFocused(last_focused:Tray) {
 
//     const newTray = new Tray(last_focused.id, Date.now().toString(), "New Tray");
//     last_focused.addChild(newTray);
//     last_focused.isFolded = false;
//     last_focused.updateAppearance();
//     newTray.element.focus();
//     const newTitleElement = newTray.element.querySelector(
//       ".tray-title"
//     ) as HTMLDivElement;
//     newTray.startTitleEdit(newTitleElement);
//   }
  