class Tray {
    constructor(id, name, labels = []) {
        this.id = id;
        this.name = name;
        this.labels = labels;
        this.element = this.createElement();
        this.isSplit = false;  // 新しいプロパティを追加

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

  
      const content = document.createElement('div');
      content.classList.add('tray-content');
  
      tray.appendChild(title);
      tray.appendChild(content);
  
      tray.addEventListener('dragstart', this.onDragStart);
      tray.addEventListener('dragover', this.onDragOver);
      tray.addEventListener('drop', this.onDrop);
      tray.addEventListener('dragend', this.onDragEnd); // 追加
      tray.addEventListener('contextmenu', (event) => this.onContextMenu(event));
      this.onDoubleClick = (event) => {
        if (event.target === content && !this.isSplit) {  // 分割されていない場合のみ新規トレイを追加
          const newTray = new Tray(Date.now().toString(), 'New Tray');
          content.appendChild(newTray.element);
          requestAnimationFrame(() => {
            newTray.element.querySelector('.tray-title').focus();
          });
        }
      };
      content.addEventListener('dblclick', this.onDoubleClick);

      title.addEventListener('blur', (event) => {
        this.name = event.target.textContent;
      });
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
          const parentTray = this.element.parentNode.closest('.tray');
          if (parentTray) {
            parentTray.querySelector('.tray-content').appendChild(sourceTray);
          } else {
            this.element.parentNode.appendChild(sourceTray);
          }
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
      split() {
        if (this.isSplit) return;  // 既に分割されている場合は何もしない
    
        const newTray1 = new Tray(Date.now().toString(), 'New Tray 1');
        const newTray2 = new Tray(Date.now().toString(), 'New Tray 2');
        
        this.element.classList.add('split');
        this.isSplit = true;  // 分割状態を更新
        this.updateSplitDirection();
    
        const content = this.element.querySelector('.tray-content');
        const existingChildTrays = Array.from(content.children);
        
        content.innerHTML = '';
        content.appendChild(newTray1.element);
        content.appendChild(newTray2.element);
    
        // 既存の子トレイを最初の新しいトレイに移動
        if (existingChildTrays.length > 0) {
          const newTray1Content = newTray1.element.querySelector('.tray-content');
          existingChildTrays.forEach(childTray => {
            newTray1Content.appendChild(childTray);
          });
        }
    
        // 親トレイ（this）と子トレイの新規追加を無効化
        this.disableNewTrayCreation();

      }
      disableNewTrayCreation() {
        const content = this.element.querySelector('.tray-content');
        content.removeEventListener('dblclick', this.onDoubleClick);
        this.element.classList.add('no-new-tray');  // CSSで視覚的なフィードバックを提供するためのクラスを追加
      }
    
      updateSplitDirection() {
        if (this.element.classList.contains('split')) {
          if (window.innerWidth > window.innerHeight) {
            this.element.classList.remove('split-vertical');
            this.element.classList.add('split-horizontal');
          } else {
            this.element.classList.remove('split-horizontal');
            this.element.classList.add('split-vertical');
          }
        }
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
        if (!this.isSplit) {
            menu.innerHTML += `<div class="menu-item" data-action="split">トレイを分割</div>`;
          }
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
            case 'split':
                if (!this.isSplit) {
                  this.split();
                }
                break;
          }
        });
      
        document.addEventListener('click', handleOutsideClick);
      }
  }
  function updateAllSplitDirections() {
    document.querySelectorAll('.tray.split').forEach(tray => {
      const trayInstance = tray.__trayInstance;
      if (trayInstance) {
        trayInstance.updateSplitDirection();
      }
    });
  }
  
  // ウィンドウのリサイズイベントを監視
  window.addEventListener('resize', updateAllSplitDirections);
  
  // Trayインスタンス作成時に__trayInstanceプロパティを設定
  const originalCreateElement = Tray.prototype.createElement;
  Tray.prototype.createElement = function() {
    const element = originalCreateElement.call(this);
    element.__trayInstance = this;
    return element;
  };
  const rootTray = new Tray('root', 'Root Tray');
  document.body.appendChild(rootTray.element);
  
  const tray1 = new Tray('tray1', 'ToDo');
  const tray2 = new Tray('tray2', 'Doing');
  const tray3 = new Tray('tray3', 'Done');
  
  rootTray.element.querySelector('.tray-content').appendChild(tray1.element);
  rootTray.element.querySelector('.tray-content').appendChild(tray2.element);
  rootTray.element.querySelector('.tray-content').appendChild(tray3.element);