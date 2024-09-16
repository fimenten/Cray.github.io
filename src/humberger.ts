import { cloneTray, createDefaultRootTray, generateUUID, getRootElement } from "./utils";
import { exportData, importData } from "./io";
import { getUrlParameter } from "./utils";
import { element2TrayMap, Tray} from "./app";
import { downloadData, uploadData } from "./networks";
export let selected_trays:Tray[] = []

function resetAllTrays() {
  localStorage.removeItem("trayData");
  const rootTray = createDefaultRootTray();
  document.body.innerHTML = "";
  document.body.appendChild(rootTray.element);
  createHamburgerMenu();
}
export function createHamburgerMenu() {
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
    menu.innerHTML += `
    <div class="menu-item" data-action="copySelected">Copy selected</div>
    <div class="menu-item" data-action="cutSelected">Cut selected</div>

  `;

  document.body.appendChild(menu);

  // メニュー項目のスタイリング
  const menuItems: NodeListOf<HTMLElement> =
    menu.querySelectorAll(".menu-item");

  menuItems.forEach((item: HTMLElement) => {
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

  document.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    if (!menu.contains(target) && target !== hamburger) {
      menu.style.display = "none";
    }
  });

  menu.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const action = target.getAttribute("data-action");
    switch (action) {
      case "reset":
        if (
          confirm(
            "すべてのトレイをリセットしますか？この操作は元に戻せません。"
          )
        ) {
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
        exportData();
        break;
      case "import":
        importData();
        break;
      case "set_default_server":
        set_default_server();
        break;
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
      case "uploadAll":
        uploadAllData();
        break;
      case "downloadAll":
        downloadAllData();
        break;
      case "cutSelected":
        cutSelected()
        break
      case "copySelected":
        copySelected()
        break
      
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
  const newTitle = prompt(
    "新しいページタイトルを入力してください:",
    currentTitle
  );
  if (newTitle !== null && newTitle.trim() !== "") {
    document.title = newTitle.trim();
    const sessionId = getUrlParameter("sessionId");
    if (sessionId) {
      localStorage.setItem(sessionId + "_title", newTitle.trim());
      alert("ページタイトルを更新しました。");
    }
  }
}

// function updateAllTrayDirections() {
//   const allTrays = document.querySelectorAll(".tray");
//   allTrays.forEach((trayElement) => {
//     const trayInstance = trayElement.__trayInstance;
//     if (
//       trayInstance &&
//       typeof trayInstance.updateSplitDirection === "function"
//     ) {
//       trayInstance.updateSplitDirection();
//     }
//   });
// }

function uploadAllData(tray: null | Tray = null) {
  if (!tray) {
    tray = element2TrayMap.get(getRootElement() as HTMLDivElement) as Tray;
  }
  if (tray.host_url) {
    uploadData(tray);
  }
  if (tray.children.length) {
    tray.children.map((t) => uploadAllData(t));
  }
}
function downloadAllData(tray: null | Tray = null) {
  if (!tray) {
    tray = element2TrayMap.get(getRootElement() as HTMLDivElement) as Tray;
  }
  if (tray.host_url) {
    downloadData(tray);
  }
  if (tray.children.length) {
    tray.children.map((t) => downloadAllData(t));
  }
}

// function import_network_tray_directly_as_root() {
//   let url = prompt("server host?", localStorage.getItem("defaultServer"));
//   let name = prompt("name?");
//   let tray_data;
//   fetch(`${url}/tray/load`, {
//     method: "GET",
//     headers: {
//       filename: name,
//     },
//   })
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error("Network response was not ok");
//       }
//       return response.json();
//     })
//     .then((data) => {
//       console.log(data);
//       localStorage.setItem("downloaded_data", JSON.stringify(data));
//       notifyUser("データのダウンロードに成功しました。");
//       return data;
//     })
//     .catch((error) => {
//       console.error("Error:", error);
//       notifyUser("データのダウンロードに失敗しました。");
//     });
//   document.body.innerHTML = "";

//   loadFromLocalStorage("downloaded_data");
//   saveToLocalStorage();
//   hamburgerElements = createHamburgerMenu();
//   updateAllTrayDirections();
//   window.addEventListener("resize", updateAllTrayDirections);
// }

function set_default_server() {
  let url = localStorage.getItem("defaultServer");
  url = prompt("set default URL", url ? url : "");
  if (!url) {
    return;
  }
  localStorage.setItem("defaultServer", url);
}
// function set_secret() {
//   let secret = localStorage.getItem("secretKey");
//   secret = prompt("set secretKey", secret);
//   localStorage.setItem("secretKey", secret);
// }
function cutSelected(): void {
  if (selected_trays.length !== 0) {
    // Copy the selected trays
    const t = new Tray(generateUUID(), generateUUID(), "selected Trays");
    selected_trays.map(tt => t.children.push(cloneTray(tt)))
    t.copyTray();

    selected_trays.map(t => t.deleteTray())


    // Clear the selected_trays array
    selected_trays = [];

    // Uncheck all checkboxes
    const checkboxes: NodeListOf<HTMLInputElement> = document.querySelectorAll(".tray-checkbox");
    checkboxes.forEach((checkbox: HTMLInputElement) => {
      checkbox.checked = false;
    });
  }
}




function copySelected(): void {
  if (selected_trays.length !== 0) {
    // Copy the selected trays
    const t = new Tray(generateUUID(), generateUUID(), "selected Trays");
    selected_trays.map(tt => t.children.push(cloneTray(tt)))
    t.copyTray();

    // Clear the selected_trays array
    selected_trays = [];

    // Uncheck all checkboxes
    const checkboxes: NodeListOf<HTMLInputElement> = document.querySelectorAll(".tray-checkbox");
    checkboxes.forEach((checkbox: HTMLInputElement) => {
      checkbox.checked = false;
    });
  }
}