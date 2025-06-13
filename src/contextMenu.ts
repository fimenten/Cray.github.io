/* -----------------------------------------------------------
 *  contextMenu.ts ― コンテキストメニュー生成 & 操作
 *  2025-05-06 完全刷新版
 *  - メニュー DOM をシングルトンで再利用
 *  - 強制リフロー無し (transform で配置)
 *  - 累積イベントリスナー発生を防止
 * ---------------------------------------------------------- */

import { Tray } from "./tray";
import { fetchTrayList, setNetworkOption, removeDataFromServer } from "./networks";
import {
  meltTray,
  deleteTray,
  pasteFromClipboardInto,
  copyMarkdownToClipboard,
  downloadMarkdown,
} from "./functions";
import { serialize, saveToIndexedDB } from "./io";
import { cloneTray, expandChildrenOneLevel } from "./utils";

export interface ContextMenuItem {
  act: string;
  label: string;
}

export const CONTEXT_MENU_ITEMS: ContextMenuItem[] = [
  { act: "fetchTrayFromServer", label: "Fetch Tray from Server" },
  { act: "networkSetting", label: "Network Setting" },
  { act: "removeFromServer", label: "Remove from Server" },
  { act: "openTrayInOther", label: "Open This in Other" },
  { act: "toggleFlexDirection", label: "Toggle Flex Direction" },
  { act: "insertParentTray", label: "Insert Parent Tray" },
  { act: "insertChildTray", label: "Insert Child Tray" },
  { act: "meltTray", label: "Melt this Tray" },
  { act: "expandAll", label: "Expand All" },
  { act: "expandChildrenOneLevel", label: "Expand Children 1 Level" },
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
  { act: "copyMarkdown", label: "Copy Markdown" },
  { act: "downloadMarkdown", label: "Download Markdown" },
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
export function openContextMenu(tray: Tray, ev: MouseEvent | TouchEvent | { clientX: number; clientY: number }) {
  // ――― HMR や再描画で切れていたら付け直す ―――
  if (!menu.isConnected) document.body.appendChild(menu);

  menu.style.display = "block";   // ← 先に表示
  position(ev, menu);             // 幅・高さが 0 で計算されるのを防ぐ
  hydrateMenu(tray);
  menu.focus();
  setupKeyboardNavigation(tray);

  console.log("openContextMenu OK")

  const closeOnce = (e: PointerEvent) => {
    if (!menu.contains(e.target as Node)) {
      closeContextMenu();
      document.removeEventListener("pointerdown", closeOnce);
    }
  };
  document.addEventListener("pointerdown", closeOnce);
}

export function openContextMenuKeyboard(tray: Tray) {
  const rect = tray.element.getBoundingClientRect();
  const dummy = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 } as MouseEvent;
  openContextMenu(tray, dummy);
}


export function closeContextMenu() {
  menu.style.display = "none";
  if (keyHandler) {
    menu.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
  menu.querySelectorAll<HTMLElement>(".menu-item").forEach((el) =>
    el.classList.remove("focused")
  );
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

let keyHandler: ((e: KeyboardEvent) => void) | null = null;
function setupKeyboardNavigation(tray: Tray) {
  const items = Array.from(menu.querySelectorAll<HTMLElement>(".menu-item"));
  let index = 0;

  const focusItem = (i: number) => {
    items.forEach((el) => el.classList.remove("focused"));
    const item = items[i];
    item.classList.add("focused");
    (item as HTMLElement).focus?.();
  };

  focusItem(index);

  keyHandler = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        index = (index + 1) % items.length;
        focusItem(index);
        break;
      case "ArrowUp":
        e.preventDefault();
        index = (index - 1 + items.length) % items.length;
        focusItem(index);
        break;
      case "Enter":
        e.preventDefault();
        items[index].click();
        break;
      case "Escape":
        e.preventDefault();
        closeContextMenu();
        break;
    }
  };

  menu.addEventListener("keydown", keyHandler);
}

function position(ev: MouseEvent | TouchEvent | { clientX: number; clientY: number }, el: HTMLElement) {
  // ① クリック座標
  const pt =
    'clientX' in ev
      ? { x: (ev as any).clientX, y: (ev as any).clientY }
      : { x: (ev as TouchEvent).touches[0].clientX, y: (ev as TouchEvent).touches[0].clientY };

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
    case "expandChildrenOneLevel":
      expandChildrenOneLevel(tray);
      break;

    case "toggleFlexDirection":
      tray.toggleFlexDirection?.();
      break;

    case "insertParentTray":
      tray.insertParentTray?.();
      break;

    case "insertChildTray":
      tray.insertChildTray?.();
      break;


    case "copyMarkdown":
      copyMarkdownToClipboard(tray);
      break;

    case "downloadMarkdown":
      downloadMarkdown(tray);
      break;

    case "fetchTrayFromServer":
      fetchTrayList(tray);
      break;

    case "removeFromServer":
      if (confirm("Are you sure you want to remove this tray from the server?")) {
        removeDataFromServer(tray);
      }
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
