const ROOT_TRAY_SELECTOR = '.tray[data-tray-id="root"]';
const TRAY_DATA_KEY = 'trayData';

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

function observeDOMChanges(element) {
  const observer = new MutationObserver(() => {
    setTimeout(saveToLocalStorage, 500);
  });

  const config = { 
    attributes: true, 
    childList: true, 
    characterData: true,
    subtree: true 
  };

  observer.observe(element, config);
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
    
    if (serializedData.length > 5000000) {
      console.warn('Data size exceeds 5MB, may not save properly');
    }
    
    localStorage.setItem(TRAY_DATA_KEY, serializedData);
    console.log('Data saved successfully');
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    notifyUser('Failed to save data. Please try again.');
  }
}

function serializeDOM(tray) {
  return {
    id: tray.id,
    name: tray.name,
    labels: tray.labels,
    isSplit: tray.isSplit,
    children: tray.children.map(serializeDOM)
  };
}

function loadFromLocalStorage() {
  try {
    const savedData = localStorage.getItem(TRAY_DATA_KEY);
    let rootTray;

    if (savedData) {
      const data = JSON.parse(savedData);
      rootTray = deserializeDOM(data);
    } else {
      rootTray = createDefaultRootTray();
    }

    document.body.innerHTML = '';
    document.body.appendChild(rootTray.element);
    
    attachTrayInstances(rootTray.element);
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    const rootTray = createDefaultRootTray();
    document.body.innerHTML = '';
    document.body.appendChild(rootTray.element);
  }
}

function deserializeDOM(data) {
  const tray = new Tray(data.id, data.name, data.labels);
  tray.isSplit = data.isSplit;
  if (tray.isSplit) {
    tray.element.classList.add('split');
    tray.updateSplitDirection();
  }
  data.children.forEach(childData => {
    const childTray = deserializeDOM(childData);
    tray.addChild(childTray);
    tray.element.querySelector('.tray-content').appendChild(childTray.element);
  });
  return tray;
}

function createDefaultRootTray() {
  const rootTray = new Tray('root', 'Root Tray');
  const content = rootTray.element.querySelector('.tray-content');

  const tray1 = new Tray('tray1', 'ToDo');
  const tray2 = new Tray('tray2', 'Doing');
  const tray3 = new Tray('tray3', 'Done');

  rootTray.addChild(tray1);
  rootTray.addChild(tray2);
  rootTray.addChild(tray3);

  content.appendChild(tray1.element);
  content.appendChild(tray2.element);
  content.appendChild(tray3.element);

  return rootTray;
}

function attachTrayInstances(element) {
  const trayElements = element.querySelectorAll('.tray');
  trayElements.forEach(trayElement => {
    const id = trayElement.getAttribute('data-tray-id');
    const name = trayElement.querySelector('.tray-title').textContent;
    const labels = Array.from(trayElement.querySelectorAll('.tray-label')).map(label => label.textContent);
    const trayInstance = new Tray(id, name, labels);
    trayElement.__trayInstance = trayInstance;
    
    const content = trayElement.querySelector('.tray-content');
    if (content) {
      Array.from(content.children).forEach(childElement => {
        if (childElement.classList.contains('tray')) {
          const childInstance = childElement.__trayInstance;
          if (childInstance) {
            trayInstance.addChild(childInstance);
          }
        }
      });
      attachTrayInstances(content);
    }
  });
}