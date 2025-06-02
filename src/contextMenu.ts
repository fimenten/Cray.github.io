/* -----------------------------------------------------------
 *  contextMenu.ts ― コンテキストメニュー生成 & 操作
 *  2025-05-06 完全刷新版
 *  - メニュー DOM をシングルトンで再利用
 *  - 強制リフロー無し (transform で配置)
 *  - 累積イベントリスナー発生を防止
 * ---------------------------------------------------------- */

import { Tray } from "./tray";
import { fetchTrayList, setNetworkOption } from "./networks";
import {
  meltTray,
  deleteTray,
  pasteFromClipboardInto,
  showMarkdownOutput,
} from "./functions";
import { serialize, saveToIndexedDB } from "./io";
import { cloneTray } from "./utils";

export interface ContextMenuItem {
  act: string;
  label: string;
}

export const CONTEXT_MENU_ITEMS: ContextMenuItem[] = [
  { act: "fetchTrayFromServer", label: "Fetch Tray from Server" },
  { act: "networkSetting", label: "Network Setting" },
  { act: "openTrayInOther", label: "Open This in Other" },
  { act: "toggleFlexDirection", label: "Toggle Flex Direction" },
  { act: "meltTray", label: "Melt this Tray" },
  { act: "expandAll", label: "Expand All" },
  { act: "copy", label: "Copy" },
  { act: "paste", label: "Paste" },
  { act: "cut", label: "Cut" },
  { act: "delete", label: "Remove" },
  {
    act: "add_fetch_networkTray_to_child",
    label: "Add Fetch NetworkTray to Child",
  },
  { act: "add_child_from_localStorage", label: "Add Child from Local Storage" },
  { act: "addProperty", label: "Set Property" },
  { act: "sortChildren", label: "Sort Children" },
  { act: "outputMarkdown", label: "Output as Markdown" },
];

function showSortDialog(tray: Tray) {
  const propSet = new Set<string>();
  propSet.add("created_dt");
  tray.children.forEach((c) => {
    Object.keys(c.properties).forEach((k) => propSet.add(k));
  });

  const dialog = document.createElement("div");
  dialog.classList.add("sort-selection-dialog");
  dialog.innerHTML = `
      <h3>Sort Children</h3>
      <label>Property:
        <select id="sort-prop">
          ${Array.from(propSet)
            .map((p) => `<option value="${p}">${p}</option>`)
            .join("")}
        </select>
      </label>
      <label>Order:
        <select id="sort-order">
          <option value="asc" selected>Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </label>
      <button id="sort-ok">Sort</button>
      <button id="sort-cancel">Cancel</button>
    `;

  document.body.appendChild(dialog);

  const okBtn = dialog.querySelector<HTMLButtonElement>("#sort-ok")!;
  const cancelBtn = dialog.querySelector<HTMLButtonElement>("#sort-cancel")!;

  okBtn.addEventListener("click", () => {
    const prop = (dialog.querySelector("#sort-prop") as HTMLSelectElement).value;
    const order = (dialog.querySelector("#sort-order") as HTMLSelectElement).value;
    tray.sortChildren(prop, order === "desc");
    dialog.remove();
  });

  cancelBtn.addEventListener("click", () => dialog.remove());
}

// ===== メニュー DOM を 1 回だけ生成 =====
const menu: HTMLElement = buildMenu();
document.body.appendChild(menu);
menu.style.display = "none";       // 初期は非表示

// -- ビルド関数 --------------------------------------------------
export function buildMenu(): HTMLElement {
  const el = document.createElement("div");
  el.className = "context-menu";
  el.tabIndex = -1; // フォーカス可

  for (const item of CONTEXT_MENU_ITEMS) {
    const div = document.createElement("div");
    div.className = "menu-item";
    if (!("dataset" in div)) {
      (div as any).dataset = {};
    }
    (div as any).dataset.act = item.act;
    div.textContent = item.label;
    el.appendChild(div);
  }

  const colorDiv = document.createElement("div");
  colorDiv.className = "menu-item";
  const picker = document.createElement("input");
  picker.type = "color";
  picker.id = "borderColorPicker";
  colorDiv.appendChild(picker);
  el.appendChild(colorDiv);

  return el;
}


