function getTrayFromId(Id) {
  return document.querySelector(`[data-tray-id="${Id}"]`).__trayInstance;
}
class LabelManager {
  constructor() {
    this.labels = {};
    this.initializeDefaultLabels();
    this.label_tray = new Set();
  }

  initializeDefaultLabels() {
    this.addLabel( 'DONE', '#4CAF50');
    this.addLabel( 'WIP', '#FFC107');
    this.addLabel( 'PLANNING', '#2196F3');
    this.addLabel( 'ARCHIVE', '#9E9E9E');
  }

  addLabel(labelName, color) {
    // TODO
    // if (this.labels.k(labelName)){
    //   notifyUser("duplicated label name not allowed")
    //   return
    // }
    this.labels[labelName] = color};

  getLabel(labelName) {
    return this.labels[labelName];
  }

  getAllLabels() {
    return this.labels;
  }

  exportLabels() {
    return JSON.stringify(this.labels);
  }

  importLabels(jsonString) {
    this.labels = JSON.parse(jsonString);
  }

  registLabeledTray(labelName,tray){
    this.label_tray.add([labelName,tray])
  }

  unregisterLabeledTray(labelName, tray) {
    this.label_tray.delete([labelName, tray]);
  }



}

const globalLabelManager = new LabelManager();
class Tray {
  static colorPalette = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Light Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Light Purple
    '#82E0AA', // Light Green
    '#F8C471', // Light Orange
    '#85C1E9',  // Sky Blue
    "#e0e0e0", // Tray color
  ];

  constructor(parentId, id, name, children = [], color = null, labels = [], isChecked = false, created_dt = null) {
    this.id = id;
    this.name = name;
    this.children = []
    this.labels = labels;

    this.parentId = parentId;
    this.isSplit = false;
    this.isFolded = true;
    this.isChecked = isChecked;
    this.borderColor = color || Tray.colorPalette[-1];
    this.created_dt = created_dt || new Date();
    this.element = this.createElement();
    this.flexDirection = 'column';
    this.isEditing = false;
    this.updateLabels();
    this.updateAppearance();
    this.updateBorderColor();
  }

  createElement() {
    const tray = document.createElement('div');
    tray.classList.add('tray');
    tray.setAttribute('draggable', 'true');
    tray.setAttribute('data-tray-id', this.id);
    tray.style.display = "block";
    const titleContainer = document.createElement('div');
    titleContainer.classList.add('tray-title-container');
    const checkboxContainer = document.createElement('div');
    checkboxContainer.classList.add('tray-checkbox-container');
    const clickArea = document.createElement('div');
    clickArea.classList.add('tray-click-area');
    clickArea.style.flexGrow = '1';
    clickArea.style.cursor = 'pointer';
    const createdTime = document.createElement('span');
    createdTime.classList.add('tray-created-time');
    createdTime.textContent = this.formatCreatedTime();
    createdTime.style.fontSize = '0.8em';
    createdTime.style.color = '#888';
    createdTime.style.marginLeft = '10px';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('tray-checkbox');
    checkbox.checked = this.isChecked;
    checkbox.addEventListener('change', this.onCheckboxChange.bind(this));

    checkboxContainer.appendChild(checkbox);

    const title = document.createElement('div');
    title.classList.add('tray-title');
    title.setAttribute('contenteditable', 'false');
    title.textContent = this.name;

    const contextMenuButton = document.createElement('button');
    contextMenuButton.classList.add('tray-context-menu-button');
    contextMenuButton.textContent = '⋮';
    contextMenuButton.addEventListener('click', this.onContextMenuButtonClick.bind(this));
    const labelsElement = document.createElement('div');
    labelsElement.classList.add('tray-labels');
    if (!this.labels) { labelsElement.style.display = "none" }

    tray.addEventListener('contextmenu', this.onContextMenu.bind(this));
    title.addEventListener('contextmenu', (event) => {
      event.stopPropagation();
      this.onContextMenu(event);
    });

    title.addEventListener('dblclick', (event) => {
      title.setAttribute('contenteditable', 'true');
      event.stopPropagation();
      event.target.focus();
    });

    this.setupTitleEditing(title);

    const content = document.createElement('div');
    content.classList.add('tray-content');
    content.style.flexDirection = this.flexDirection;
    titleContainer.addEventListener('dblclick', this.onDoubleClick.bind(this));
    const foldButton = document.createElement('button');
    foldButton.classList.add('tray-fold-button');
    foldButton.textContent = '▼';
    foldButton.addEventListener('click', this.toggleFold.bind(this));
    foldButton.style.display = "none";

    titleContainer.appendChild(foldButton);
    titleContainer.appendChild(contextMenuButton);
    titleContainer.appendChild(checkboxContainer);
    titleContainer.appendChild(title);
    titleContainer.appendChild(createdTime);
    titleContainer.appendChild(labelsElement);

    // titleContainer.appendChild(clickArea)
    tray.appendChild(titleContainer);
    tray.append(content);

    tray.addEventListener('dragstart', this.onDragStart.bind(this));
    tray.addEventListener('dragover', this.onDragOver.bind(this));
    tray.addEventListener('drop', this.onDrop.bind(this));
    content.addEventListener('dblclick', this.onDoubleClick.bind(this));
    tray.__trayInstance = this;
    this.setupKeyboardNavigation(tray);
    if (this.isLabelTrayCopy) {
      element.classList.add('label-tray-copy');
      element.setAttribute('draggable', 'false');
      const titleElement = element.querySelector('.tray-title');
      titleElement.setAttribute('contenteditable', 'false');
      titleElement.style.pointerEvents = 'none';
    }
    this.setupEventListeners(tray);

    return tray;
  }
  static templates = {
    'Task': {
      name: 'tasker',
      children: ['PLANNING', 'PLANNED', 'PROGRESS',"DONE"],
      labels: []
    },
    'Project Structure': {
      name: 'Project Structure',
      children: [
        {name: '思索'},
        {name: '実装方針'},
        {name: '実装中'},
      ],
    },
    'importance_urgence': {
      name: 'importance - urgence',
      children: ['1-1', '1-0', '0-1', '0-0'],
    }
    ,
    "importance":{
      name:"konsaruImportance",
      children:["MUST","SHOULD","COULD","WONT"]
    }

  };
