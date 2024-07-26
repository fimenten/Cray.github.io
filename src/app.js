let hamburgerElements;

window.addEventListener('DOMContentLoaded', () => {

  let sessionId = getUrlParameter("sessionId");
  if (sessionId == "new"){
    let id = generateUUID();
    window.location.replace(window.location.href.replace("?sessionId=new","?sessionId="+id))
  }
  if (sessionId){
    loadFromLocalStorage(sessionId);
  }
  else{
    loadFromLocalStorage();
  }
  if (sessionId){
    const savedTitle = localStorage.getItem(sessionId+"_title");
    if (savedTitle) {
      document.title = savedTitle;
    }
   
  
  }


  const { leftBar } = createHamburgerMenu();
  document.body.insertBefore(leftBar, document.body.firstChild);
  const actionButtons = createActionButtons();
  document.body.appendChild(actionButtons);
  updateAllTrayDirections();
  window.addEventListener('resize', updateAllTrayDirections);
  getRootElement().focus();
});
function getUrlParameter(name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}
function updateAllTrayDirections() {
    const allTrays = document.querySelectorAll('.tray');
    allTrays.forEach(trayElement => {
        const trayInstance = trayElement.__trayInstance;
        if (trayInstance && typeof trayInstance.updateSplitDirection === 'function') {
            trayInstance.updateSplitDirection();
        }
    });
}

function createHamburgerMenu() {
  const leftBar = document.createElement('div');
  leftBar.classList.add('left-bar');
  document.body.appendChild(leftBar);  
  const hamburger = document.createElement('div');
  hamburger.classList.add('hamburger-menu');
  hamburger.innerHTML = '☰';
  // hamburger.style.position = 'fixed';
  // hamburger.style.top = '10px';
  // hamburger.style.right = '10px';
  // hamburger.style.fontSize = '24px';
  // hamburger.style.cursor = 'pointer';
  // hamburger.style.zIndex = '1000';
  // document.body.appendChild(hamburger);
  leftBar.appendChild(hamburger);

  const menu = document.createElement('div');
  menu.classList.add('hamburger-menu-items');
  menu.style.display = 'none';
  leftBar.appendChild(menu);
  menu.style.position = 'fixed';
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
  const menuItems = menu.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
      item.style.padding = '5px 10px';
      item.style.cursor = 'pointer';
      item.style.transition = 'background-color 0.3s';
  });

  hamburger.addEventListener('click', (event) => {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    if (menu.style.display === 'block') {
      const rect = leftBar.getBoundingClientRect();
      menu.style.left = `${rect.right}px`;
      menu.style.top = `${rect.top}px`;
    }
    event.stopPropagation();
  });

  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target) && event.target !== hamburger) {
      menu.style.display = 'none';
    }
  });

  menu.addEventListener('click', (event) => {
    const action = event.target.getAttribute('data-action');
    switch (action) {
      case 'reset':
        if (confirm('すべてのトレイをリセットしますか？この操作は元に戻せません。')) {
          resetAllTrays();
        }
        break;
      case 'save':
        saveCurrentState();
        break;
      case 'load':
        loadSavedState();
        break;
      case 'export':
        exportData();
        break;
      case 'import':
        importData();
        break;
      case "set_default_server":
        set_default_server()
        break;
      case "import_network_tray_directly_as_root":
        import_network_tray_directly_as_root();
        break
      case 'manageLabels':
        showLabelManager();
        break;
      case 'exportLabels':
        exportLabels();
        break;
      case 'importLabels':
        importLabels();
        break;
        case 'editTitle':
          editPageTitle();
          break;
          case 'uploadAll':
            uploadAllData();
            break;
    }
    menu.style.display = 'none';
  });

  // ホバー効果の追加
  menuItems.forEach(item => {
      item.addEventListener('mouseover', () => {
          item.style.backgroundColor = '#f0f0f0';
      });
      item.addEventListener('mouseout', () => {
          item.style.backgroundColor = 'transparent';
      });
  });

  return { hamburger, menu, leftBar };
}

