window.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    createHamburgerMenu();
    updateAllTrayDirections();
    window.addEventListener('resize', updateAllTrayDirections);
    getTrayFromId("root").element.focus();

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
    document.body.appendChild(hamburger);
  
    const menu = document.createElement('div');
    menu.classList.add('hamburger-menu-items');
    menu.style.display = 'none';
    menu.innerHTML = `
      <div class="menu-item" data-action="reset">トレイをリセット</div>
      <div class="menu-item" data-action="save">現在の状態を保存</div>
      <div class="menu-item" data-action="load">保存した状態を読み込む</div>
      <div class="menu-item" data-action="export">データのエクスポート</div>
      <div class="menu-item" data-action="import">データのインポート</div>
    `;
    document.body.appendChild(menu);
  
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
}

function resetAllTrays() {
    localStorage.removeItem('trayData');
    const rootTray = createDefaultRootTray();
    document.body.innerHTML = '';
    document.body.appendChild(rootTray.element);
    // observeAndSaveChanges();
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
    //   observeAndSaveChanges();
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
                localStorage.setItem('trayData', content);
                loadFromLocalStorage();
                notifyUser('データのインポートに成功しました。');
            } catch (error) {
                console.error('Invalid JSON file:', error);
                notifyUser('無効なJSONファイルです。');
            }
        }
        reader.readAsText(file,'UTF-8');
    }
    input.click();
}