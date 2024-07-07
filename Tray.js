class Tray {
  constructor(id, name, labels = []) {
    this.id = id === 'root' ? 'root' : Date.now().toString();
    this.name = name;
    this.labels = labels;
    this.children = [];
    this.parent = null;
    this.element = this.createElement();
    this.isSplit = false;
  }

  createElement() {
    const tray = document.createElement('div');
    tray.classList.add('tray');
    tray.setAttribute('draggable', 'true');
    tray.setAttribute('data-tray-id', this.id);

    const title = document.createElement('div');
    title.classList.add('tray-title');
    title.setAttribute('contenteditable', 'false');
    title.textContent = this.name;
    
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
    
    title.addEventListener('blur', (event) => {
      this.name = event.target.textContent;
      title.setAttribute('contenteditable', 'false');
    });

    const content = document.createElement('div');
    content.classList.add('tray-content');

    tray.appendChild(title);
    tray.appendChild(content);

    tray.addEventListener('dragstart', this.onDragStart.bind(this));
    tray.addEventListener('dragover', this.onDragOver.bind(this));
    tray.addEventListener('drop', this.onDrop.bind(this));
    tray.addEventListener('dragend', this.onDragEnd.bind(this));
    
    content.addEventListener('dblclick', this.onDoubleClick.bind(this));

    tray.__trayInstance = this;
    return tray;
  }

  onDragStart(event) {
    event.stopPropagation();
    event.dataTransfer.setData('text/plain', this.id);
    event.dataTransfer.effectAllowed = 'move';
    this.element.classList.add('dragging');
    setTimeout(() => {
      this.element.style.display = 'none';
    }, 0);
  }

  onDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    this.element.classList.add('drag-over');
  }

  onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const sourceId = event.dataTransfer.getData('text');
    const sourceTray = document.querySelector(`[data-tray-id="${sourceId}"]`).__trayInstance;
    
    if (sourceId !== this.id && !this.isDescendantOf(sourceTray)) {
      if (sourceTray.parent) {
        sourceTray.parent.removeChild(sourceTray);
      }
      this.addChild(sourceTray);
      this.element.querySelector('.tray-content').appendChild(sourceTray.element);
      sourceTray.element.style.display = 'block';
    }
    
    this.element.classList.remove('drag-over');
  }

  onDragEnd(event) {
    event.stopPropagation();
    this.element.classList.remove('dragging');
    this.element.style.display = 'block';
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  }

  onDoubleClick(event) {
    if (event.target === this.element.querySelector('.tray-content') && !this.isSplit) {
      const newTray = new Tray(Date.now().toString(), 'New Tray');
      this.addChild(newTray);
      event.target.appendChild(newTray.element);
    }
  }

  addChild(childTray) {
    this.children.push(childTray);
    childTray.parent = this;
  }

  removeChild(childTray) {
    const index = this.children.findIndex(child => child.id === childTray.id);
    if (index !== -1) {
      this.children.splice(index, 1);
      childTray.parent = null;
    }
  }

  isDescendantOf(ancestor) {
    let parent = this.parent;
    while (parent) {
      if (parent === ancestor) return true;
      parent = parent.parent;
    }
    return false;
  }

  onContextMenu(event) {
    event.preventDefault();
    const menu = document.createElement('div');
    menu.classList.add('context-menu');
    menu.innerHTML = `
      <div class="menu-item" data-action="copy">Copy</div>
      <div class="menu-item" data-action="rename">Rename</div>
      <div class="menu-item" data-action="cut">Cut</div>
      <div class="menu-item" data-action="paste">Paste</div>
      <div class="menu-item" data-action="label">Add Label</div>
      <div class="menu-item" data-action="delete">Delete</div>
    `;
    if (!this.isSplit) {
      menu.innerHTML += `<div class="menu-item" data-action="split">Split</div>`;
    }
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;
    document.body.appendChild(menu);

    const handleMenuClick = (e) => {
      const action = e.target.getAttribute('data-action');
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

  addLabel(event) {
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
    {
      if (this.parent) {
        this.parent.removeChild(this);
        this.element.remove();
      }
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

    const newTray1 = new Tray(Date.now().toString(), 'New Tray 1');
    const newTray2 = new Tray(Date.now().toString(), 'New Tray 2');
    
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

  serialize() {
    return {
      id: this.id,
      name: this.name,
      labels: this.labels,
      isSplit: this.isSplit,
      children: this.children.map(child => child.serialize())
    };
  }

  static deserialize(data) {
    const tray = new Tray(data.id, data.name, data.labels);
    tray.isSplit = data.isSplit;
    if (tray.isSplit) {
      tray.element.classList.add('split');
      tray.updateSplitDirection();
    }
    data.children.forEach(childData => {
      const childTray = Tray.deserialize(childData);
      tray.addChild(childTray);
      tray.element.querySelector('.tray-content').appendChild(childTray.element);
    });
    return tray;
  }
}