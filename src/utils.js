const ROOT_TRAY_SELECTOR = '.tray[data-tray-id="0"]';
const TRAY_DATA_KEY = 'trayData';
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Usage
console.log(generateUUID());
function getRootElement() {
  return document.querySelector(ROOT_TRAY_SELECTOR);
}

function updateAllTrayDirections() {
  document.querySelectorAll('.tray.split').forEach(trayElement => {
    const trayInstance = trayElement.__trayInstance;
    if (trayInstance) {
      trayInstance.updateSplitDirection();
    }
  });
}

function observeAndSaveChanges() {
  const rootElement = getRootElement();
  observeDOMChanges(rootElement);
  observeWindowResize();
}

function notifyUser(message) {
  alert(message);
}

function observeWindowResize() {
  window.addEventListener('resize', () => {
    updateAllTrayDirections();
    saveToLocalStorage();
  });
}

function saveToLocalStorage() {
  try {
    const rootElement = getRootElement();
    if (!rootElement) {
      console.error('Root element not found');
      return;
    }
    const data = serializeDOM(rootElement.__trayInstance);
    const serializedData = JSON.stringify(data);
    
    localStorage.setItem(TRAY_DATA_KEY, serializedData);
    console.log('Data saved successfully');
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

function serializeDOM(tray) {
  return tray.serialize()
}

function loadFromLocalStorage() {
  try {
    const savedData = localStorage.getItem(TRAY_DATA_KEY);
    let rootTray;
    console.log(savedData);
    if (savedData) {
      const data = JSON.parse(savedData);
      rootTray = deserializeDOM(data);
    } else {
      rootTray = createDefaultRootTray();
    }

    document.body.innerHTML = '';
    document.body.appendChild(rootTray.element);
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    const rootTray = createDefaultRootTray();
    document.body.innerHTML = '';
    document.body.appendChild(rootTray.element);
  }
}

function deserializeDOM(data) {
    let tray;

    if (data.host_url == null) {
      tray = new Tray(
        data.parentId, 
        data.id, 
        data.name, 
        [],
        data.borderColor, 
        data.labels, 
        data.isChecked
      );
    } else {
      tray = new NetworkTray(
        data.parentId, 
        data.id, 
        data.name, 
        [],
        data.borderColor, 
        data.labels, 
        data.isChecked,
        data.host_url,
        data.filename
      );
    }
    let children = data.children.length ? data.children.map(d => deserialize(d)) : []; 
    children.forEach(childTray => {
      tray.addChild(childTray)
    });
    console.log(children)

    children.forEach(childTray => {
      tray.addChild(childTray)

    });
    tray.foldChildren()
    tray.updateAppearance()

    tray.isSplit = data.isSplit;
    tray.flexDirection = data.flexDirection || 'column';
    tray.updateFlexDirection();
  
    if (tray.isSplit) {
      tray.element.classList.add('split');
      tray.updateSplitDirection();
    }
    tray.foldChildren()  
    tray.updateAppearance()
  
  
    return tray;
}

function createDefaultRootTray() {
  const rootTray = new Tray("0", '0', 'Root Tray');
  const content = rootTray.element.querySelector('.tray-content');

  const tray1 = new Tray(rootTray.id, generateUUID(), 'ToDo');
  const tray2 = new Tray(rootTray.id, generateUUID(), 'Doing');
  const tray3 = new Tray(rootTray.id, generateUUID(), 'Done');

  rootTray.addChild(tray1);
  rootTray.addChild(tray2);
  rootTray.addChild(tray3);

  // content.appendChild(tray1.element);
  // content.appendChild(tray2.element);
  // content.appendChild(tray3.element);

  return rootTray;
}