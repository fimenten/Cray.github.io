import { TrayData, TrayUIState, TrayId } from "./types";
import { getTrayFromId } from "./trayOperations";
import { element2TrayMap } from "./app";
import { handleKeyDown } from "./keyboardInteraction";
import { openContextMenu } from "./contextMenu";
import { saveToIndexedDB } from "./io";
import { showHookNotification } from "./hamburger";
import { pluginManager } from "./pluginManager";
import { HookedTask, PluginContext } from "./pluginTypes";
import { getUrlParameter } from "./utils";
import store from "./store";
import { setLastFocused } from "./state";

/**
 * TrayComponent - UI layer for Tray data
 * Separates DOM manipulation from pure data concerns
 */
export class TrayComponent {
  private data: TrayData;
  private uiState: TrayUIState;
  private _element: HTMLDivElement | null = null;

  constructor(data: TrayData, initialUIState?: Partial<TrayUIState>) {
    this.data = data;
    this.uiState = {
      id: data.id,
      isEditing: false,
      isSelected: false,
      isFocused: false,
      isExpanded: !data.isFolded,
      autoUpload: false,
      lastInteractionTime: new Date(),
      element: null,
      ...initialUIState
    };
  }

  // Getters for data access
  get id(): TrayId { return this.data.id; }
  get name(): string { return this.data.name; }
  get parentId(): TrayId | null { return this.data.parentId; }
  get borderColor(): string { return this.data.borderColor; }
  get flexDirection(): "column" | "row" { return this.data.flexDirection; }
  get isFolded(): boolean { return this.data.isFolded; }
  get isDone(): boolean { return this.data.isDone; }
  get hooks(): string[] { return this.data.hooks; }
  get properties(): typeof this.data.properties { return this.data.properties; }
  get created_dt(): Date { return this.data.created_dt; }
  get host_url(): string | null { return this.data.host_url; }
  get filename(): string | null { return this.data.filename; }
  get showDoneMarker(): boolean { return this.data.showDoneMarker; }

  // UI state getters
  get isEditing(): boolean { return this.uiState.isEditing; }
  get isSelected(): boolean { return this.uiState.isSelected; }
  get isFocused(): boolean { return this.uiState.isFocused; }
  get autoUpload(): boolean { return this.uiState.autoUpload; }

  // Get data snapshot
  getData(): TrayData {
    return { ...this.data };
  }

  // Get UI state snapshot
  getUIState(): TrayUIState {
    return { ...this.uiState };
  }

  // Update data (triggers re-render if needed)
  updateData(updates: Partial<TrayData>): void {
    const oldData = { ...this.data };
    this.data = { ...this.data, ...updates };
    
    // If DOM exists, update relevant parts
    if (this._element) {
      this.updateElementFromData(oldData);
    }
  }

  // Update UI state
  updateUIState(updates: Partial<TrayUIState>): void {
    this.uiState = { ...this.uiState, ...updates };
    this.uiState.lastInteractionTime = new Date();
    
    // Update DOM if needed
    if (this._element) {
      this.updateElementFromUIState();
    }
  }

  // Lazy element creation
  get element(): HTMLDivElement {
    if (!this._element) {
      this._element = this.createElement();
      this.uiState.element = this._element;
    }
    return this._element;
  }

  // Create DOM element
  private createElement(): HTMLDivElement {
    const tray = document.createElement("div");
    tray.classList.add("tray");
    tray.setAttribute("draggable", "true");
    tray.setAttribute("data-tray-id", this.id);
    tray.style.display = "block";

    // Title container
    const titleContainer = this.createTitleContainer();
    
    // Content container
    const content = document.createElement("div");
    content.classList.add("tray-content");
    content.style.flexDirection = this.flexDirection;
    content.style.overflowY = "auto";

    tray.appendChild(titleContainer);
    tray.appendChild(content);

    // Event listeners
    this.setupEventListeners(tray);
    
    // Register in global map
    element2TrayMap.set(tray, this as any); // Type assertion for compatibility

    return tray;
  }

  private createTitleContainer(): HTMLDivElement {
    const titleContainer = document.createElement("div");
    titleContainer.classList.add("tray-title-container");

    // Checkbox container
    const checkboxContainer = this.createCheckboxContainer();
    
    // Created time
    const createdTime = this.createCreatedTimeElement();
    
    // Title element
    const title = this.createTitleElement();
    
    // Fold buttons
    const foldButton = this.createFoldButton();
    const rightFoldButton = this.createRightFoldButton();
    
    // Context menu button
    const contextMenuButton = this.createContextMenuButton();

    // Network container (if applicable)
    const networkContainer = this.createNetworkContainer();

    // Assemble title container
    titleContainer.appendChild(foldButton);
    titleContainer.appendChild(title);
    titleContainer.appendChild(rightFoldButton);
    titleContainer.appendChild(contextMenuButton);
    titleContainer.appendChild(checkboxContainer);

    if (this.filename) {
      networkContainer && titleContainer.appendChild(networkContainer);
      titleContainer.appendChild(createdTime);
    } else {
      titleContainer.appendChild(createdTime);
    }

    titleContainer.style.display = "flex";
    titleContainer.style.alignItems = "center";
    titleContainer.style.justifyContent = "space-between";

    return titleContainer;
  }