formatCreatedTime() {
  return new Date(this.created_dt).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })}
  showTemplateSelectionDialog() {
    const dialog = document.createElement('div');
    dialog.classList.add('template-selection-dialog');
    dialog.innerHTML = `
      <h3>Select a Template:</h3>
      <select id="template-select">
        ${Object.keys(Tray.templates).map(key => 
          `<option value="${key}">${Tray.templates[key].name}</option>`
        ).join('')}
      </select>
      <button id="create-template-btn">Create</button>
      <button id="cancel-btn">Cancel</button>
    `;

    document.body.appendChild(dialog);

    document.getElementById('create-template-btn').addEventListener('click', () => {
      const selectedTemplate = document.getElementById('template-select').value;
      this.addTemplateTray(selectedTemplate);
      dialog.remove();
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
      dialog.remove();
    });
  }
  showTemplateSelectionPopup(event) {
    const popup = document.createElement('div');
    popup.classList.add('template-selection-popup');
    popup.style.position = 'fixed';
    popup.style.top = `${event.clientY}px`;
    popup.style.left = `${event.clientX}px`;
    popup.style.zIndex = '10000';
  
    popup.innerHTML = `
      <h3>Select a Template:</h3>
      <div class="template-list">
        ${Object.keys(Tray.templates).map(key => `
          <div class="template-item" data-template="${key}">
            <h4>${Tray.templates[key].name}</h4>
            <small>${Tray.templates[key].children.length} items</small>
          </div>
        `).join('')}
      </div>
    `;
  
    document.body.appendChild(popup);
  
    popup.addEventListener('click', (e) => {
      const templateItem = e.target.closest('.template-item');
      if (templateItem) {
        const selectedTemplate = templateItem.getAttribute('data-template');
        this.addTemplateTray(selectedTemplate);
        popup.remove();
      }
    });
  
    // ポップアップの外側をクリックしたときに閉じる
    document.addEventListener('click', function closePopup(e) {
      if (!popup.contains(e.target) && !e.target.closest('.context-menu')) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    });
  }
  createTemplateTray(templateName) {
    const template = Tray.templates[templateName];
    if (!template) return null;

    const templateTray = new Tray(this.id, Date.now().toString(), template.name);
    
    const createChildren = (parentTray, children) => {
      children.forEach(child => {
        if (typeof child === 'string') {
          const childTray = new Tray(parentTray.id, Date.now().toString(), child);
          parentTray.addChild(childTray);
        } else {
          const childTray = new Tray(parentTray.id, Date.now().toString(), child.name);
          parentTray.addChild(childTray);
          if (child.children) {
            createChildren(childTray, child.children);
          }
        }
      });
    };

    createChildren(templateTray, template.children);
    

    
    return templateTray.children
  }
  outputAsMarkdown(depth = 0) {
    let markdown = '#'.repeat(depth + 1) + ' ' + this.name + '\n\n';
    
    if (this.children.length > 0) {
      this.children.forEach(child => {
        markdown += child.outputAsMarkdown(depth + 1);
      });
    }
    
    return markdown;
  }
  toggleFlexDirection() {
    this.flexDirection = this.flexDirection === 'column' ? 'row' : 'column';
    this.updateFlexDirection();
    this.updateChildrenAppearance(); // Add this line
    saveToLocalStorage();
  }
  addLabel(event) {
    const labelSelector = document.createElement('div');
    labelSelector.classList.add('label-selector');
    console.log(globalLabelManager.getAllLabels())
    labelSelector.innerHTML = `
    <select id="existingLabels">
      <option value="">-- 既存のラベルを選択 --</option>
      ${Object.entries(globalLabelManager.getAllLabels()).map(([name, color]) =>
        `<option value="${name}" style="background-color: ${color};">${name}</option>`
      ).join('')}
    </select>
    <button id="selectExistingLabel">選択</button>
    <div>または</div>
    <input type="text" id="newLabelName" placeholder="新しいラベル名">
    <input type="color" id="newLabelColor" value="#000000">
    <button id="addNewLabel">新しいラベルを追加</button>
    `;

    // ポップアップの位置を設定
    const rect = event.target.getBoundingClientRect();
    labelSelector.style.position = 'absolute';
    labelSelector.style.top = `${rect.bottom + window.scrollY}px`;
    labelSelector.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(labelSelector);

    document.getElementById('selectExistingLabel').addEventListener('click', () => {
      const selectedId = document.getElementById('existingLabels').value;
      if (selectedId) {
        this.addExistingLabel(selectedId);
        labelSelector.remove();
      }
    });

    document.getElementById('addNewLabel').addEventListener('click', () => {
      const name = document.getElementById('newLabelName').value;
      const color = document.getElementById('newLabelColor').value;
      if (name) {
        const newId = this.addNewLabelToManager(name, color);
        this.addExistingLabel(newId);
        labelSelector.remove();
      }
    });

    // クリックイベントリスナーを追加して、ポップアップの外側をクリックしたら閉じる
    document.addEventListener('click', (e) => {
      if (!labelSelector.contains(e.target) && e.target !== event.target) {
        labelSelector.remove();
      }
    }, { once: true });
  }

  addExistingLabel(labelId) {
    if (!this.labels.includes(labelId)) {
      this.labels.push(labelId);
      this.updateLabels();
      saveToLocalStorage(); // ラベル追加後に保存
    }
  }

  addNewLabelToManager(name, color) {
    globalLabelManager.addLabel(name, color);
    this.addExistingLabel(id); // この行を追加
    saveToLocalStorage(); // ラベル追加後に保存
    return id;
  }
  setupEventListeners(element) {
    let longPressTimer;
    let startX, startY;
    const longPressDuration = 500;

    element.addEventListener('touchstart', (e) => {
      if (this.isEditing){return}
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;

      longPressTimer = setTimeout(() => {
        this.showContextMenu(e);
      }, longPressDuration);
    });

    element.addEventListener('touchmove', (e) => {
      const threshold = 10;
      if (this.isEditing){return}
      if (Math.abs(e.touches[0].clientX - startX) > threshold ||
        Math.abs(e.touches[0].clientY - startY) > threshold) {
        clearTimeout(longPressTimer);
      }
    });

    element.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);
    });

    // ... 他のイベントリスナー ...
  }
  updateLabels() {
    let labelContainer = this.element.querySelector('.tray-labels');
    if (!labelContainer) {
      const titleContainer = this.element.querySelector('.tray-title-container');
      labelContainer = document.createElement('div');
      labelContainer.classList.add('tray-labels');
      titleContainer.appendChild(labelContainer);
    }
  
    labelContainer.innerHTML = '';
    if (this.labels) {
      this.element.querySelector('.tray-labels').style.display = "block";
    }
    this.labels.forEach(labelName => {
      const labelColor = globalLabelManager.getLabel(labelName);
      if (labelColor) {
        const labelElement = document.createElement('span');
        labelElement.classList.add('tray-label');
        labelElement.textContent = labelName;
        labelElement.style.backgroundColor = labelColor;
        labelElement.addEventListener('click', (event) => this.onLabelClick(event, labelName));
        labelContainer.appendChild(labelElement);
        globalLabelManager.registLabeledTray(labelName, this);
      }
    });
    saveToLocalStorage();
  }
  onLabelClick(event, labelName) {
    event.stopPropagation();
    if (confirm(`Do you want to remove the label "${labelName}"?`)) {
      this.removeLabel(labelName);
    }
  }
  
  removeLabel(labelName) {
    this.labels = this.labels.filter(label => label !== labelName);
    globalLabelManager.unregisterLabeledTray(labelName, this);
    this.updateLabels();
    saveToLocalStorage();
  }
  updateFlexDirection() {
    const content = this.element.querySelector('.tray-content');
    content.style.flexDirection = this.flexDirection;
    content.style.display = 'flex'; // Ensure flex display is set
  }

  updateChildrenAppearance() {
    this.children.forEach(child => {
      if (this.flexDirection === 'row') {
        child.element.style.width = '50%'; // Or any appropriate width
      } else {
        child.element.style.width = '100%';
      }
    });
  }
  onCheckboxChange(event) {
    this.isChecked = event.target.checked;
    saveToLocalStorage();
  }

  removeChild(childId) {
    this.children = this.children.filter(tray => tray.id !== childId);
    this.updateAppearance();
  }

  // updateBorderColor() {
  //   const titleContainer = this.element.querySelector('.tray-title-container');
  //   const content = this.element;
  //   if (content) {
  //     content.style.borderLeftColor = `3px solid ${this.borderColor}`;
  //   }


  //   saveToLocalStorage();
  // }
  updateBorderColor() {
    const trayElement = this.element;
    if (trayElement) {
      trayElement.style.borderLeftColor = this.borderColor;
      trayElement.style.borderLeftWidth = '3px';
      trayElement.style.borderLeftStyle = 'solid';
    }
    saveToLocalStorage();
  }
  changeBorderColor(color) {
      this.borderColor = color;
      console.log(color)
      this.updateBorderColor();
      saveToLocalStorage();
  }

  setupTitleEditing(titleElement) {
    titleElement.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      this.startTitleEdit(titleElement);
      saveToLocalStorage();

    });
  }

  toggleFold(event) {
    event.stopPropagation();
    this.isFolded = !this.isFolded;
    this.foldChildren();
    this.updateAppearance();
  }

  foldChildren() {
    if (this.isFolded) {
      this.children.forEach(child => {
        child.isFolded = true;
        child.updateAppearance();
        child.foldChildren(true);
      });
    }
  }
  updateAppearance() {
    const content = this.element.querySelector('.tray-content');
    const foldButton = this.element.querySelector('.tray-fold-button');
    const checkbox = this.element.querySelector('.tray-checkbox');
    if (checkbox) {
      checkbox.checked = this.isChecked;
    }
    if (!this.children.length) {
      content.style.display = 'none';
      
      // if (this.isFolded) {
      //   foldButton.textContent = '▶';
      // } else {
      //   foldButton.textContent = '▼';
      // }
    } else {
      foldButton.style.display = 'inline-block';
      // foldButton.style.visibility/ = 'visible';
      
      if (this.isFolded) {
        content.style.display = 'none';
        foldButton.textContent = '▶';
      } else {
        content.style.display = 'block';
        foldButton.textContent = '▼';
        this.updateFlexDirection();
  }
    }
  }

  startTitleEdit(titleElement) {
    this.isEditing = true;
    titleElement.setAttribute('contenteditable', 'true');
    // titleElement.focus();

    const range = document.createRange();
    range.selectNodeContents(titleElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    const keyDownHandler = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        titleElement.blur();
      }
    };

    const blurHandler = () => {
      this.finishTitleEdit(titleElement);
    };

    titleElement.addEventListener('keydown', keyDownHandler);
    titleElement.addEventListener('blur', blurHandler);
  }




  cancelTitleEdit(titleElement) {
    this.isEditing = false;
    titleElement.setAttribute('contenteditable', 'false');
    titleElement.textContent = this.name;
  }
  onContextMenuButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();
    this.showContextMenu(event);
  }

  showContextMenu(event) {
    this.onContextMenu(event);
  }

  finishTitleEdit(titleElement) {
    titleElement.setAttribute('contenteditable', 'false');
    this.name = titleElement.textContent.trim() || 'Untitled';
    titleElement.textContent = this.name;
    titleElement.removeEventListener('keydown', this.keyDownHandler);
    titleElement.removeEventListener('blur', this.blurHandler);
    this.isEditing = false
    saveToLocalStorage();
  }

  onDragStart(event) {
    event.stopPropagation();
    event.dataTransfer.setData('text/plain', this.id);
    event.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
  }

  setupKeyboardNavigation(element) {
    element.tabIndex = 0;
    element.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleKeyDown(event) {
    event.stopPropagation();
    if (this.isEditing) {
      // 編集モード中は特定のキーのみを処理
      switch (event.key) {
        case 'Enter':
          if (!event.shiftKey) {
            event.preventDefault();
            this.finishTitleEdit(event.target);
          }
          break;
        case 'Escape':
          event.preventDefault();
          this.cancelTitleEdit(event.target);
          break;
      }
      return; // 他のキー操作は無視
    }
    this.element.focus()
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.moveFocus('up');
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.moveFocus('down');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.moveFocus('left');
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.moveFocus('right');
        break;
      case 'Enter':
        event.preventDefault();
        if (event.ctrlKey) {
          this.addNewChild();
        } else if (event.shiftKey) {
          this.toggleEditMode();
        } else 
          {event.preventDefault();
          this.toggleFold(event);
        }
        break;
      case 'Delete':
        event.preventDefault();
        if (event.ctrlKey) {
          this.deleteTray();
        }
        break;
      case 'c':
        if (event.ctrlKey) {
          event.preventDefault();
          this.copyTray();
        }
        break;
      case 'x':
        if (event.ctrlKey) {
          event.preventDefault();
          this.cutTray();
        }
        break;
      case 'v':
        if (event.ctrlKey) {
          event.preventDefault();
          this.pasteTray();
        }
        break;
      case 'l':
        if (event.ctrlKey) {
          event.preventDefault();
          this.addLabel();
        }
        break;
      case 's':
        if (event.ctrlKey) {
          event.preventDefault();
          this.split();
        }
        break;
      case ' ':
        if (event.ctrlKey) {
          event.preventDefault();
          this.onContextMenu(event);
        } break;

    }
  }

  moveFocus(direction) {
    if (this.isEditing) { return }
    let nextTray;
    switch (direction) {
      case 'up':
        nextTray = this.getPreviousSibling();
        break;
      case 'down':
        nextTray = this.getNextSibling();
        break;
      case 'left':
        nextTray = getTrayFromId(this.parentId);
        break;
      case 'right':
        nextTray = this.children[0];
        break;
    }
    if (nextTray) {
      nextTray.element.focus();
    }
  }

  getPreviousSibling() {
    if (this.parentId) {
      const parent = getTrayFromId(this.parentId);
      const index = parent.children.indexOf(this);
      return parent.children[index - 1] || null;
    }
    return null;
  }

  getNextSibling() {
    if (this.parentId) {
      const parent = getTrayFromId(this.parentId);
      const index = parent.children.indexOf(this);
      return parent.children[index + 1] || null;
    }
    return null;
  }

  toggleEditMode() {
    const titleElement = this.element.querySelector('.tray-title');
    if (titleElement.getAttribute('contenteditable') === 'true') {
      this.finishTitleEdit(titleElement);
    } else {
      this.startTitleEdit(titleElement);
    }

  }

  addNewChild() {
    const newTray = new Tray(this.id, Date.now().toString(), 'New Tray',);
    this.addChild(newTray);
    this.isFolded = false;
    this.updateAppearance();
    // newTray.element.focus();
    const newTitleElement = newTray.element.querySelector('.tray-title');
    newTray.startTitleEdit(newTitleElement);
  }
  
  onDrop(event) {
    event.preventDefault();
    if (this.isFolded) {
      this.toggleFold(event)
    }
    this.updateAppearance();

    event.stopPropagation();

    const movingId = event.dataTransfer.getData('text/plain');
    const movingTray = getTrayFromId(movingId);

    getTrayFromId(movingTray.parentId).removeChild(movingId);
    this.children.unshift(movingTray);
    movingTray.parent = this;
    movingTray.parentId = this.id;
    const content = this.element.querySelector('.tray-content');
    content.insertBefore(movingTray.element, content.firstChild);

    movingTray.element.style.display = 'block';
    this.isFolded = false;
    this.updateAppearance();

    saveToLocalStorage();
  }

  onDragEnd(event) {
    event.stopPropagation();
    this.element.classList.remove('drag-over');
    this.element.style.display = 'block';
  }

  onDoubleClick(event) {
    event.stopPropagation()
    if (this.isSplit) return;
    // if (event.target === content || event.target === this.element.querySelector('.tray-title-container')) {
    const newTray = new Tray(this.id, Date.now().toString(), 'New Tray');
    this.addChild(newTray);
    this.isFolded = false;
    this.updateAppearance()
    // newTray.element.focus();
    const newTitleElement = newTray.element.querySelector('.tray-title');
    newTray.startTitleEdit(newTitleElement);
    // }

  }

  addChild(childTray) {
    this.children.push(childTray);
    childTray.parent = this;
    childTray.parentId = this.id;
    this.element.querySelector('.tray-content').appendChild(childTray.element)
  }
  onContextMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.isLabelTrayCopy) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    const menu = document.createElement('div');
    menu.classList.add('context-menu');
    menu.setAttribute('tabindex', '-1');
    menu.innerHTML = `
      <div class="menu-item" data-action="fetchTrayFromServer">Fetch Tray from Server</div>
      <div class="menu-item" data-action="convertToNetwork">Convert to NetworkTray</div>
      <div class="menu-item" data-action="open_this_in_other">open_this_in_other</div>
      <div class="menu-item" data-action="toggleFlexDirection">Toggle Flex Direction</div>
      <div class="menu-item" data-action="add_fetch_networkTray_to_child">add_fetch_networkTray_to_child</div>
      <div class="menu-item" data-action="add_child_from_localStorage">add_child_from_localStorage</div>
      <div class="menu-item" data-action="addLabelTray">Add Label Tray</div>
      <div class="menu-item" data-action="delete">Remove</div>
      <div class="menu-item" data-action="addLabel">Add Label</div>
      <div class="menu-item" data-action="removeLabel">Edit Labels</div>
    
      <div class="menu-item color-picker">
        Change Border Color
        <div class="color-options">
          ${Tray.colorPalette.map(color => `<div class="color-option" style="background-color: ${color};" data-color="${color}"></div>`).join('')}
        </div>
      </div>
    `;
    menu.innerHTML += `<div class="menu-item" data-action="outputMarkdown">Output as Markdown</div>`;
    menu.innerHTML += `<div class="menu-item" data-action="addTemplateTray">Add Template Tray</div>`;
    
    if (!this.isSplit) {
      menu.innerHTML += `<div class="menu-item" data-action="split">Split</div>`;
    }
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;
    document.body.appendChild(menu);
    
    // Add keyboard navigation
    const menuItems = menu.querySelectorAll('.menu-item');
    let currentFocus = 0;
    
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        menuItems[currentFocus].classList.remove('focused');
        if (e.key === 'ArrowDown') {
          currentFocus = (currentFocus + 1) % menuItems.length;
        } else {
          currentFocus = (currentFocus - 1 + menuItems.length) % menuItems.length;
        }
        menuItems[currentFocus].classList.add('focused');
        menuItems[currentFocus].focus();
      } else if (e.key === 'Enter') {
        menuItems[currentFocus].click();
      } else if (e.key === 'Escape') {
        document.body.removeChild(menu);
      }
    });
    
    menu.focus();
    menuItems[0].classList.add('focused');
    const handleMenuClick = (e) => {
      const action = e.target.getAttribute('data-action');
      const color = e.target.getAttribute('data-color');
      if (color) {
        this.changeBorderColor(color);
      }
      switch (action) {
        case 'copy':
          this.copyTray();
          break;
        case 'rename':
          this.renameTray();
          break;
        case 'cut':
          this.cutTray();
          break;
        case 'paste':
          this.pasteTray();
          break;
        case 'addLabel':
          this.showLabelSelector(event);
          break;
        case 'removeLabel':
          this.showLabelRemover();
          break;
        case 'delete':
          this.deleteTray();
          break;
        case 'split':
          if (!this.isSplit) {
            this.split();
          }
          break;
        case 'toggleFlexDirection':
          this.toggleFlexDirection();
          break;
        case 'convertToNetwork':
          this.convertToNetworkTray();
          break;
        case 'add_fetch_networkTray_to_child':
          this.add_fetch_networkTray_to_child();
          break
        case "open_this_in_other":
          this.open_this_in_other();
          break;
        case "add_child_from_localStorage":
          this.add_child_from_localStorage();
          break;
        case 'fetchTrayFromServer':
          this.fetchTrayList();
          break;
        case 'addLabelTray':
          this.addLabelTray();
          break;
        case 'outputMarkdown':
            this.showMarkdownOutput();
            break;
        case 'addTemplateTray':
          console.log("Add Template Tray clicked"); // デバッグログ

          this.showTemplateSelectionPopup(event);
          menu.remove(); // Close the context menu
          break;
      }
      menu.remove();
      document.removeEventListener('click', handleOutsideClick);
    };



    const handleOutsideClick = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', handleOutsideClick);
      }
    };

    menu.addEventListener('click', handleMenuClick);
    document.addEventListener('click', handleOutsideClick);
  }
  addTemplateTray(templateName) {
    const templateTrays = this.createTemplateTray(templateName);
    if (templateTrays) {
      templateTrays.map(t=>this.addChild(t));
      this.isFolded = false;
      this.updateAppearance();
      saveToLocalStorage();
    }
  }
  addLabelTray() {
    const labels = Object.keys(globalLabelManager.getAllLabels());
    const labelSelector = document.createElement('div');
    labelSelector.classList.add('label-selector');
    labelSelector.innerHTML = `
      <h3>Select a label to create a Label Tray:</h3>
      <select id="labelTraySelect">
        ${labels.map(label => `<option value="${label}" >${label}</option>`).join('')}
      </select>
      <button id="createLabelTrayBtn">Create Label Tray</button>
    `;
    document.body.appendChild(labelSelector);

    document.getElementById('createLabelTrayBtn').addEventListener('click', () => {
      const selectedLabel = document.getElementById('labelTraySelect').value;
      this.createLabelTray(selectedLabel);
      labelSelector.remove();
    });

  }
  createLabelTray(selectedLabel){
    const root = this.getRootTray();
    const serialized =root.serialize();
    console.log(serialized);
    let copyied = deserializeDOM(serialized);
    console.log(copyied)
    
    copyied = copyied.labelFilteringWithDestruction(selectedLabel,copyied)
    console.log(copyied)
    if (copyied){
      let ret = new Tray(this.id,"LABEL_"+selectedLabel,selectedLabel + " LABEL_Tray",[],globalLabelManager.getLabel(selectedLabel))
      copyied.children.map(t => ret.addChild(t))
      this.addChild(ret)
      this.updateAppearance()
    }
    else{
      notifyUser("no tray found")
    }
  }
  labelFilteringWithDestruction(labelName, tray) {
    console.log(tray.labels);
    console.log(tray.labels.includes(labelName));
  
    if (tray.labels.includes(labelName)) {
      return tray;
    } else {
      let children_pre = tray.children;
      let children_after = [];
      children_after = children_pre
        .map(t => this.labelFilteringWithDestruction(labelName, t))
        .filter(t => t != null);      

      console.log(children_after.length)
      if (children_after.length != 0) {
        tray.children = []
        children_pre.map(t => {
          t.element.remove()
        })
        console.log(tray.children.length)
        children_after.map(t => tray.addChild(t))
        tray.updateAppearance()
        return tray;
      }
    }
    return null;

  }

  getRootTray() {
    return getRootElement().__trayInstance
  }
  showLabelSelector(event) {
    // 既存のラベルセレクターを削除
    const existingSelector = document.querySelector('.label-selector');
    if (existingSelector) {
      existingSelector.remove();
    }

    const labelSelector = document.createElement('div');
    labelSelector.classList.add('label-selector');
    labelSelector.innerHTML = `
    <select id="existingLabels">
      <option value="">-- Select existing label --</option>
      ${Object.entries(globalLabelManager.getAllLabels()).map(([labelName, color]) =>
        `<option value="${labelName}" style="background-color: ${color};">${labelName}</option>`
      ).join('')}
    </select>
    <button id="selectExistingLabel">Select</button>
    <div>or</div>
    <input type="text" id="newLabelName" placeholder="New label name">
    <input type="color" id="newLabelColor" value="#000000">
    <button id="addNewLabel">Add new label</button>
  `;

    // ポップアップの位置を設定
    labelSelector.style.position = 'fixed';
    labelSelector.style.top = `${event.clientY}px`;
    labelSelector.style.left = `${event.clientX}px`;

    document.body.appendChild(labelSelector);

    document.getElementById('selectExistingLabel').addEventListener('click', () => {
      const selectedId = document.getElementById('existingLabels').value;
      if (selectedId) {
        this.addExistingLabel(selectedId);
        labelSelector.remove();
      }
    });

    document.getElementById('addNewLabel').addEventListener('click', () => {
      const name = document.getElementById('newLabelName').value;
      const color = document.getElementById('newLabelColor').value;
      if (name) {
        const newId = this.addNewLabelToManager(name, color);
        this.addExistingLabel(newId);
        labelSelector.remove();
      }
    });

    // クリックイベントリスナーを追加して、ポップアップの外側をクリックしたら閉じる
    document.addEventListener('click', (e) => {
      if (!labelSelector.contains(e.target) && !e.target.closest('.context-menu')) {
        labelSelector.remove();
      }
    }, { once: true });
  }

  showLabelRemover() {
    const labelRemover = document.createElement('div');
    labelRemover.classList.add('label-remover');
    labelRemover.innerHTML = `
      <h3>Select labels to remove:</h3>
      ${this.labels.map(label => `
        <div>
          <input type="checkbox" id="${label}" value="${label}">
          <label for="${label}">${label}</label>
        </div>
      `).join('')}
      <button id="removeLabelBtn">Remove Selected Labels</button>
    `;
  
    document.body.appendChild(labelRemover);
  
    document.getElementById('removeLabelBtn').addEventListener('click', () => {
      const checkboxes = labelRemover.querySelectorAll('input[type="checkbox"]:checked');
      checkboxes.forEach(checkbox => {
        this.removeLabel(checkbox.value);
      });
      labelRemover.remove();
    });
  }



  
  copyTray() {
    const serialized = serializeDOM(this)
    serialized.id =  generateUUID()
    navigator.clipboard.writeText(JSON.stringify(serialized))
  }

  renameTray() {
    const title = this.element.querySelector('.tray-title');
    title.setAttribute('contenteditable', 'true');
    // title.focus();
    saveToLocalStorage();
  }

  cutTray() {
    const serialized = serializeDOM(this)
    navigator.clipboard.writeText(JSON.stringify(serialized))
  }

  pasteTray() {
    const serialized = navigator.clipboard.readText().then(str =>
    {try{
      let newTray = deserializeDOM(JSON.parse(str))
      this.addChild(newTray);
    }catch{
      const texts = str.split('\n').filter(line => line.trim() !== '');
      const trays = texts.map(text => new Tray(this.id,generateUUID(),text));
      trays.map(t => this.addChild(t))
    }
  })
}



  deleteTray() {
    const parent = getTrayFromId(this.parentId);
    const indexInParent = parent.children.findIndex(child => child.id === this.id);

    parent.removeChild(this.id);
    this.element.remove();

    this.moveFocusAfterDelete(parent, indexInParent);

    saveToLocalStorage();
  }

  moveFocusAfterDelete(parent, deletedIndex) {
    let nextFocus;

    if (parent.children.length > 0) {
      if (deletedIndex < parent.children.length) {
        nextFocus = parent.children[deletedIndex].element;
      } else {
        nextFocus = parent.children[parent.children.length - 1].element;
      }
    } else {
      nextFocus = parent.element;
    }

    if (nextFocus) {
      nextFocus.focus();
    }
  }

  updateSplitDirection() {
    if (this.isSplit) {
      if (window.innerWidth > window.innerHeight) {
        this.element.classList.remove('split-vertical');
        this.element.classList.add('split-horizontal');
      } else {
        this.element.classList.remove('split-horizontal');
        this.element.classList.add('split-vertical');
      }
    }
  }

  split() {
    if (this.isSplit) return;

    const newTray1 = new Tray(this.id, Date.now().toString(), 'N');
    const newTray2 = new Tray(this.id, Date.now().toString(), 'S');

    this.element.classList.add('split');
    this.isSplit = true;
    this.updateSplitDirection();

    const content = this.element.querySelector('.tray-content');
    const existingChildTrays = Array.from(this.children);

    content.innerHTML = '';
    this.children = [];

    this.addChild(newTray1);
    this.addChild(newTray2);
    // content.appendChild(newTray1.element);
    // content.appendChild(newTray2.element);

    if (existingChildTrays.length > 0) {
      existingChildTrays.forEach(childTray => {
        newTray1.addChild(childTray);
        newTray1.element.querySelector('.tray-content').appendChild(childTray.element);
      });
    }

    this.element.classList.add('no-new-tray');
  }
  convertToNetworkTray(url = '', filename = '') {
    const networkTray = new NetworkTray(
      this.parentId,
      this.id,
      this.name,
      [],
      this.borderColor,
      this.labels,
      this.isChecked,
      url,
      filename
    );
    this.children.forEach(childTray => {
      networkTray.addChild(childTray)
    });

    networkTray.isSplit = this.isSplit;
    networkTray.isFolded = this.isFolded;
    networkTray.flexDirection = this.flexDirection;


    if (this.id == "0") {
      document.body.innerHTML = '';
      document.body.appendChild(networkTray.element);
    } else {
      let parent = getTrayFromId(this.parentId)
      parent.addChild(networkTray)
      parent.removeChild(this)
      parent.updateAppearance()
    }
    networkTray.updateAppearance();
    networkTray.updateChildrenAppearance();

  }
  add_fetch_networkTray_to_child() {

    let tmp = new NetworkTray(
      this.id,
      generateUUID(),
      "Existing networkTray",
      [],
      null,
      "",
      ""
    );
    // tmp.showNetworkOptions();
    tmp.downloadData().then(tray => {
      this.addChild(tray);
      tray.updateAppearance();
      tray.updateChildrenAppearance();

    });
    this.updateAppearance();

    



  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      labels: this.labels,
      isSplit: this.isSplit,
      children: this.children.map(child => child.serialize()),
      parentId: this.parentId,
      borderColor: this.borderColor,
      isChecked: this.isChecked,
      flexDirection: this.flexDirection,
      created_dt: this.created_dt

    };
  }
  open_this_in_other() {
    const data = JSON.stringify(this.serialize());
    const id = generateUUID();
    localStorage.setItem(id, data)
    window.open(window.location.href + "?sessionId=" + id, "_blank")
  }
  add_child_from_localStorage() {
    let SessionId = prompt("input the sessionId", null);
    let data;
    if (SessionId) {
      data = localStorage.getItem(SessionId)
    } else { return }
    if (data) {
      let tray = deserialize(JSON.parse(data));
      this.addChild(tray);
    }
    return
  }
  showTraySelectionDialog(url, files) {
    const dialog = document.createElement('div');
    dialog.classList.add('tray-selection-dialog');
    dialog.innerHTML = `
      <h3>Select a tray to add:</h3>
      <select id="tray-select">
        ${files.map(file => `<option value="${file}">${file}</option>`).join('')}
      </select>
      <button id="add-tray-btn">Add Tray</button>
      <button id="cancel-btn">Cancel</button>
    `;

    document.body.appendChild(dialog);

    document.getElementById('add-tray-btn').addEventListener('click', () => {
      const selectedFile = document.getElementById('tray-select').value;
      this.addTrayFromServer(url, selectedFile);
      dialog.remove();
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
      dialog.remove();
    });
  }
  addTrayFromServer(url, filename) {
    fetch(`${url}/tray/load`, {
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
        const newTray = deserialize(data);
        this.addChild(newTray);
        this.updateAppearance();
        notifyUser('Tray added successfully.');
      })
      .catch(error => {
        console.error('Error:', error);
        notifyUser('Failed to add tray from server.');
      });
  }

  fetchTrayList() {
    const defaultServer = localStorage.getItem("defaultServer") || "";
    const url = prompt("Enter server URL:", defaultServer);
    if (!url) return;

    fetch(`${url}/tray/list`, {
      method: 'GET',
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        this.showTraySelectionDialog(url, data.files);
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Failed to fetch tray list from server.');
      });
  }

  showTraySelectionDialog(url, files) {
    const dialog = document.createElement('div');
    dialog.classList.add('tray-selection-dialog');
    dialog.innerHTML = `
      <h3>Select a tray to add:</h3>
      <select id="tray-select">
        ${files.map(file => `<option value="${file}">${file}</option>`).join('')}
      </select>
      <button id="add-tray-btn">Add Tray</button>
      <button id="cancel-btn">Cancel</button>
    `;

    document.body.appendChild(dialog);

    document.getElementById('add-tray-btn').addEventListener('click', () => {
      const selectedFile = document.getElementById('tray-select').value;
      this.addTrayFromServer(url, selectedFile);
      dialog.remove();
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
      dialog.remove();
    });
  }

  addTrayFromServer(url, filename) {
    fetch(`${url}/tray/load`, {
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
        const newTray = deserialize(data);
        this.addChild(newTray);
        this.updateAppearance();
        alert('Tray added successfully.');
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Failed to add tray from server.');
      });
  }
  showMarkdownOutput() {
    const markdown = this.outputAsMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const outputWindow = window.open('', '_blank');
    outputWindow.document.write(`
      <html>
        <head>
          <title>Tray Structure as Markdown</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
            pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; }
            button { margin: 10px 5px; padding: 10px 15px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>Tray Structure as Markdown</h1>
          <pre>${markdown}</pre>
          <button onclick="copyToClipboard()">Copy to Clipboard</button>
          <button onclick="downloadMarkdown()">Download Markdown</button>
          <script>
            function copyToClipboard() {
              const pre = document.querySelector('pre');
              const textArea = document.createElement('textarea');
              textArea.value = pre.textContent;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              alert('Copied to clipboard!');
            }
            
            function downloadMarkdown() {
              const link = document.createElement('a');
              link.href = '${url}';
              link.download = 'tray_structure.md';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          </script>
        </body>
      </html>
    `);
  }





}
function deserialize(data) {
  let tray;
  if (data.host_url == null) {
    tray = new Tray(
      data.parentId,
      data.id,
      data.name,
      [],
      data.borderColor,
      data.labels,
      data.isChecked,
      data.created_dt == null ? new Date() : data.created_dt
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
      data.filename,
      data.created_dt == null ? new Date() : data.created_dt

    );
  }
  let children = data.children.map(d => deserialize(d))
  console.log(children)
  children.forEach(childTray => {
    tray.addChild(childTray)
  });
  tray.isSplit = data.isSplit;
  tray.flexDirection = data.flexDirection || 'column';
  tray.updateFlexDirection();

  if (tray.isSplit) {
    tray.element.classList.add('split');
    tray.updateSplitDirection();
  }



  return tray;
}





