import { pluginManager } from './pluginManager';
import { pluginStorage } from './pluginStorage';
import { StoredPlugin, PluginManifest } from './pluginTypes';

export function showPluginManagerDialog(): void {
  console.log('showPluginManagerDialog called');
  const dialog = document.createElement('div');
  dialog.classList.add('plugin-manager-dialog');
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 20px;
    z-index: 10000;
    width: 90vw;
    max-width: 900px;
    min-width: 320px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  `;

  dialog.innerHTML = `
    <h3>Plugin Manager</h3>
    <div style="margin-bottom: 20px;">
      <button id="add-plugin-btn" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Add New Plugin</button>
    </div>
    <div id="plugins-list" style="max-height: 50vh; overflow-y: auto;">
      <div style="text-align: center; color: #999; padding: 20px;">Loading plugins...</div>
    </div>
    <div style="margin-top: 15px; text-align: right;">
      <button id="close-plugin-manager" style="padding: 8px 16px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">Close</button>
    </div>
  `;

  document.body.appendChild(dialog);
  console.log('Dialog added to body');

  const pluginsList = dialog.querySelector('#plugins-list') as HTMLDivElement;
  const closeButton = dialog.querySelector('#close-plugin-manager') as HTMLButtonElement;
  const addPluginButton = dialog.querySelector('#add-plugin-btn') as HTMLButtonElement;

  console.log('Dialog elements found:', { pluginsList: !!pluginsList, closeButton: !!closeButton, addPluginButton: !!addPluginButton });

  loadPluginsList();

  async function loadPluginsList() {
    console.log('Loading plugins list...');
    try {
      const plugins = await pluginStorage.getAllPlugins();
      console.log('Plugins loaded:', plugins.length);
      
      if (plugins.length === 0) {
        pluginsList.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No plugins installed. Click "Add New Plugin" to get started.</div>';
      } else {
        pluginsList.innerHTML = '';
        
        for (const plugin of plugins) {
          const pluginItem = createPluginItem(plugin);
          pluginsList.appendChild(pluginItem);
        }
      }
    } catch (error) {
      pluginsList.innerHTML = '<div style="text-align: center; color: red; padding: 20px;">Error loading plugins</div>';
      console.error('Failed to load plugins:', error);
    }
  }

  function createPluginItem(plugin: StoredPlugin): HTMLDivElement {
    const item = document.createElement('div');
    item.style.cssText = `
      margin-bottom: 15px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: ${plugin.enabled ? '#f0fff4' : '#f8f9fa'};
    `;

    const permissions = plugin.manifest.permissions?.join(', ') || 'None';
    
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h4 style="margin: 0 0 5px 0;">${plugin.manifest.name} v${plugin.manifest.version}</h4>
          <p style="margin: 0 0 5px 0; color: #666;">${plugin.manifest.description || 'No description'}</p>
          <p style="margin: 0; font-size: 0.9em; color: #999;">
            Permissions: ${permissions} | 
            Installed: ${new Date(plugin.installDate).toLocaleDateString()}
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="toggle-plugin" data-id="${plugin.id}" style="
            padding: 6px 12px;
            background: ${plugin.enabled ? '#dc3545' : '#28a745'};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">${plugin.enabled ? 'Disable' : 'Enable'}</button>
          <button class="edit-plugin" data-id="${plugin.id}" style="
            padding: 6px 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Edit</button>
          <button class="delete-plugin" data-id="${plugin.id}" style="
            padding: 6px 12px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Delete</button>
        </div>
      </div>
    `;

    // Add event listeners
    const toggleBtn = item.querySelector('.toggle-plugin') as HTMLButtonElement;
    const editBtn = item.querySelector('.edit-plugin') as HTMLButtonElement;
    const deleteBtn = item.querySelector('.delete-plugin') as HTMLButtonElement;

    toggleBtn.addEventListener('click', async () => {
      try {
        const newStatus = !plugin.enabled;
        await pluginStorage.updatePluginStatus(plugin.id, newStatus);
        
        if (newStatus) {
          await pluginManager.registerPlugin(plugin);
        } else {
          await pluginManager.unregisterPlugin(plugin.id);
        }
        
        await loadPluginsList();
      } catch (error) {
        alert(`Failed to ${plugin.enabled ? 'disable' : 'enable'} plugin: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    editBtn.addEventListener('click', () => {
      showPluginEditor(plugin);
    });

    deleteBtn.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to delete "${plugin.manifest.name}"?`)) {
        try {
          await pluginManager.unregisterPlugin(plugin.id);
          await pluginStorage.deletePlugin(plugin.id);
          await loadPluginsList();
        } catch (error) {
          alert(`Failed to delete plugin: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    });

    return item;
  }

  addPluginButton.addEventListener('click', () => {
    showPluginEditor(null);
  });

  closeButton.addEventListener('click', () => {
    cleanup();
  });

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      cleanup();
    }
  }

  function onOutsideClick(e: MouseEvent) {
    if (!dialog.contains(e.target as Node)) {
      cleanup();
    }
  }

  function cleanup() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('click', onOutsideClick);
    dialog.remove();
  }

  document.addEventListener('keydown', onKeyDown);
  // Add click handler with a delay to prevent immediate closure
  setTimeout(() => {
    document.addEventListener('click', onOutsideClick);
  }, 100);

  dialog.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

export function showPluginEditor(plugin: StoredPlugin | null): void {
  const isNew = !plugin;
  const dialog = document.createElement('div');
  dialog.classList.add('plugin-editor-dialog');
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 20px;
    z-index: 10001;
    width: 90vw;
    max-width: 900px;
    min-width: 320px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  `;

  const exampleCode = `{
  hooks: {
    onTaskHooked: async (task, context) => {
      console.log('Task hooked:', task.text);
      
      // Example: Send notification
      if (api.notifications) {
        await api.notifications.show('Task Added', {
          body: \`New task: \${task.text}\`
        });
      }
      
      // Example: Store task data
      if (api.storage) {
        const tasks = await api.storage.get('hooked_tasks') || [];
        tasks.push(task);
        await api.storage.set('hooked_tasks', tasks);
      }
    },
    
    onTaskCompleted: async (task, context) => {
      console.log('Task completed:', task.text);
    }
  }
}`;

  dialog.innerHTML = `
    <h3>${isNew ? 'Add New Plugin' : 'Edit Plugin'}</h3>
    <form id="plugin-form">
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Plugin ID:</label>
        <input type="text" id="plugin-id" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" 
          value="${plugin?.manifest.id || ''}" ${!isNew ? 'readonly' : ''}>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Name:</label>
        <input type="text" id="plugin-name" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
          value="${plugin?.manifest.name || ''}">
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Version:</label>
        <input type="text" id="plugin-version" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
          value="${plugin?.manifest.version || '1.0.0'}">
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Description:</label>
        <textarea id="plugin-description" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; min-height: 60px;">${plugin?.manifest.description || ''}</textarea>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Permissions:</label>
        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
          <label><input type="checkbox" name="permissions" value="storage" ${plugin?.manifest.permissions?.includes('storage') ? 'checked' : ''}> Storage</label>
          <label><input type="checkbox" name="permissions" value="network" ${plugin?.manifest.permissions?.includes('network') ? 'checked' : ''}> Network</label>
          <label><input type="checkbox" name="permissions" value="clipboard" ${plugin?.manifest.permissions?.includes('clipboard') ? 'checked' : ''}> Clipboard</label>
          <label><input type="checkbox" name="permissions" value="notifications" ${plugin?.manifest.permissions?.includes('notifications') ? 'checked' : ''}> Notifications</label>
        </div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">
          Plugin Code:
          <span style="font-weight: normal; color: #666; font-size: 0.9em;">
            (JavaScript object with hooks)
          </span>
        </label>
        <textarea id="plugin-code" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; min-height: 300px; font-family: monospace; font-size: 13px;">${plugin?.code || exampleCode}</textarea>
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button type="button" id="cancel-btn" style="padding: 8px 16px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">Cancel</button>
        <button type="submit" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Save Plugin</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialog);

  const form = dialog.querySelector('#plugin-form') as HTMLFormElement;
  const cancelBtn = dialog.querySelector('#cancel-btn') as HTMLButtonElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const permissions = Array.from(formData.getAll('permissions')) as any[];
    
    const manifest: PluginManifest = {
      id: (dialog.querySelector('#plugin-id') as HTMLInputElement).value,
      name: (dialog.querySelector('#plugin-name') as HTMLInputElement).value,
      version: (dialog.querySelector('#plugin-version') as HTMLInputElement).value,
      description: (dialog.querySelector('#plugin-description') as HTMLTextAreaElement).value,
      permissions
    };
    
    const code = (dialog.querySelector('#plugin-code') as HTMLTextAreaElement).value;
    
    try {
      // Validate the code
      new Function('api', code);
      
      if (isNew) {
        const storedPlugin = await pluginStorage.installPlugin(manifest, code);
        alert('Plugin installed successfully!');
      } else {
        const updatedPlugin: StoredPlugin = {
          ...plugin!,
          manifest,
          code,
          lastUpdated: Date.now()
        };
        await pluginStorage.savePlugin(updatedPlugin);
        
        // Re-register if enabled
        if (updatedPlugin.enabled) {
          await pluginManager.unregisterPlugin(updatedPlugin.id);
          await pluginManager.registerPlugin(updatedPlugin);
        }
        
        alert('Plugin updated successfully!');
      }
      
      dialog.remove();
      
      // Refresh the plugin manager dialog if it's open
      const managerDialog = document.querySelector('.plugin-manager-dialog');
      if (managerDialog) {
        managerDialog.remove();
        showPluginManagerDialog();
      }
    } catch (error) {
      alert(`Plugin validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  cancelBtn.addEventListener('click', () => {
    dialog.remove();
  });

  dialog.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}