  private createCheckboxContainer(): HTMLDivElement {
    const checkboxContainer = document.createElement("div");
    checkboxContainer.classList.add("tray-checkbox-container");
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.classList.add("tray-checkbox");
    checkbox.checked = this.isSelected;
    checkbox.addEventListener("change", this.onCheckboxChange.bind(this));
    
    checkboxContainer.appendChild(checkbox);
    return checkboxContainer;
  }

  private createCreatedTimeElement(): HTMLSpanElement {
    const createdTime = document.createElement("span");
    createdTime.classList.add("tray-created-time");
    createdTime.textContent = this.formatCreatedTime();
    createdTime.style.fontSize = "0.8em";
    createdTime.style.color = "#888";
    return createdTime;
  }

  private createTitleElement(): HTMLDivElement {
    const title = document.createElement("div");
    title.classList.add("tray-title");
    title.setAttribute("contenteditable", "false");
    this.updateTitleContent(title);

    // Event listeners for title
    title.addEventListener("contextmenu", (event) => {
      event.stopPropagation();
      openContextMenu(this as any, event); // Type assertion for compatibility
    });

    title.addEventListener("dblclick", (event: MouseEvent) => {
      title.setAttribute("contenteditable", "true");
      event.stopPropagation();
      const target = event.target as HTMLElement;
      target.focus();
    });

    title.addEventListener("click", (event: MouseEvent) => {
      event.stopPropagation();
      this.toggleDoneMarker(title);
    });

    this.setupTitleEditing(title);
    return title;
  }

  private createFoldButton(): HTMLButtonElement {
    const foldButton = document.createElement("button");
    foldButton.classList.add("tray-fold-button");
    foldButton.textContent = "▼";
    foldButton.addEventListener("click", (e) => {
      if (e.detail === 1) {
        this.toggleFold();
      } else if (e.detail === 2) {
        this.unfoldChildren();
      }
    });
    return foldButton;
  }

  private createRightFoldButton(): HTMLButtonElement {
    const rightFoldButton = document.createElement("button");
    rightFoldButton.classList.add("tray-fold-button-right");
    rightFoldButton.textContent = "▼";
    rightFoldButton.addEventListener("click", this.toggleFold.bind(this));
    rightFoldButton.style.display = "none";
    return rightFoldButton;
  }

  private createContextMenuButton(): HTMLButtonElement {
    const contextMenuButton = document.createElement("button");
    contextMenuButton.classList.add("tray-context-menu-button");
    contextMenuButton.textContent = "⋮";
    contextMenuButton.addEventListener("click", this.onContextMenuButtonClick.bind(this));
    return contextMenuButton;
  }

  private createNetworkContainer(): HTMLDivElement | null {
    if (!this.filename) return null;

    const networkContainer = document.createElement("div");
    networkContainer.classList.add("network-tray-buttons");
    networkContainer.style.display = "flex";
    networkContainer.style.flexDirection = "column";
    networkContainer.style.alignItems = "flex-start";
    networkContainer.style.gap = "5px";

    // Info container
    const infoContainer = document.createElement("div");
    infoContainer.classList.add("network-tray-info");
    
    const urlButton = document.createElement("button");
    urlButton.textContent = "URL";
    if (this.host_url && this.host_url.trim() !== "") {
      urlButton.style.backgroundColor = "green";
      urlButton.style.color = "white";
    } else {
      urlButton.style.backgroundColor = "gray";
      urlButton.style.color = "white";
    }
    urlButton.title = this.host_url || "No URL set";

    const filenameElement = document.createElement("div");
    filenameElement.textContent = `${this.filename}`;

    infoContainer.appendChild(urlButton);
    infoContainer.appendChild(filenameElement);

    // Actions container
    const actionsContainer = document.createElement("div");
    actionsContainer.classList.add("network-tray-actions");

    // Network action buttons would be created here
    // For now, keeping the structure

    networkContainer.appendChild(infoContainer);
    networkContainer.appendChild(actionsContainer);

    return networkContainer;
  }