class NetworkTray extends Tray {
  constructor(parentId, id, name, children = [], color = null, labels = [], isChecked = false, url = '', filename = '', created_dt) {
    super(parentId, id, name, children, color, labels, isChecked, created_dt);
    this.host_url = url;
    this.filename = filename;
    this.autoUpload = false; 
    if ((url.length == 0) | (filename.length == 0)) {
      this.showNetworkOptions();
    }
    this.updateNetworkInfo();
  }

  uploadData() {
    const data = this.serialize();
  
    return fetch(`${this.host_url}/tray/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'filename': this.filename
      },
      body: JSON.stringify({ data: data }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.text();
      })
      .then(result => {
        console.log(result);
        this.showUploadNotification('Data uploaded successfully.');
      })
      .catch(error => {
        console.error('Error:', error);
        this.showUploadNotification('Failed to upload data.', true);
        throw error;
      });
  }

  downloadData() {
    return fetch(`${this.host_url}/tray/load`, {
      method: 'GET',
      headers: {
        'filename': this.filename
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        let tray = this.deserialize(data);
        // let parent = getTrayFromId(this.parentId);
        // parent.addChild(tray);
        // parent.updateAppearance()
        // this.element = tray.element
        notifyUser('データのダウンロードに成功しました。');
        return tray
          ;
      })
      .catch(error => {
        console.error('Error:', error);
        notifyUser('データのダウンロードに失敗しました。');
        throw error;
      });
  }

  serialize() {
    return {
      ...super.serialize(),
      host_url: this.host_url,
      filename: this.filename
    };
  }

  deserialize(data) {
    let tray = deserialize(data);

    // if (tray.host_url){tray.updateNetworkInfo();}
    return tray
  }

  createElement() {
    const element = super.createElement();
  
    // const networkInfoElement = document.createElement('div');
    // networkInfoElement.classList.add('network-tray-info');
    // this.updateNetworkInfo(networkInfoElement);
  
    // Create a container for the buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('network-tray-buttons');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = 'column';
    buttonContainer.style.alignItems = 'flex-start';
    buttonContainer.style.gap = '5px'; // Add some space between buttons
  
    const uploadButton = document.createElement('button');
    uploadButton.textContent = 'Upload';
    uploadButton.addEventListener('click', () => this.uploadData());
  
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download';
    downloadButton.addEventListener('click', () => this.downloadData());
  
    const autoUploadButton = document.createElement('button');
    autoUploadButton.textContent = `Auto Upload: ${this.autoUpload ? 'On' : 'Off'}`;
    autoUploadButton.style.backgroundColor = this.autoUpload ? 'green' : '';
    autoUploadButton.style.color = this.autoUpload ? 'white' : '';
    autoUploadButton.addEventListener('click', () => this.toggleAutoUpload());
  
    // Add buttons to the container
    buttonContainer.appendChild(uploadButton);
    buttonContainer.appendChild(downloadButton);
    // buttonContainer.appendChild(autoUploadButton);
  
    // Add network info and button container to the tray
    const titleContainer = element.querySelector('.tray-title-container');
    // titleContainer.appendChild(networkInfoElement);
    titleContainer.appendChild(buttonContainer);
  
    // Adjust the layout of the title container
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';
    titleContainer.style.justifyContent = 'space-between';
  
    return element;
  }
  setupAutoUpload() {
    this.lastSerializedState = JSON.stringify(this.serialize());
    
    this.autoUploadInterval = setInterval(() => {
      const currentState = JSON.stringify(this.serialize());
      if (currentState !== this.lastSerializedState) {
        this.uploadData()
          .then(() => {
            this.showUploadNotification('Auto-upload successful.');
            this.lastSerializedState = currentState;
          })
          .catch(error => {
            console.error('Auto-upload failed:', error);
            this.showUploadNotification('Auto-upload failed. Please check your connection.', true);
          });
      }
    }, 5000); // Check for changes every 5 seconds
  }
  showUploadNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px';
    notification.style.borderRadius = '5px';
    notification.style.color = 'white';
    notification.style.backgroundColor = isError ? 'red' : 'green';
    notification.style.zIndex = '1000';
  
    document.body.appendChild(notification);
  
    setTimeout(() => {
      notification.style.transition = 'opacity 0.5s';
      notification.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 3000);
  }
  removeAutoUpload() {
    if (this.autoUploadInterval) {
      clearInterval(this.autoUploadInterval);
      this.autoUploadInterval = null;
    }
    this.lastSerializedState = null;
  }
  toggleAutoUpload() {
    this.autoUpload = !this.autoUpload;
    const autoUploadButton = this.element.querySelector('.network-tray-buttons button:last-child');
    autoUploadButton.textContent = `Auto Upload: ${this.autoUpload ? 'On' : 'Off'}`;
    autoUploadButton.style.backgroundColor = this.autoUpload ? 'green' : '';
    autoUploadButton.style.color = this.autoUpload ? 'white' : '';
    
    if (this.autoUpload) {
      this.setupAutoUpload();
    } else {
      this.removeAutoUpload();
    }
    
    saveToLocalStorage();
  }




  onContextMenu(event) {
    super.onContextMenu(event);
    const menu = document.querySelector('.context-menu');

    const networkOptions = document.createElement('div');
    networkOptions.classList.add('menu-item');
    networkOptions.textContent = 'Network Options';
    networkOptions.addEventListener('click', () => this.showNetworkOptions());

    menu.appendChild(networkOptions);
  }

  showNetworkOptions() {
    let d
    if (this.host_url) {
      d = this.host_url
    } else {
      d = localStorage.getItem("defaultServer")
    }
    const url = prompt('Enter URL:', d);
    const filename = prompt('Enter filename:', this.filename);

    if (url) this.host_url = url;
    if (filename) this.filename = filename;

    this.updateNetworkInfo();
    saveToLocalStorage();
  }

  updateNetworkInfo(element = this.element.querySelector('.network-tray-buttons')) {
    if (element) {
      // Clear existing content
      element.innerHTML = '';

      // Create URL button
      const urlButton = document.createElement('button');
      urlButton.textContent = 'URL';
      const uploadButton = document.createElement('button');
      uploadButton.textContent = 'Upload';
      uploadButton.addEventListener('click', () => this.uploadData());
    
      const downloadButton = document.createElement('button');
      downloadButton.textContent = 'Download';
      downloadButton.addEventListener('click', () => this.downloadData());
    
      const autoUploadButton = document.createElement('button');
      autoUploadButton.textContent = `Auto Upload: ${this.autoUpload ? 'On' : 'Off'}`;
      autoUploadButton.style.backgroundColor = this.autoUpload ? 'green' : '';
      autoUploadButton.style.color = this.autoUpload ? 'white' : '';
      autoUploadButton.addEventListener('click', () => this.toggleAutoUpload());

      // Set button color based on host_url validity
      if (this.host_url && this.host_url.trim() !== '') {
        urlButton.style.backgroundColor = 'green';
        urlButton.style.color = 'white';
      } else {
        urlButton.style.backgroundColor = 'gray';
        urlButton.style.color = 'white';
      }

      // Add tooltip functionality
      urlButton.title = this.host_url || 'No URL set';

      // Create filename element
      const filenameElement = document.createElement('div');
      filenameElement.textContent = `${this.filename}`;

      // Append elements to the container
      element.appendChild(urlButton);
      element.appendChild(filenameElement);
      element.appendChild(uploadButton)
      element.appendChild(downloadButton)
      // element.appendChild(autoUploadButton)
      // Add event listeners for custom tooltip (optional, for more control)
      let tooltip;
      urlButton.addEventListener('mouseover', (e) => {
        tooltip = document.createElement('div');
        tooltip.textContent = this.host_url || 'No URL set';
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'black';
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px';
        tooltip.style.borderRadius = '3px';
        tooltip.style.zIndex = '1000';
        document.body.appendChild(tooltip);

        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 5}px`;
      });

      urlButton.addEventListener('mouseout', () => {
        if (tooltip) {
          document.body.removeChild(tooltip);
          tooltip = null;
        }
      });
    }
  }
  fetchTrayList() {
    const defaultServer = localStorage.getItem("defaultServer") || "";
    const url = prompt("Enter server URL:", defaultServer);
    if (!url) return;

    fetch(`${url}/tray/list`, {
      method: 'GET',
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        this.showTraySelectionDialog(url, data.files);
      })
      .catch(error => {
        console.error('Error:', error);
        notifyUser('Failed to fetch tray list from server.');
      });
  }
}
