let hamburgerElements;

window.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    hamburgerElements = createHamburgerMenu();
    updateAllTrayDirections();
    window.addEventListener('resize', updateAllTrayDirections);
    getTrayFromId("0").element.focus();
});

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
  const hamburger = document.createElement('div');
  hamburger.classList.add('hamburger-menu');
  hamburger.innerHTML = '☰';
  hamburger.style.position = 'fixed';
  hamburger.style.top = '10px';
  hamburger.style.right = '10px';
  hamburger.style.fontSize = '24px';
  hamburger.style.cursor = 'pointer';
  hamburger.style.zIndex = '1000';
  document.body.appendChild(hamburger);

  const menu = document.createElement('div');
  menu.classList.add('hamburger-menu-items');
  menu.style.display = 'none';
  menu.style.position = 'fixed';
  menu.style.top = '40px';
  menu.style.right = '10px';
  menu.style.backgroundColor = 'white';
  menu.style.border = '1px solid #ccc';
  menu.style.borderRadius = '4px';
  menu.style.padding = '10px';
  menu.style.zIndex = '999';
  menu.innerHTML = `
    <div class="menu-item" data-action="reset">トレイをリセット</div>
    <div class="menu-item" data-action="save">現在の状態を保存</div>
    <div class="menu-item" data-action="load">保存した状態を読み込む</div>
    <div class="menu-item" data-action="export">データのエクスポート</div>
    <div class="menu-item" data-action="import">データのインポート</div>
  `;
  document.body.appendChild(menu);

  // メニュー項目のスタイリング
  const menuItems = menu.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
      item.style.padding = '5px 10px';
      item.style.cursor = 'pointer';
      item.style.transition = 'background-color 0.3s';
  });

  hamburger.addEventListener('click', () => {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
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

  return { hamburger, menu };
}

function resetAllTrays() {
    localStorage.removeItem('trayData');
    const rootTray = createDefaultRootTray();
    document.body.innerHTML = '';
    document.body.appendChild(rootTray.element);
    hamburgerElements = createHamburgerMenu();
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
    const data = localStorage.getItem('trayData');
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