// ===== パブリック API ==========================================
export function openContextMenu(tray: Tray, ev: MouseEvent | TouchEvent) {
  // ――― HMR や再描画で切れていたら付け直す ―――
  if (!menu.isConnected) document.body.appendChild(menu);

  menu.style.display = "block";   // ← 先に表示
  position(ev, menu);             // 幅・高さが 0 で計算されるのを防ぐ
  hydrateMenu(tray);
  menu.focus();

  console.log("openContextMenu OK")

  const closeOnce = (e: PointerEvent) => {
    if (!menu.contains(e.target as Node)) {
      closeContextMenu();
      document.removeEventListener("pointerdown", closeOnce);
    }
  };
  document.addEventListener("pointerdown", closeOnce);
}


export function closeContextMenu() {
  menu.style.display = "none";
}

// ===== 内部ヘルパ ==============================================
function hydrateMenu(tray: Tray) {
  // カラーピッカー
  const picker = menu.querySelector<HTMLInputElement>("#borderColorPicker")!;
  picker.value = tray.borderColor ?? "#ffffff";
  picker.onchange = (e) => {
    const v = (e.target as HTMLInputElement).value;
    tray.borderColor = v;
    tray.changeBorderColor?.(v);
    closeContextMenu();
  };

  // メニュークリック → Action 実行
  menu.onclick = (e) => {
    const target = e.target as HTMLElement;
    const act = target.getAttribute("data-act");
    if (act) executeMenuAction(tray, act);
  };
}

function position(ev: MouseEvent | TouchEvent, el: HTMLElement) {
  // ① クリック座標
  const pt =
    ev instanceof MouseEvent
      ? { x: ev.clientX, y: ev.clientY }
      : { x: ev.touches[0].clientX, y: ev.touches[0].clientY };

  // ② メニュー寸法（表示前に display:block 済み）
  const { width, height } = el.getBoundingClientRect();

  // ③ 画面内に収める
  let left = pt.x + width  > window.innerWidth  ? pt.x - width  : pt.x;
  let top  = pt.y + height > window.innerHeight ? pt.y - height : pt.y;

  left = Math.max(0, left);
  top  = Math.max(0, top);

  // ④ 直接 left/top を書き込む
  el.style.position = "fixed";      // 念押し
  el.style.left = `${left}px`;
  el.style.top  = `${top}px`;
  el.style.transform = "";          // transform はクリア
}


// ===== アクションディスパッチ =================================
function executeMenuAction(tray: Tray, act: string) {
  switch (act) {
    case "copy":
      navigator.clipboard.writeText(serialize(cloneTray(tray)));
      break;

    case "paste":
      pasteFromClipboardInto(tray)
      break;

    case "cut":
      navigator.clipboard.writeText(serialize(cloneTray(tray)));
      deleteTray(tray);
      break;

    case "delete":
      deleteTray(tray);
      break;

    case "networkSetting":
      setNetworkOption(tray);
      break;

    case "meltTray":
      meltTray(tray);
      break;

    // case "expandAll":
    //   expandAll(tray);
    //   break;

    case "toggleFlexDirection":
      tray.toggleFlexDirection?.();
      break;


    case "outputMarkdown":
      showMarkdownOutput(tray)
      break;

    case "fetchTrayFromServer":
      fetchTrayList(tray);
      break;

    case "addProperty": {
      const key = prompt("Property name:", "priority") || "priority";
      const value = prompt(`Value for '${key}':`, "");
      if (value !== null) {
        tray.addProperty(key, value);
      }
      break;
    }

    case "sortChildren": {
      showSortDialog(tray);
      break;
    }

    // case "openTrayInOther":
      // openTrayInOther(tray);
      // break;

    // ↓ 必要に応じて追加
    // case "add_fetch_networkTray_to_child":
    // case "add_child_from_localStorage":
    //   tray.handleCustomAction?.(act);
    //   break;

    default:
      console.warn(`Unknown context-menu action: ${act}`);
  }

  // 共有ストレージの永続化など
  saveToIndexedDB?.();
  closeContextMenu();
}

/* ===== 推奨 CSS (参考) =========================================
.context-menu {
  position: fixed;
  z-index: 10000;
  padding: 4px 0;
  background: #1e1e1e;
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  user-select: none;
  will-change: transform;
  contain: layout;
}
.context-menu .menu-item {
  padding: 4px 16px;
  white-space: nowrap;
  cursor: pointer;
}
.context-menu .menu-item:hover {
  background: #3c3c3c;
}
============================================================== */
