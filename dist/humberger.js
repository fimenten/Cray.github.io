"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHamburgerMenu = createHamburgerMenu;
const utils_1 = require("./utils");
const io_1 = require("./io");
const utils_2 = require("./utils");
function resetAllTrays() {
    localStorage.removeItem("trayData");
    const rootTray = (0, utils_1.createDefaultRootTray)();
    document.body.innerHTML = "";
    document.body.appendChild(rootTray.element);
    let hamburgerElements = createHamburgerMenu();
}
function createHamburgerMenu() {
    const leftBar = document.createElement("div");
    leftBar.classList.add("left-bar");
    document.body.appendChild(leftBar);
    const hamburger = document.createElement("div");
    hamburger.classList.add("hamburger-menu");
    hamburger.innerHTML = "☰";
    // hamburger.style.position = 'fixed';
    // hamburger.style.top = '10px';
    // hamburger.style.right = '10px';
    // hamburger.style.fontSize = '24px';
    // hamburger.style.cursor = 'pointer';
    // hamburger.style.zIndex = '1000';
    // document.body.appendChild(hamburger);
    leftBar.appendChild(hamburger);
    const menu = document.createElement("div");
    menu.classList.add("hamburger-menu-items");
    menu.style.display = "none";
    leftBar.appendChild(menu);
    menu.style.position = "fixed";
    // menu.style.top = '40px';
    // menu.style.right = '10px';
    // menu.style.backgroundColor = 'white';
    // menu.style.border = '1px solid #ccc';
    // menu.style.borderRadius = '4px';
    // menu.style.padding = '10px';
    // menu.style.zIndex = '999';
    menu.innerHTML = `
        <div class="menu-item" data-action="reset">トレイをリセット</div>
        <div class="menu-item" data-action="save">現在の状態を保存</div>
        <div class="menu-item" data-action="load">保存した状態を読み込む</div>
        <div class="menu-item" data-action="export">データのエクスポート</div>
        <div class="menu-item" data-action="import">データのインポート</div>
        <div class="menu-item" data-action="set_default_server">set_default_server</div>
        <div class="menu-item" data-action="set_secret">set_secret</div>
        <div class="menu-item" data-action="import_network_tray_directly_as_root">import_network_tray_directly_as_root</div>
    
    
      `;
    menu.innerHTML += `
      <div class="menu-item" data-action="manageLabels">ラベル管理</div>
      <div class="menu-item" data-action="exportLabels">ラベルをエクスポート</div>
      <div class="menu-item" data-action="importLabels">ラベルをインポート</div>
    `;
    menu.innerHTML += `
      <div class="menu-item" data-action="editTitle">ページタイトルを編集</div>
    `;
    menu.innerHTML += `
      <div class="menu-item" data-action="uploadAll">Upload All</div>
    `;
    menu.innerHTML += `
      <div class="menu-item" data-action="downloadAll">Download All</div>
    `;
    document.body.appendChild(menu);
    // メニュー項目のスタイリング
    const menuItems = menu.querySelectorAll(".menu-item");
    menuItems.forEach((item) => {
        item.style.padding = "5px 10px";
        item.style.cursor = "pointer";
        item.style.transition = "background-color 0.3s";
    });
    hamburger.addEventListener("click", (event) => {
        menu.style.display = menu.style.display === "none" ? "block" : "none";
        if (menu.style.display === "block") {
            const rect = leftBar.getBoundingClientRect();
            menu.style.left = `${rect.right}px`;
            menu.style.top = `${rect.top}px`;
        }
        event.stopPropagation();
    });
    document.addEventListener("click", (event) => {
        const target = event.target;
        if (!menu.contains(target) && target !== hamburger) {
            menu.style.display = "none";
        }
    });
    menu.addEventListener("click", (event) => {
        const target = event.target;
        const action = target.getAttribute("data-action");
        switch (action) {
            case "reset":
                if (confirm("すべてのトレイをリセットしますか？この操作は元に戻せません。")) {
                    resetAllTrays();
                }
                break;
            //   case "save":
            //     saveCurrentState();
            //     break;
            // case "load":
            //   loadSavedState();
            //   break;
            case "export":
                (0, io_1.exportData)();
                break;
            case "import":
                (0, io_1.importData)();
                break;
            //   case "set_default_server":
            //     set_default_server();
            //     break;
            //   case "set_secret":
            //     set_secret();
            //   case "import_network_tray_directly_as_root":
            //     import_network_tray_directly_as_root();
            //     break;
            //   case "manageLabels":
            //     showLabelManager();
            //     break;
            //   case "exportLabels":
            //     exportLabels();
            //     break;
            //   case "importLabels":
            //     importLabels();
            //     break;
            case "editTitle":
                editPageTitle();
                break;
            //   case "uploadAll":
            //     uploadAllData();
            //     break;
        }
        menu.style.display = "none";
    });
    // ホバー効果の追加
    menuItems.forEach((item) => {
        item.addEventListener("mouseover", () => {
            item.style.backgroundColor = "#f0f0f0";
        });
        item.addEventListener("mouseout", () => {
            item.style.backgroundColor = "transparent";
        });
    });
    return { hamburger, menu, leftBar };
}
function editPageTitle() {
    const currentTitle = document.title;
    const newTitle = prompt("新しいページタイトルを入力してください:", currentTitle);
    if (newTitle !== null && newTitle.trim() !== "") {
        document.title = newTitle.trim();
        const sessionId = (0, utils_2.getUrlParameter)("sessionId");
        if (sessionId) {
            localStorage.setItem(sessionId + "_title", newTitle.trim());
            alert("ページタイトルを更新しました。");
        }
    }
}
