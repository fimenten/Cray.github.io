function getTrayFromId(Id) {
  return document.querySelector(`[data-tray-id="${Id}"]`).__trayInstance;
}

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
    '#85C1E9'  // Sky Blue
  ];

  constructor(parentId, id, name, color = null, labels = []) {
    this.id = id;
    this.name = name;
    this.labels = labels;
    this.children = [];
    this.parentId = parentId;
    this.isSplit = false;
    this.isFolded = false;
    this.borderColor = color || Tray.colorPalette[0];
    this.element = this.createElement();
    this.updateAppearance();
    this.updateBorderColor();
  }

  createElement() {
    const tray = document.createElement('div');
    tray.classList.add('tray');
    tray.setAttribute('draggable', 'true');
    tray.setAttribute('data-tray-id', this.id);

    const titleContainer = document.createElement('div');
    titleContainer.classList.add('tray-title-container');
    const checkboxContainer = document.createElement('div');
    checkboxContainer.classList.add('tray-checkbox-container');

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
    titleContainer.appendChild(checkboxContainer);
    titleContainer.appendChild(title);
    titleContainer.appendChild(contextMenuButton);

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
    titleContainer.addEventListener('dblclick', this.onDoubleClick.bind(this));
    const foldButton = document.createElement('button');
    foldButton.classList.add('tray-fold-button');
    foldButton.textContent = '▼';
    foldButton.addEventListener('click', this.toggleFold.bind(this));

    titleContainer.appendChild(foldButton);
    tray.appendChild(titleContainer);
    tray.append(content);

    tray.addEventListener('dragstart', this.onDragStart.bind(this));
    tray.addEventListener('dragover', this.onDragOver.bind(this));
    tray.addEventListener('drop', this.onDrop.bind(this));
    content.addEventListener('dblclick', this.onDoubleClick.bind(this));
    tray.__trayInstance = this;
    this.setupKeyboardNavigation(tray);

    return tray;
  }

  onCheckboxChange(event) {
    this.isChecked = event.target.checked;
    saveToLocalStorage();
  }

  removeChild(childId) {
    this.children = this.children.filter(tray => tray.id !== childId);
    this.updateAppearance();
  }

  updateBorderColor() {
    const titleContainer = this.element.querySelector('.tray-title-container');
    if (titleContainer) {
      titleContainer.style.borderBottom = `3px solid ${this.borderColor}`;
    }
    saveToLocalStorage();
  }

  changeBorderColor(color) {
    if (Tray.colorPalette.includes(color)) {
      this.borderColor = color;
      this.updateBorderColor();
      saveToLocalStorage();
    }
  }

  setupTitleEditing(titleElement) {
    titleElement.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      this.startTitleEdit(titleElement);
    });
  }

  toggleFold(event) {
    event.stopPropagation();
    this.isFolded = !this.isFolded;
    this.updateAppearance();
    this.foldChildren();
  }
  
  foldChildren() {
    this.children.forEach(child => {
      child.isFolded = true;
      child.updateAppearance();
      child.foldChildren(true);
    });
  }

  updateAppearance() {
    const content = this.element.querySelector('.tray-content');
    const foldButton = this.element.querySelector('.tray-fold-button');
    const checkbox = this.element.querySelector('.tray-checkbox');
    if (checkbox) {
      checkbox.checked = this.isChecked;
    }
    if (this.children.length === 0) {
      content.style.display = 'none';
      if (this.isFolded) {
        foldButton.textContent = '▶';
      } else {
        foldButton.textContent = '▼';
      }
    } else {
      foldButton.style.display = 'inline-block';
      if (this.isFolded) {
        content.style.display = 'none';
        foldButton.textContent = '▶';
      } else {
        content.style.display = 'block';
        foldButton.textContent = '▼';
      }
    }
  }

  startTitleEdit(titleElement) {
    titleElement.setAttribute('contenteditable', 'true');
    titleElement.focus();

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
        } else {
          this.toggleEditMode();
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
        event.preventDefault();
        getTrayFromId("root").element.focus();
        break;
    }
  }

  moveFocus(direction) {
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
    const newTray = new Tray(this.id, Date.now().toString(), 'New Tray');
    this.addChild(newTray);
    this.element.querySelector('.tray-content').appendChild(newTray.element);
    newTray.element.focus();
    const newTitleElement = newTray.element.querySelector('.tray-title');
    newTray.startTitleEdit(newTitleElement);
  }

  onDrop(event) {
    event.preventDefault();
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
    this.updateAppearance();

    saveToLocalStorage();
  }

  onDragEnd(event) {
    event.stopPropagation();
    this.element.classList.remove('drag-over');
    this.element.style.display = 'block';
  }

  onDoubleClick(event) {
    if (this.isSplit) return;

    const content = this.element.querySelector('.tray-content');
    
    if (event.target === content || event.target === this.element.querySelector('.tray-title-container')) {
      const newTray = new Tray(this.id, Date.now().toString(), 'New Tray');
      this.addChild(newTray);
      content.appendChild(newTray.element);
      
      newTray.element.focus();
      const newTitleElement = newTray.element.querySelector('.tray-title');
      newTray.startTitleEdit(newTitleElement);
    }
  }

  addChild(childTray) {
    this.children.push(childTray);
    childTray.parent = this;
    childTray.parentId = this.id;
    this.updateAppearance();
  }

  onContextMenu(event) {
    event.preventDefault();
    event.stopPropagation();

    const menu = document.createElement('div');
    menu.classList.add('context-menu');
    menu.innerHTML = `
      <div class="menu-item" data-action="copy">Copy</div>
      <div class="menu-item" data-action="rename">Rename</div>
      <div class="menu-item" data-action="cut">Cut</div>
      <div class="menu-item" data-action="paste">Paste</div>
      <div class="menu-item" data-action="label">Add Label</div>
      <div class="menu-item" data-action="delete">Delete</div>
      <div class="menu-item color-picker">
        Change Border Color
        <div class="color-options">
          ${Tray.colorPalette.map(color => `<div class="color-option" style="background-color: ${color};" data-color="${color}"></div>`).join('')}
        </div>
      </div>
    `;

    if (!this.isSplit) {
      menu.innerHTML += `<div class="menu-item" data-action="split">Split</div>`;
    }
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;
    document.body.appendChild(menu);

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
        case 'label':
          this.addLabel(event);
          break;
        case 'delete':
          this.deleteTray();
          break;
        case 'split':
          if (!this.isSplit) {
            this.split();
          }
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

  copyTray() {
    const copiedTray = new Tray(Date.now().toString(), this.name + ' (Copy)', [...this.labels]);
    if (this.parent) {
      this.parent.addChild(copiedTray);
      const index = this.parent.children.indexOf(this);
      this.parent.element.querySelector('.tray-content').insertBefore(copiedTray.element, this.element.nextSibling);
    }
  }

  renameTray() {
    const title = this.element.querySelector('.tray-title');
    title.setAttribute('contenteditable', 'true');
    title.focus();
    saveToLocalStorage();
  }

  cutTray() {
    if (this.id === 'root') {
      alert('Cannot cut root tray');
      return;
    }
    sessionStorage.setItem('cutTray', JSON.stringify(this.serialize()));
    if (this.parent) {
      this.parent.removeChild(this);
      this.element.remove();
    }
  }

  pasteTray() {
    const cutTrayData = sessionStorage.getItem('cutTray');
    if (cutTrayData) {
      const trayData = JSON.parse(cutTrayData);
      const newTray = Tray.deserialize(trayData);
      this.addChild(newTray);
      this.element.querySelector('.tray-content').appendChild(newTray.element);
      sessionStorage.removeItem('cutTray');
    }
  }

  addLabel() {
    const label = prompt('Enter label name:');
    if (label) {
      this.labels.push(label);
      const labelElement = document.createElement('span');
      labelElement.classList.add('tray-label');
      labelElement.textContent = label;
      this.element.appendChild(labelElement);
    }
  }

  deleteTray() {
    if (this.id === 'root') {
      alert('Cannot delete root tray');
      return;
    }

    const parent = getTrayFromId(this.parentId);
    const indexInParent = parent.children.findIndex(child => child.id === this.id);

    parent.removeChild(this.id);
    this.element.remove();

    this.moveFocusAfterDelete(parent, indexInParent);

    historyManager.addAction(new RemoveTrayAction(parent, this));
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
    content.appendChild(newTray1.element);
    content.appendChild(newTray2.element);

    if (existingChildTrays.length > 0) {
      existingChildTrays.forEach(childTray => {
        newTray1.addChild(childTray);
        newTray1.element.querySelector('.tray-content').appendChild(childTray.element);
      });
    }

    this.element.classList.add('no-new-tray');
  }
}