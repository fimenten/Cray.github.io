class Tray {
    constructor(id, name, labels = []) {
        this.id = id;
        this.name = name;
        this.labels = labels;
        this.element = this.createElement();
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
      tray.addEventListener('contextmenu', this.onContextMenu);
      title.addEventListener('contextmenu', (event) => {
        this.onContextMenu(event);
      });
      title.addEventListener('dblclick', (event) => {
        title.setAttribute('contenteditable', 'true');

        event.stopPropagation();
        event.target.focus();
      });
    
      title.addEventListener('click', (event) => {

        // event.stopPropagation();
        // event.preventDefault();
      });

      title.addEventListener('blur', (event) => {
        this.name = event.target.textContent;
      });
  
      const content = document.createElement('div');
      content.classList.add('tray-content');
  
      tray.appendChild(title);
      tray.appendChild(content);
  
      tray.addEventListener('dragstart', this.onDragStart);
      tray.addEventListener('dragover', this.onDragOver);
      tray.addEventListener('drop', this.onDrop);
      tray.addEventListener('dragend', this.onDragEnd); // 追加
      tray.addEventListener('contextmenu', (event) => this.onContextMenu(event));
      return tray;
    }
  
    onDragStart(event) {
        event.dataTransfer.setData('text/plain', event.target.closest('.tray').getAttribute('data-tray-id'));
        event.dataTransfer.setDragImage(event.target.closest('.tray'), 0, 0);
        event.target.closest('.tray').classList.add('dragging'); // draggingクラスを追加
        setTimeout(() => {
          event.target.closest('.tray').style.display = 'none';
        }, 0);
      }
      onDragEnd(event) {
        event.target.closest('.tray').style.display = 'block';
        event.target.closest('.tray').style.opacity = '1';
      }
    onDragOver(event) {
        event.preventDefault();
        const targetTray = event.target.closest('.tray');
        const sourceTray = document.querySelector(`[data-tray-id="${event.dataTransfer.getData('text')}"]`);
      
        if (targetTray && !targetTray.contains(sourceTray)) {
          targetTray.querySelector('.tray-content').appendChild(sourceTray);
        } else {
          const board = document.getElementById('board');
          board.appendChild(sourceTray);
        }
      }
  
      onDrop(event) {
        const sourceId = event.dataTransfer.getData('text');
        const targetId = event.target.closest('.tray').getAttribute('data-tray-id');
      
        if (sourceId !== targetId) {
          const sourceElement = document.querySelector(`[data-tray-id="${sourceId}"]`);
          const targetContent = event.target.closest('.tray').querySelector('.tray-content');
          targetContent.appendChild(sourceElement);
          sourceElement.style.display = 'block'; // 追加
          sourceElement.style.opacity = '1'; // 追加
        }
      }
      
      deleteTray() {
        if (confirm('このトレイを削除しますか？')) {
          this.element.remove();
        }
      }
      copyTray() {
        const copiedTray = new Tray(Date.now().toString(), this.name, [...this.labels]);
        copiedTray.element.querySelector('.tray-title').textContent = `${this.name} - コピー`;
        this.element.parentNode.insertBefore(copiedTray.element, this.element.nextSibling);
      }
    
      renameTray() {
        const title = this.element.querySelector('.tray-title');
        title.setAttribute('contenteditable', 'true');
        title.focus();
        title.addEventListener('blur', (event) => {
          this.name = event.target.textContent;
          title.removeAttribute('contenteditable');
        });
      }
    
      cutTray() {
        this.copyTray();
        this.element.remove();
      }
    
      pasteTray() {
        const copiedTray = document.querySelector('.tray.copied');
        if (copiedTray) {
          const newTray = new Tray(Date.now().toString(), copiedTray.querySelector('.tray-title').textContent, [...copiedTray.tray.labels]);
          this.element.parentNode.insertBefore(newTray.element, this.element.nextSibling);
        }
      }
    
      addLabel(event) {
        const labelMenu = document.createElement('div');
        labelMenu.classList.add('label-menu');
        labelMenu.innerHTML = `
          <div class="label-item" data-action="new">新規作成</div>
          ${this.labels.map((label) => `<div class="label-item" data-label="${label}">${label}</div>`).join('')}
        `;
        labelMenu.style.top = `${event.clientY}px`;
        labelMenu.style.left = `${event.clientX}px`;
        document.body.appendChild(labelMenu);
      
        const handleLabelMenuClick = (event) => {
            event.stopPropagation();
            const action = event.target.getAttribute('data-action');
            const label = event.target.getAttribute('data-label');
            if (action === 'new') {
              const newLabel = prompt('新しいラベルを入力してください');
              if (newLabel) {
                this.labels.push(newLabel);
                this.addLabelToTray(newLabel);
              }
            } else if (label) {
              this.addLabelToTray(label);
            }
            labelMenu.remove();
            document.removeEventListener('click', handleOutsideLabelMenuClick);
          };
      
        const handleOutsideLabelMenuClick = (event) => {
          if (!labelMenu.contains(event.target)) {
            labelMenu.remove();
            document.removeEventListener('click', handleOutsideLabelMenuClick);
          }
        };
      
        labelMenu.addEventListener('click', handleLabelMenuClick.bind(this));
        document.addEventListener('click', handleOutsideLabelMenuClick);
      }
    
      addLabelToTray(label) {
        const labelElement = document.createElement('div');
        labelElement.classList.add('tray-label');
        labelElement.textContent = label;
        this.element.appendChild(labelElement);
      }
      onContextMenu(event) {
        event.preventDefault();
        const menu = document.createElement('div');
        menu.classList.add('context-menu');
        menu.innerHTML = `
          <div class="menu-item" data-action="copy">コピー</div>
          <div class="menu-item" data-action="rename">名前の変更</div>
          <div class="menu-item" data-action="cut">カット</div>
          <div class="menu-item" data-action="paste">ペースト</div>
          <div class="menu-item" data-action="label">ラベルを追加</div>
          <div class="menu-item" data-action="delete">トレイを削除</div>
        `;
        menu.style.top = `${event.clientY}px`;
        menu.style.left = `${event.clientX}px`;
        document.body.appendChild(menu);
      
        const handleOutsideClick = (event) => {
          if (!menu.contains(event.target)) {
            menu.remove();
            document.removeEventListener('click', handleOutsideClick);
          }
        };
      
        menu.addEventListener('click', (event) => {
          event.stopPropagation();
          const action = event.target.getAttribute('data-action');
          menu.remove();
          document.removeEventListener('click', handleOutsideClick);
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
          }
        });
      
        document.addEventListener('click', handleOutsideClick);
      }
  }
  
  const board = document.getElementById('board');
  
  const tray1 = new Tray('tray1', 'ToDo');
  const tray2 = new Tray('tray2', 'Doing');
  const tray3 = new Tray('tray3', 'Done');
  
  board.appendChild(tray1.element);
  board.appendChild(tray2.element);
  board.appendChild(tray3.element);
  
  
  let trayCounter = 4;
  
  board.addEventListener('dblclick', (event) => {
    if (event.target === board) {
      const newTray = new Tray(`tray${trayCounter}`, 'New Tray');
      board.appendChild(newTray.element);
      trayCounter++;
      newTray.element.querySelector('.tray-title').focus();
    }
  });
  
  const placeholder = document.getElementById('placeholder');
  
  board.addEventListener('dragover', (event) => {
    event.preventDefault();
  
    if (event.target === board) {
      const rect = board.getBoundingClientRect();
      placeholder.style.width = `${rect.width}px`;
      placeholder.style.height = `${rect.height}px`;
      placeholder.style.top = `${rect.top}px`;
      placeholder.style.left = `${rect.left}px`;
      placeholder.style.display = 'block';
    }
  });
  
  board.addEventListener('drop', (event) => {
    const sourceId = event.dataTransfer.getData('text');
    const sourceElement = document.querySelector(`[data-tray-id="${sourceId}"]`);
  
    if (event.target === board) {
      board.appendChild(sourceElement);
      sourceElement.style.display = 'block'; // 追加
      sourceElement.style.opacity = '1'; // 追加
    }
  });