function uploadAllData(tray = getRootElement().__trayInstance){
  if (tray.uploadData){
    tray.uploadData();
  }
  if (tray.children.length){
    tray.children.map(t=>uploadAllData(t))
  }
}
function downloadAllData(tray = getRootElement().__trayInstance){
  if (tray.downloadData){
    tray.ondownloadBottonPressed();
  }
  if (tray.children.length){
    tray.children.map(t=>downloadAllData(t))
  }
}
function editPageTitle() {
  const currentTitle = document.title;
  const newTitle = prompt("新しいページタイトルを入力してください:", currentTitle);
  if (newTitle !== null && newTitle.trim() !== "") {
    document.title = newTitle.trim();
    localStorage.setItem('pageTitle', newTitle.trim());
    notifyUser('ページタイトルを更新しました。');
  }
}
function import_network_tray_directly_as_root(){
  let url = prompt("server host?",localStorage.getItem("defaultServer"));
  let name = prompt("name?")
  let tray_data;
  fetch(`${url}/tray/load`, {
    method: 'GET',
    headers: {
      'filename': name
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    console.log(data);
    localStorage.setItem("downloaded_data", JSON.stringify(data));
    notifyUser('データのダウンロードに成功しました。');
    return data;
  })
  .catch(error => {
    console.error('Error:', error);
    notifyUser('データのダウンロードに失敗しました。');
  });
    document.body.innerHTML = "";

    loadFromLocalStorage("downloaded_data")
    saveToLocalStorage()
    hamburgerElements = createHamburgerMenu();
    updateAllTrayDirections();
    window.addEventListener('resize', updateAllTrayDirections);
  }


function resetAllTrays() {
    localStorage.removeItem('trayData');
    const rootTray = createDefaultRootTray();
    document.body.innerHTML = '';
    document.body.appendChild(rootTray.element);
    hamburgerElements = createHamburgerMenu();
}
function set_default_server(){
  let url = localStorage.getItem("defaultServer");
  url = prompt("set default URL",url)
  localStorage.setItem("defaultServer",url)
}
function saveCurrentState() {
    const currentState = localStorage.getItem('trayData');
    localStorage.setItem('savedTrayState', currentState);
    alert('現在の状態を保存しました。');
}

function loadSavedState() {
    const savedState = localStorage.getItem('savedTrayState');
    if (savedState) {
      localStorage.setItem('trayData', savedState);
      loadFromLocalStorage();
      alert('保存した状態を読み込みました。');
    } else {
      alert('保存された状態がありません。');
    }
}

function exportData() {
    const data = localStorage.getItem(TRAY_DATA_KEY);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tray_data.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = readerEvent => {
            try {
                const content = readerEvent.target.result;
                JSON.parse(content); // Validate JSON
                localStorage.setItem("imported_tray", content);



                notifyUser('データのインポートに成功しました。');
            } catch (error) {
                console.error('Invalid JSON file:', error);
                notifyUser('無効なJSONファイルです。');
            }
            try{
              document.body.innerHTML = "";
              loadFromLocalStorage("imported_tray")
              saveToLocalStorage()
              hamburgerElements = createHamburgerMenu();
              updateAllTrayDirections();
              window.addEventListener('resize', updateAllTrayDirections);
            } catch {console.error("failed to draw")}

        }
        reader.readAsText(file,'UTF-8');
    }
    input.click();
}

function uploadData(data, filename) {
  fetch('http://host.com:8080/tray/save', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'filename': filename
      },
      body: JSON.stringify({ data: JSON.parse(data) })
  })
  .then(response => {
      if (!response.ok) {
          throw new Error('Network response was not ok');
      }
      return response.text();
  })
  .then(result => {
      console.log(result);
      notifyUser('データのアップロードに成功しました。');
  })
  .catch(error => {
      console.error('Error:', error);
      notifyUser('データのアップロードに失敗しました。');
  });
}

function downloadData(filename) {
  fetch('http://host.com:8080/tray/load', {
      method: 'GET',
      headers: {
          'filename': filename
      }
  })
  .then(response => {
      if (!response.ok) {
          throw new Error('Network response was not ok');
      }
      return response.json();
  })
  .then(data => {
    // notifyUser('データのダウンロードに成功しました。');
    return data;
  })
  .catch(error => {
      console.error('Error:', error);
      notifyUser('データのダウンロードに失敗しました。');
  });
}