  private setupEventListeners(element: HTMLDivElement): void {
    // Keyboard navigation
    element.tabIndex = 0;
    element.addEventListener("keydown", (event) => 
      handleKeyDown(this as any, event) // Type assertion for compatibility
    );

    // Focus tracking
    element.addEventListener("focus", (e) => store.dispatch(setLastFocused(this as any)));
    element.addEventListener("click", (e) => store.dispatch(setLastFocused(this as any)));
    element.addEventListener("touchstart", (e) => store.dispatch(setLastFocused(this as any)));

    // Drag and drop
    element.addEventListener("dragstart", this.onDragStart.bind(this));
    element.addEventListener("dragover", this.onDragOver.bind(this));
    element.addEventListener("drop", this.onDrop.bind(this));

    // Double click for new child
    const content = element.querySelector(".tray-content");
    content?.addEventListener("dblclick", ((event: Event) => {
      this.onDoubleClick(event as MouseEvent);
    }) as EventListener);
  }

  // Event handlers
  private onCheckboxChange(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.updateUIState({ isSelected: isChecked });
    
    // Emit event for global selection management
    // This would be handled by the state manager in a full implementation
  }

  private onContextMenuButtonClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    openContextMenu(this as any, event);
  }

  private onDragStart(event: DragEvent): void {
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.setData("text/plain", this.id);
      event.dataTransfer.effectAllowed = "move";
    }
  }

  private onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  private onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Drop handling would be coordinated through state manager
    // For now, maintain compatibility with existing system
  }

  private onDoubleClick(event: MouseEvent): void {
    event.stopPropagation();
    // Create new child - would be handled by state manager
  }

  // Utility methods
  private formatCreatedTime(): string {
    const date = new Date(this.created_dt);
    const dateString = date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const timeString = date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateString}\n${timeString}`;
  }

  private isValidUrl(text: string): boolean {
    return /^https?:\/\/\S+/i.test(text);
  }

  private isImageUrl(text: string): boolean {
    if (text.startsWith("data:image/")) return true;
    return /^https?:\/\/\S+\.(png|jpe?g|gif|bmp|svg)(\?.*)?$/i.test(text);
  }

  private updateTitleContent(titleElement: HTMLDivElement): void {
    // Apply done styling
    if (this.isDone) {
      titleElement.classList.add("task-done");
    } else {
      titleElement.classList.remove("task-done");
    }

    const displayName = this.name;

    if (this.isImageUrl(displayName)) {
      const img = document.createElement("img");
      img.src = displayName;
      img.alt = displayName;
      titleElement.innerHTML = "";
      titleElement.appendChild(img);
    } else if (this.isValidUrl(displayName)) {
      const a = document.createElement("a");
      a.href = displayName;
      a.textContent = displayName;
      a.target = "_blank";
      titleElement.innerHTML = "";
      titleElement.appendChild(a);
    } else {
      titleElement.textContent = displayName;
    }
  }

  private setupTitleEditing(titleElement: HTMLDivElement): void {
    titleElement.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      this.startTitleEdit(titleElement);
    });
  }

  private startTitleEdit(titleElement: HTMLDivElement): void {
    this.updateUIState({ isEditing: true });
    this.updateData({ showDoneMarker: true });
    titleElement.setAttribute("contenteditable", "true");
    titleElement.textContent = this.name;

    const range = document.createRange();
    range.selectNodeContents(titleElement);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        titleElement.blur();
      }
    };

    const blurHandler = () => {
      this.finishTitleEdit(titleElement);
    };

    titleElement.addEventListener("keydown", keyDownHandler);
    titleElement.addEventListener("blur", blurHandler);
  }

  private async finishTitleEdit(titleElement: HTMLDivElement): Promise<void> {
    titleElement.setAttribute("contenteditable", "false");
    const newName = (titleElement.textContent || "").trim();
    const oldHooks = this.hooks || [];
    
    // Update data
    this.updateData({
      name: newName,
      hooks: this.parseHooksFromName(newName),
      isDone: this.checkDoneStateFromName(newName),
      showDoneMarker: false
    });

    // Show notification for newly added hooks
    const newHooks = this.hooks.filter(hook => !oldHooks.includes(hook));
    if (newHooks.length > 0) {
      showHookNotification(newHooks);
      
      // Execute plugin hooks for newly hooked task
      const hookedTask: HookedTask = {
        id: this.id,
        text: this.name,
        completed: this.isDone,
        createdAt: this.created_dt.getTime(),
        completedAt: this.isDone ? Date.now() : undefined
      };
      
      const context: PluginContext = {
        trayId: this.id,
        trayName: this.name,
        sessionId: getUrlParameter("sessionId") || "default",
        parentTrayId: this.parentId ?? undefined
      };
      
      await pluginManager.executeHook("onTaskHooked", hookedTask, context);
    }
    
    // Handle task completion
    const wasCompleted = oldHooks.includes("@@") || this.name.includes("@@");
    if (this.isDone && !wasCompleted) {
      const completedTask: HookedTask = {
        id: this.id,
        text: this.name,
        completed: true,
        createdAt: this.created_dt.getTime(),
        completedAt: Date.now()
      };
      
      const context: PluginContext = {
        trayId: this.id,
        trayName: this.name,
        sessionId: getUrlParameter("sessionId") || "default",
        parentTrayId: this.parentId ?? undefined
      };
      
      await pluginManager.executeHook("onTaskCompleted", completedTask, context);
    }

    this.updateUIState({ isEditing: false });
    this.updateTitleContent(titleElement);
    
    // Save to storage
    saveToIndexedDB();
    
    // Restore focus to the tray element after editing
    const trayElement = titleElement.closest('.tray') as HTMLElement;
    if (trayElement) {
      trayElement.focus();
    }
  }

  private parseHooksFromName(name: string): string[] {
    const hookMatches = name.match(/@(\S+)/g);
    return hookMatches ? hookMatches.map(hook => hook.substring(1)) : [];
  }

  private checkDoneStateFromName(name: string): boolean {
    return name.includes('@@');
  }

  private toggleDoneMarker(titleElement: HTMLDivElement): void {
    this.updateData({ showDoneMarker: !this.showDoneMarker });
    this.updateTitleContent(titleElement);
  }

  private toggleFold(): void {
    this.updateData({ isFolded: !this.isFolded });
    this.updateAppearance();
    saveToIndexedDB();
  }

  private unfoldChildren(): void {
    // This would be handled by the state manager to coordinate with children
    this.updateData({ isFolded: false });
    this.updateAppearance();
    saveToIndexedDB();
  }

  // Update DOM element from data changes
  private updateElementFromData(oldData: TrayData): void {
    if (!this._element) return;

    // Update border color if changed
    if (oldData.borderColor !== this.borderColor) {
      this.updateBorderColor(this.borderColor);
    }

    // Update flex direction if changed
    if (oldData.flexDirection !== this.flexDirection) {
      this.updateFlexDirection();
    }

    // Update title if name changed
    if (oldData.name !== this.name) {
      const titleElement = this._element.querySelector(".tray-title") as HTMLDivElement;
      if (titleElement) {
        this.updateTitleContent(titleElement);
      }
    }

    // Update fold state if changed
    if (oldData.isFolded !== this.isFolded) {
      this.updateAppearance();
    }
  }

  // Update DOM element from UI state changes
  private updateElementFromUIState(): void {
    if (!this._element) return;

    // Update checkbox state
    const checkbox = this._element.querySelector(".tray-checkbox") as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = this.isSelected;
    }

    // Update editing state visual feedback
    if (this.isEditing) {
      this._element.classList.add("editing");
    } else {
      this._element.classList.remove("editing");
    }
  }

  private updateBorderColor(color: string): void {
    if (!this._element) return;
    
    this._element.style.borderLeftColor = color;
    this._element.style.borderLeftWidth = "3px";
    this._element.style.borderLeftStyle = "solid";
    this._element.style.borderBottomColor = color;
    this._element.style.borderBottomWidth = "3px";
    this._element.style.borderBottomStyle = "solid";
  }

  private updateFlexDirection(): void {
    if (!this._element) return;
    
    const content = this._element.querySelector(".tray-content") as HTMLElement | null;
    if (content) {
      content.style.flexDirection = this.flexDirection;
      content.style.display = "flex";
    }
  }

  private updateAppearance(): void {
    if (!this._element) return;
    
    const content = this._element.querySelector(".tray-content") as HTMLElement | null;
    const foldButton = this._element.querySelector(".tray-fold-button") as HTMLElement | null;
    const foldButtonRight = this._element.querySelector(".tray-fold-button-right") as HTMLElement | null;

    if (!content || !foldButton || !foldButtonRight) {
      return;
    }

    // This logic would be enhanced with children management through state manager
    // For now, maintaining basic visibility logic
    
    if (this.isFolded) {
      content.style.display = "none";
      foldButton.textContent = "▶";
      foldButton.style.display = "inline-block";
      foldButtonRight.style.display = "none";
    } else {
      this.updateBorderColor(this.borderColor);
      content.style.display = "block";
      foldButton.textContent = "▼";
      foldButton.style.display = "none";
      foldButtonRight.textContent = "▶";
      foldButtonRight.style.display = "inline-block";
      this.updateFlexDirection();
    }
  }

  // Cleanup method
  dispose(): void {
    if (this._element) {
      // Remove from global map
      element2TrayMap.delete(this._element);
      
      // Remove event listeners would be handled here
      // For now, relying on browser cleanup when element is removed from DOM
      
      this._element = null;
      this.uiState.element = null;
    }
  }
}