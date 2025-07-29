import { getRandomColor, getWhiteColor, generateUUID, getRootElement, getUrlParameter } from "./utils";
import { getTrayFromId } from "./trayOperations";
import { cloneTray } from "./trayFactory";
import {
  serialize,
  deserialize,
  loadFromIndexedDB,
  saveToIndexedDB,
} from "./io";
import { createHamburgerMenu, selected_trays, showHookNotification } from "./hamburger";
import {
  downloadData,
  showUploadNotification,
  uploadData,
  fetchTrayList,
  setNetworkOption,
  updateData,
  startAutoUpload,
  stopAutoUpload,
} from "./networks";
import { meltTray } from "./functions";
import { id2TrayData, element2TrayMap} from "./app";
import { colorPalette } from "./const";
import { handleKeyDown } from "./keyboardInteraction";
import { setLastFocused } from "./state";
import store from "./store";
import { openContextMenu } from "./contextMenu";
import { pluginManager } from "./pluginManager";
import { HookedTask, PluginContext } from "./pluginTypes";
import { TrayId, ITrayData, ITrayUIState } from "./types";

export class Tray {
  id: TrayId;
  name: string;
  children: Tray[];
  parentId: TrayId;
  borderColor: string;
  created_dt: Date;
  flexDirection: "column" | "row";
  host_url: string | null;
  filename: string | null;
  isFolded: boolean;
  properties: Record<string, any>;
  hooks: string[];
  isDone: boolean;
  showDoneMarker: boolean;

  autoUpload: boolean;

  isEditing: boolean;
  isSelected: boolean;
  // element: HTMLDivElement|null;
  _element :HTMLDivElement|null;
  constructor(
    parentId: TrayId,
    id: TrayId,
    name: string,
    color: string | null = null,
    created_dt: Date | null = null,
    flexDirection: "column" | "row" = "column",
    host_url: string | null = null,
    filename: string | null = null,
    isFold: boolean = true,
    properties: Record<string, any> = {},
    hooks: string[] = [],
    isDone: boolean = false
  ) {
    this.id = id;
    this.name = name;
    this.children = [];

    this.parentId = parentId;
    this.isFolded = isFold;
    this.borderColor = color ? color : getWhiteColor();
    this.created_dt = created_dt ? new Date(created_dt) : new Date();
    this.host_url = host_url;
    this.filename = filename;
    this.flexDirection = flexDirection;
    this.properties = properties;
    this.hooks = hooks.length > 0 ? hooks : this.parseHooksFromName(name);
    this.isDone = isDone || this.checkDoneStateFromName(name);
    this.autoUpload = true;
    this.showDoneMarker = false;
    // this.element = this.createElement();
    // this.element = null
    this.isEditing = false;
    this.isSelected = false;
    this._element = null
    this.updateAppearance();
    this.updateBorderColor(this.borderColor);
    // this.setupFocusTracking(this);
  }

  get element(){
    if (!this._element){
      const e = this.createElement()
      this._element = e
    }
    return this._element
  }