function showLabelManager() {
  const labelManager = document.createElement('div');
  labelManager.classList.add('label-manager');
  labelManager.innerHTML = `
    <h2>ラベル管理</h2>
    <div id="labelList"></div>
    <button id="addLabelBtn">新しいラベルを追加</button>
    <button id="closeLabelManagerBtn">閉じる</button>
  `;
  document.body.appendChild(labelManager);

  updateLabelList();

  document.getElementById('addLabelBtn').addEventListener('click', () => addNewLabel());
  document.getElementById('closeLabelManagerBtn').addEventListener('click', () => labelManager.remove());
}

function updateLabelList() {
  const labelList = document.getElementById('labelList');
  labelList.innerHTML = '';
  const labels = globalLabelManager.getAllLabels();
  for (const [id, label] of Object.entries(labels)) {
    const labelElement = document.createElement('div');
    labelElement.classList.add('label-item');
    labelElement.innerHTML = `
      <input type="text" class="label-name" value="${label.name}">
      <input type="color" class="label-color" value="${label.color}">
      <button class="deleteLabelBtn">削除</button>
    `;
    labelList.appendChild(labelElement);

    const nameInput = labelElement.querySelector('.label-name');
    const colorInput = labelElement.querySelector('.label-color');
    const deleteBtn = labelElement.querySelector('.deleteLabelBtn');

    nameInput.addEventListener('change', () => updateLabel(id, nameInput.value, colorInput.value));
    colorInput.addEventListener('change', () => updateLabel(id, nameInput.value, colorInput.value));
    deleteBtn.addEventListener('click', () => deleteLabel(id));
  }
}

function addNewLabel() {
  const id = Date.now().toString();
  globalLabelManager.addLabel(id, 'New Label', '#000000');
  updateLabelList();
}

function updateLabel(id, name, color) {
  globalLabelManager.addLabel(id, name, color);
}

function deleteLabel(id) {
  if (confirm('このラベルを削除してもよろしいですか？')) {
    delete globalLabelManager.labels[id];
    updateLabelList();
  }
}
function exportLabels() {
  const labelsJson = globalLabelManager.exportLabels();
  const blob = new Blob([labelsJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'labels.json';
  a.click();
}

function importLabels() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      globalLabelManager.importLabels(content);
      updateLabelList();
    };
    reader.readAsText(file);
  };
  input.click();
}

// Add this to the end of the window.addEventListener('DOMContentLoaded', ...) function
const actionButtons = createActionButtons();
document.body.appendChild(actionButtons);

// Add this new function
function createActionButtons() {
  const buttonContainer = document.createElement('div');
  buttonContainer.classList.add('action-buttons');

  const addButton = document.createElement('button');
  addButton.textContent = '+';
  addButton.classList.add('action-button', 'add-button');
  addButton.addEventListener('click', addNewTrayToParent);

  const insertButton = document.createElement('button');
  insertButton.textContent = '←';
  insertButton.classList.add('action-button', 'insert-button');
  insertButton.addEventListener('click', addNewTrayToFocused);

  buttonContainer.appendChild(addButton);
  buttonContainer.appendChild(insertButton);

  return buttonContainer;
}

function addNewTrayToParent() {
  const focusedElement = document.activeElement;
  const focusedTray = focusedElement.closest('.tray').__trayInstance;
  const parentTray = getTrayFromId(focusedTray.parentId);

  if (parentTray) {
    const newTray = new Tray(parentTray.id, Date.now().toString(), 'New Tray');
    parentTray.addChild(newTray);
    parentTray.isFolded = false;
    parentTray.updateAppearance();
    newTray.element.focus();
    const newTitleElement = newTray.element.querySelector('.tray-title');
    newTray.startTitleEdit(newTitleElement);
  }
}

function addNewTrayToFocused() {
  const focusedElement = document.activeElement;
  const focusedTray = focusedElement.closest('tray').__trayInstance;

  const newTray = new Tray(focusedTray.id, Date.now().toString(), 'New Tray');
  focusedTray.addChild(newTray);
  focusedTray.isFolded = false;
  focusedTray.updateAppearance();
  newTray.element.focus();
  const newTitleElement = newTray.element.querySelector('.tray-title');
  newTray.startTitleEdit(newTitleElement);
}