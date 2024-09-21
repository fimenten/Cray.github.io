import { Tray} from "./app";
import { getTrayFromId } from "./utils";

export function meltTray(tray:Tray){
    const parentTray = getTrayFromId(tray.parentId) as Tray;
    tray.children.map(t=>{parentTray.addChild(t)})
}