  createElement() {
    const tray = document.createElement("div");
    tray.classList.add("tray");
    tray.setAttribute("draggable", "true");
    tray.setAttribute("data-tray-id", this.id);
    tray.style.display = "block";
    const titleContainer = document.createElement("div");
    titleContainer.classList.add("tray-title-container");
    const checkboxContainer = document.createElement("div");
    checkboxContainer.classList.add("tray-checkbox-container");
    const createdTime = document.createElement("span");
    createdTime.classList.add("tray-created-time");
    createdTime.textContent = this.formatCreatedTime();
    createdTime.style.fontSize = "0.8em";
    createdTime.style.color = "#888";
    // createdTime.style.marginLeft = '10px';
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.classList.add("tray-checkbox");
    checkbox.checked = this.isSelected;
    checkbox.addEventListener("change", this.onCheckboxChange.bind(this));

    checkboxContainer.appendChild(checkbox);
    
    const title = document.createElement("div");
    title.classList.add("tray-title");
    title.setAttribute("contenteditable", "false");
    this.updateTitleContent(title);

    const contextMenuButton = document.createElement("button");
    contextMenuButton.classList.add("tray-context-menu-button");
    contextMenuButton.textContent = "⋮";
    contextMenuButton.addEventListener(
      "click",
      this.onContextMenuButtonClick.bind(this)
    );


    title.addEventListener("contextmenu", (event) => {
      event.stopPropagation();
      openContextMenu(this, event);
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

    const content = document.createElement("div");
    content.classList.add("tray-content");
    content.style.flexDirection = this.flexDirection;
    content.style.overflowY = "auto";
    titleContainer.addEventListener("dblclick", this.onDoubleClick.bind(this));
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
    // foldButton.style.display = "none";
    const rightFoldBotton = document.createElement("button");
    rightFoldBotton.classList.add("tray-fold-button-right");
    rightFoldBotton.textContent = "▼";
    rightFoldBotton.addEventListener("click", this.toggleFold.bind(this));
    rightFoldBotton.style.display = "none";
    titleContainer.appendChild(foldButton);
    titleContainer.appendChild(title);
    titleContainer.appendChild(rightFoldBotton);
    titleContainer.appendChild(contextMenuButton);
    titleContainer.appendChild(checkboxContainer);

    // titleContainer.appendChild(clickArea)
    tray.appendChild(titleContainer);
    tray.append(content);

    tray.addEventListener("dragstart", this.onDragStart.bind(this));
    tray.addEventListener("dragover", this.onDragOver.bind(this));
    tray.addEventListener("dragenter", this.onDragEnter.bind(this));
    tray.addEventListener("dragleave", this.onDragLeave.bind(this));
    tray.addEventListener("dragend", this.onDragEnd.bind(this));
    tray.addEventListener("drop", this.onDrop.bind(this));
    content.addEventListener("dblclick", this.onDoubleClick.bind(this));
    element2TrayMap.set(tray, this);

    this.setupKeyboardNavigation(tray);
    // if (this.isLabelTrayCopy) {
    //   element.classList.add("label-tray-copy");
    //   element.setAttribute("draggable", "false");
    //   const titleElement = element.querySelector(".tray-title");
    //   titleElement.setAttribute("contenteditable", "false");
    //   titleElement.style.pointerEvents = "none";
    // }
    // this.setupEventListeners(tray);
    const infoContainer = document.createElement("div");
    infoContainer.classList.add("network-tray-info");
    const urlButton = document.createElement("button");
    urlButton.textContent = "URL";
    // Set button color based on host_url validity
    if (this.host_url && this.host_url.trim() !== "") {
      urlButton.style.backgroundColor = "green";
      urlButton.style.color = "white";
    } else {
      urlButton.style.backgroundColor = "gray";
      urlButton.style.color = "white";
    }

    // Add tooltip functionality
    urlButton.title = this.host_url || "No URL set";

    // Create filename element
    const filenameElement = document.createElement("div");
    filenameElement.textContent = `${this.filename}`;

    infoContainer.appendChild(urlButton);
    infoContainer.appendChild(filenameElement);

    const networkContainer = document.createElement("div");
    networkContainer.classList.add("network-tray-buttons");
    networkContainer.style.display = "flex";
    networkContainer.style.flexDirection = "column";
    networkContainer.style.alignItems = "flex-start";
    networkContainer.style.gap = "5px";

    const actionsContainer = document.createElement("div");
    actionsContainer.classList.add("network-tray-actions");

    const uploadButton = document.createElement("button");
    uploadButton.textContent = "\u2191"; // up arrow
    uploadButton.addEventListener("click", () => {
      updateData(this).catch((e) => alert(e.message));
    });

    const updateButton = document.createElement("button");
    updateButton.textContent = "\u2193"; // down arrow
    updateButton.addEventListener("click", () => {
      updateData(this).catch((e) => alert(e.message));
    });

    const autoUploadButton = document.createElement("button");
    autoUploadButton.textContent = "♻️"; // recycle icon only
    if (this.autoUpload) autoUploadButton.classList.add("auto-upload-on");
    autoUploadButton.addEventListener("click", () => this.toggleAutoUpload(autoUploadButton));

    actionsContainer.appendChild(uploadButton);
    actionsContainer.appendChild(updateButton);
    actionsContainer.appendChild(autoUploadButton);

    networkContainer.appendChild(infoContainer);
    networkContainer.appendChild(actionsContainer);

    if (this.filename != null) {
      networkContainer.appendChild(createdTime);
      titleContainer.appendChild(networkContainer);
    } else {
      titleContainer.appendChild(createdTime);
    }

    titleContainer.style.display = "flex";
    titleContainer.style.alignItems = "center";
    titleContainer.style.justifyContent = "space-between";
    tray.addEventListener(
      "focus",(e) => store.dispatch(setLastFocused(this)));
    tray.addEventListener(
      "click",
      (e) => {
        store.dispatch(setLastFocused(this));
      },
    );
    tray.addEventListener(
      "touchstart",
      (e) => {
        store.dispatch(setLastFocused(this));
      },
    );
    return tray;
  }

  setupFocusTracking(tray: Tray) {
    tray.element.addEventListener(
      "focus",
      () => {
        setLastFocused(tray);
      },
      true
    );

    tray.element.addEventListener(
      "click",
      () => {
        setLastFocused(tray);
      },
      true
    );
  }
  formatCreatedTime() {
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
  onCheckboxChange(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;

    // 一時的なコピーを作成
    let updated_trays = [...selected_trays]; // 配列のコピー

    if (isChecked) {
      // チェックボックスがチェックされた場合、現在のTrayを追加
      updated_trays.push(this);
    } else {
      // チェックボックスが外された場合、現在のTrayを削除
      updated_trays = updated_trays.filter((t) => t.id !== this.id);
    }

    // グローバルな selected_trays 配列を更新
    selected_trays.length = 0; // 配列を空にする
    selected_trays.push(...updated_trays); // 更新した配列を再度追加

    this.isSelected = isChecked; // isSelectedの状態を更新
  }

  toggleCheckbox(): void {
    const newState = !this.isSelected;
    this.isSelected = newState;
    const checkbox = this.element.querySelector<HTMLInputElement>(
      ".tray-checkbox"
    );
    if (checkbox) {
      checkbox.checked = newState;
    }
    const updated = selected_trays.filter((t) => t.id !== this.id);
    if (newState) {
      updated.push(this);
    }
    selected_trays.length = 0;
    selected_trays.push(...updated);
  }

  toggleFlexDirection() {
    this.flexDirection = this.flexDirection === "column" ? "row" : "column";
    this.updateFlexDirection();
    this.updateChildrenAppearance(); // Add this line
    saveToIndexedDB();
  }

  toggleAutoUpload(button?: HTMLButtonElement) {
    this.autoUpload = !this.autoUpload;
    if (this.autoUpload) {
      startAutoUpload(this);
    } else {
      stopAutoUpload(this);
    }
    if (button) {
      button.textContent = "♻️";
      if (this.autoUpload) {
        button.classList.add("auto-upload-on");
      } else {
        button.classList.remove("auto-upload-on");
      }
    }
  }

  setupEventListeners(element: HTMLElement): void {
    let longPressTimer: number | undefined;
    let startX: number;
    let startY: number;
    const longPressDuration = 500;

    element.addEventListener("touchstart", (e: TouchEvent) => {
      if (this.isEditing) {
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;

      longPressTimer = window.setTimeout(() => {
        this.showContextMenu(e);
      }, longPressDuration);
    });

    element.addEventListener("touchmove", (e: TouchEvent) => {
      const threshold = 10;
      if (this.isEditing) {
        return;
      }
      if (
        Math.abs(e.touches[0].clientX - startX) > threshold ||
        Math.abs(e.touches[0].clientY - startY) > threshold
      ) {
        clearTimeout(longPressTimer);
      }
    });

    element.addEventListener("touchend", () => {
      if (this.isEditing) {
        return;
      }

      clearTimeout(longPressTimer);
    });
  }



  updateFlexDirection(): void {
    const content = this.element.querySelector(
      ".tray-content"
    ) as HTMLElement | null;
    if (content) {
      content.style.flexDirection = this.flexDirection;
      content.style.display = "flex"; // Ensure flex display is set
    }
  }

  updateChildrenAppearance() {
    this.children.forEach((child) => {
      if (this.flexDirection === "row") {
        child.element.style.boxSizing = "border-box";
        child.element.style.width = "calc(50% - 3px)"; // account for borders
      } else {
        child.element.style.width = "100%";
      }
    });
  }
  //   onCheckboxChange(event) {
  //     this.isChecked = event.target.checked;
  //     saveToIndexedDB();
  //   }

  removeChild(childId: TrayId) {
    const childTray = this.children.find((tray) => tray.id === childId);
    
    // Remove from children array
    this.children = this.children.filter((tray) => tray.id !== childId);
    
    // Remove DOM element from the parent's content
    if (childTray && childTray.element && childTray.element.parentNode) {
      childTray.element.parentNode.removeChild(childTray.element);
    }
    
    this.updateAppearance();
  }

  // updateBorderColor() {
  //   const titleContainer = this.element.querySelector('.tray-title-container');
  //   const content = this.element;
  //   if (content) {
  //     content.style.borderLeftColor = `3px solid ${this.borderColor}`;
  //   }

  //   saveToIndexedDB();
  // }
  updateBorderColor(color: string) {
    const trayElement = this.element;
    if (trayElement) {
      trayElement.style.borderLeftColor = color;
      trayElement.style.borderLeftWidth = "3px";
      trayElement.style.borderLeftStyle = "solid";
      trayElement.style.borderBottomColor = color;
      trayElement.style.borderBottomWidth = "3px";
      trayElement.style.borderBottomStyle = "solid";
      // trayElement.style.borderTopColor = color;
      // trayElement.style.borderTopWidth = '3px';
      // trayElement.style.borderTopStyle = 'solid';
    }
    // saveToIndexedDB();
  }
  changeBorderColor(color: string) {
    // this.borderColor = color;
    this.updateBorderColor(color);
    saveToIndexedDB();
  }

  private isValidUrl(text: string): boolean {
    return /^https?:\/\/\S+/i.test(text);
  }

  private isImageUrl(text: string): boolean {
    if (text.startsWith("data:image/")) return true;
    return /^https?:\/\/\S+\.(png|jpe?g|gif|bmp|svg)(\?.*)?$/i.test(text);
  }

  private updateTitleContent(titleElement: HTMLDivElement) {
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

  setupTitleEditing(titleElement: HTMLDivElement) {
    titleElement.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      this.startTitleEdit(titleElement);
      saveToIndexedDB();
    });
  }

  toggleFold() {
    this.isFolded = !this.isFolded;
    this.foldChildren();
    this.updateAppearance();
    saveToIndexedDB();
  }

  foldChildren() {
    if (this.isFolded) {
      this.children.forEach((child) => {
        child.isFolded = true;
        child.updateAppearance();
        child.foldChildren();
      });
    }
  }

  unfoldChildren() {
    this.isFolded = false;
    this.children.forEach((child) => {
      child.unfoldChildren();
    });
    this.updateAppearance();
    saveToIndexedDB();
  }
  updateAppearance(): void {
    const content = this.element.querySelector(
      ".tray-content"
    ) as HTMLElement | null;
    const foldButton = this.element.querySelector(
      ".tray-fold-button"
    ) as HTMLElement | null;
    const foldButtonRight = this.element.querySelector(
      ".tray-fold-button-right"
    ) as HTMLElement | null;

    if (!content || !foldButton || !foldButtonRight) {
      // Exit early if any of the required elements are not found
      return;
    }

    if (!this.children.length) {
      content.style.display = "none";
      foldButton.style.display = "none";
    } else {
      foldButton.style.display = "inline-block";
      foldButtonRight.style.display = "inline-block";
      if (this.isFolded) {
        content.style.display = "none";
        foldButton.textContent = "▶";
        foldButton.style.display = "inline-block";
        foldButtonRight.textContent = "▼";
        foldButtonRight.style.display = "none";
      } else {
        // if (!this.borderColor) {
        //   if (!this.tempColor) {
        //     this.tempColor = getRandomColor();
        //   }
        //   this.borderColor = this.tempColor;
        // }
        this.updateBorderColor(this.borderColor);
        content.style.display = "block";
        foldButton.textContent = "▼";
        foldButton.style.display = "none";
        foldButtonRight.textContent = "▶";
        foldButtonRight.style.display = "inline-block";
        this.updateFlexDirection();
      }
    }
  }
 
  startTitleEdit(titleElement: HTMLDivElement) {
    this.isEditing = true;
    this.showDoneMarker = true;
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

  cancelTitleEdit(titleElement: HTMLDivElement) {
    this.isEditing = false;
    this.showDoneMarker = false;
    titleElement.setAttribute("contenteditable", "false");
    this.updateTitleContent(titleElement);
  }
  onContextMenuButtonClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.showContextMenu(event);
  }

  showContextMenu(event: MouseEvent | TouchEvent) {
    openContextMenu(this, event);
  }

  parseHooksFromName(name: string): string[] {
    const hookMatches = name.match(/@(\S+)/g);
    return hookMatches ? hookMatches.map(hook => hook.substring(1)) : [];
  }

  checkDoneStateFromName(name: string): boolean {
    return name.includes('@@');
  }

  isDescendantOf(ancestorId: string): boolean {
    let currentParentId: string | null = this.parentId;
    while (currentParentId) {
      if (currentParentId === ancestorId) {
        return true;
      }
      const parentTray = getTrayFromId(currentParentId);
      currentParentId = parentTray?.parentId || null;
    }
    return false;
  }

  toggleDoneMarker(titleElement: HTMLDivElement) {
    this.showDoneMarker = !this.showDoneMarker;
    this.updateTitleContent(titleElement);
  }

  async finishTitleEdit(titleElement: HTMLDivElement) {
    titleElement.setAttribute("contenteditable", "false");
    this.name = (titleElement.textContent || "").trim();
    const oldHooks = this.hooks || [];
    this.hooks = this.parseHooksFromName(this.name);
    this.isDone = this.checkDoneStateFromName(this.name);
    
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
        parentTrayId: this.parentId
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
        parentTrayId: this.parentId
      };
      
    await pluginManager.executeHook("onTaskCompleted", completedTask, context);
    }

    this.showDoneMarker = false;
    this.updateTitleContent(titleElement);
    // titleElement.removeEventListener("keydown", this.keyDownHandler);
    // titleElement.removeEventListener("blur", this.blurHandler);
    this.isEditing = false;
    saveToIndexedDB();
    
    // Restore focus to the tray element after editing
    const trayElement = titleElement.closest('.tray') as HTMLElement;
    if (trayElement) {
      trayElement.focus();
    }
  }

  onDragStart(event: DragEvent): void {
    event.stopPropagation();
    if (event.dataTransfer) {
      if (selected_trays.length > 0 && selected_trays.includes(this)) {
        const ids = selected_trays.map((t) => t.id).join(",");
        event.dataTransfer.setData("text/plain", ids);
      } else {
        event.dataTransfer.setData("text/plain", this.id);
      }
      event.dataTransfer.effectAllowed = "move";
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  setupKeyboardNavigation(element: HTMLDivElement) {
    element.tabIndex = 0;
    element.addEventListener("keydown", (event) => handleKeyDown(this, event));
  }

  addNewChild() {
    const newTray = new Tray(this.id, Date.now().toString(), "New Tray");
    this.addChild(newTray);
    this.isFolded = false;
    this.updateAppearance();
    // newTray.element.focus();
    const newTitleElement = newTray.element.querySelector(
      ".tray-title"
    ) as HTMLDivElement;
    newTray.startTitleEdit(newTitleElement);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.isFolded) {
      this.toggleFold();
    }
    this.updateAppearance();

    const movingData = event.dataTransfer?.getData("text/plain");
    if (!movingData) return; // If there's no data, exit early

    const ids = movingData.split(",");
    const traysToMove = ids
      .map((id) => getTrayFromId(id))
      .filter((t): t is Tray => !!t);

    // Check for circular references - prevent dropping a parent into its own descendant
    const wouldCreateCircularReference = traysToMove.some((movingTray) => {
      return this.isDescendantOf(movingTray.id);
    });

    if (wouldCreateCircularReference) {
      console.warn("Cannot move tray: would create circular reference");
      return;
    }

    const content = this.element.querySelector(
      ".tray-content"
    ) as HTMLElement | null;

    traysToMove.forEach((movingTray) => {
      const parentTray = getTrayFromId(movingTray.parentId);
      if (parentTray) {
        parentTray.removeChild(movingTray.id);
      }

      this.children.unshift(movingTray);
      movingTray.parentId = this.id;

      if (content) {
        content.insertBefore(movingTray.element, content.firstChild);
      }

      movingTray.element.style.display = "block";
    });

    this.isFolded = false;
    this.updateAppearance();

    saveToIndexedDB();
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.element.classList.add("drag-over");
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    // Only remove drag-over if we're actually leaving this element
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (!this.element.contains(relatedTarget)) {
      this.element.classList.remove("drag-over");
    }
  }

  onDragEnd(event: DragEvent): void {
    event.stopPropagation();
    this.element.classList.remove("drag-over");
    this.element.style.display = "block";
  }

  onDoubleClick(event: MouseEvent): void {
    event.stopPropagation();
    // Assuming Tray is a class with a constructor that accepts these parameters
    const newTray = new Tray(this.id, Date.now().toString(), "New Tray");
    this.addChild(newTray);
    this.isFolded = false;
    this.updateAppearance();

    const newTitleElement = newTray.element.querySelector(
      ".tray-title"
    ) as HTMLDivElement | null;
    if (newTitleElement) {
      newTray.startTitleEdit(newTitleElement);
    }
  }

  onMouseOver(event: MouseEvent): void {
    // Implement functionality or leave empty if no behavior is needed
  }

  addChild(childTray: Tray): void {
    this.children.unshift(childTray);
    childTray.parentId = this.id;

    const trayContent = this.element.querySelector(
      ".tray-content"
    ) as HTMLElement | null;
    if (trayContent) {
      trayContent.insertBefore(childTray.element, trayContent.firstChild);
    }

    if (this.children.length === 1) {
      const color =
        this.borderColor == getWhiteColor()
          ? getRandomColor()
          : this.borderColor;

      this.borderColor = color;
      this.updateBorderColor(this.borderColor);
      this.updateAppearance();
    }
  }

  moveFocusAfterDelete(parent: Tray, deletedIndex: number) {
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

  add_child_from_localStorage(): void {
    const sessionId = prompt("Input the sessionId", "");
    if (!sessionId) {
      return;
    }

    const data = localStorage.getItem(sessionId);
    if (data) {
      const tray = deserialize(JSON.parse(data));
      if (tray) {
        this.addChild(tray);
      }
    }
  }

  addProperty(key: string = "priority", value: unknown) {
    this.properties[key] = value;
    saveToIndexedDB();
  }

  moveInParent(offset: number) {
    const parent = getTrayFromId(this.parentId) as Tray | undefined;
    if (!parent) return;
    const index = parent.children.indexOf(this);
    const newIndex = index + offset;
    if (index === -1 || newIndex < 0 || newIndex >= parent.children.length)
      return;

    parent.children.splice(index, 1);
    parent.children.splice(newIndex, 0, this);

    const content = parent.element.querySelector(
      ".tray-content",
    ) as HTMLElement | null;
    if (content) {
      const next = parent.children[newIndex + 1];
      content.insertBefore(this.element, next ? next.element : null);
    }

    saveToIndexedDB();
  }

  moveUp() {
    this.moveInParent(-1);
    this.element.focus();
  }

  moveDown() {
    this.moveInParent(1);
    this.element.focus();
  }

  indentRight() {
    const parent = getTrayFromId(this.parentId) as Tray | undefined;
    if (!parent) return;
    const index = parent.children.indexOf(this);
    const next = parent.children[index + 1];
    if (!next) return;

    parent.removeChild(this.id);
    next.addChild(this);
    next.isFolded = false;
    next.updateAppearance();

    if (parent.children.length === 0) {
      parent.updateAppearance();
    }

    this.element.focus();
    saveToIndexedDB();
  }

  indentLeft() {
    const parent = getTrayFromId(this.parentId) as Tray | undefined;
    if (!parent) return;
    const grand = getTrayFromId(parent.parentId) as Tray | undefined;
    if (!grand) return;

    const parentIndex = grand.children.indexOf(parent);

    parent.removeChild(this.id);

    this.parentId = grand.id;
    grand.children.splice(parentIndex, 0, this);

    const gpContent = grand.element.querySelector(
      ".tray-content"
    ) as HTMLElement | null;
    if (gpContent) {
      gpContent.insertBefore(this.element, parent.element);
    }

    if (grand.children.length === 1) {
      const color =
        grand.borderColor == getWhiteColor()
          ? getRandomColor()
          : grand.borderColor;
      grand.borderColor = color;
      grand.updateBorderColor(grand.borderColor);
    }

    grand.updateAppearance();
    this.element.focus();
    saveToIndexedDB();
  }

  insertParentTray() {
    const parent = getTrayFromId(this.parentId) as Tray | undefined;
    if (!parent) return;

    const index = parent.children.indexOf(this);
    if (index === -1) return;

    const newTray = new Tray(parent.id, generateUUID(), "New Tray");

    parent.children.splice(index, 1, newTray);

    const content = parent.element.querySelector(
      ".tray-content",
    ) as HTMLElement | null;
    if (content) {
      content.insertBefore(newTray.element, this.element);
    }

    newTray.addChild(this);
    parent.updateAppearance();
    newTray.isFolded = false;
    newTray.updateAppearance();

    const titleElement = newTray.element.querySelector(
      ".tray-title",
    ) as HTMLDivElement;
    newTray.startTitleEdit(titleElement);
    newTray.element.focus();
    saveToIndexedDB();
  }

  insertChildTray() {
    const oldChildren = [...this.children];
    const content = this.element.querySelector(
      ".tray-content",
    ) as HTMLElement | null;
    if (content) {
      oldChildren.forEach((c) => content.removeChild(c.element));
    }

    this.children = [];
    const newTray = new Tray(this.id, generateUUID(), "New Tray");
    this.addChild(newTray);

    const newContent = newTray.element.querySelector(
      ".tray-content",
    ) as HTMLElement | null;
    oldChildren.forEach((child) => {
      child.parentId = newTray.id;
      newTray.children.push(child);
      if (newContent) newContent.appendChild(child.element);
    });

    this.updateAppearance();
    newTray.isFolded = false;
    newTray.updateAppearance();

    const titleElement = newTray.element.querySelector(
      ".tray-title",
    ) as HTMLDivElement;
    newTray.startTitleEdit(titleElement);
    newTray.element.focus();
    saveToIndexedDB();
  }

  // Default to ascending order
  sortChildren(property: string = "created_dt", descending: boolean = false) {
    this.children.sort((a, b) => {
      let valA: unknown;
      let valB: unknown;
      if (property === "created_dt") {
        valA = new Date(a.created_dt).getTime();
        valB = new Date(b.created_dt).getTime();
      } else {
        valA = a.properties[property];
        valB = b.properties[property];
      }
      if (valA === undefined && valB === undefined) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (valA > valB) return descending ? -1 : 1;
      if (valA < valB) return descending ? 1 : -1;
      return 0;
    });

    const content = this.element.querySelector(
      ".tray-content",
    ) as HTMLElement | null;
    if (content) {
      this.children.forEach((child) => {
        content.appendChild(child.element);
      });
    }
    saveToIndexedDB();
  }
}
