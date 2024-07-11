class NetworkTray extends Tray {
    constructor(parentId, id, name, color = null, labels = [], isChecked = false, url = '', filename = '') {
      super(parentId, id, name, color, labels, isChecked);
      this.url = url || 'http://host.com:8080';
      this.filename = filename || `tray_${this.id}.json`;
    }
  
    uploadData() {
      const data = this.serialize();
      
      return fetch(`${this.url}/tray/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'filename': this.filename
        },
        body: JSON.stringify({ data: data })
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
        throw error;
      });
    }
  
    downloadData() {
      return fetch(`${this.url}/tray/load`, {
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
        this.deserialize(data);
        notifyUser('データのダウンロードに成功しました。');
        return this;
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
        url: this.url,
        filename: this.filename
      };
    }
  
    deserialize(data) {
      super.deserialize(data);
      this.url = data.url || this.url;
      this.filename = data.filename || this.filename;
      this.updateNetworkInfo();
    }
  
    createElement() {
      const element = super.createElement();
      
      const networkInfoElement = document.createElement('div');
      networkInfoElement.classList.add('network-tray-info');
      this.updateNetworkInfo(networkInfoElement);
      
      const uploadButton = document.createElement('button');
      uploadButton.textContent = 'Upload';
      uploadButton.addEventListener('click', () => this.uploadData());
      
      const downloadButton = document.createElement('button');
      downloadButton.textContent = 'Download';
      downloadButton.addEventListener('click', () => this.downloadData());
      
      element.querySelector('.tray-title-container').appendChild(networkInfoElement);
      element.querySelector('.tray-title-container').appendChild(uploadButton);
      element.querySelector('.tray-title-container').appendChild(downloadButton);
      
      return element;
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
      const url = prompt('Enter URL:', this.url);
      const filename = prompt('Enter filename:', this.filename);
      
      if (url) this.url = url;
      if (filename) this.filename = filename;
      
      this.updateNetworkInfo();
      saveToLocalStorage();
    }
  
    updateNetworkInfo(element = this.element.querySelector('.network-tray-info')) {
      if (element) {
        element.textContent = `URL: ${this.url}, Filename: ${this.filename}`;
      }
    }
  }