import { getTrayFromId, getRandomColor, getWhiteColor } from "./utils";
import { deserialize, saveToIndexedDB, } from "./io";
import { selected_trays } from "./humberger";
import { removeLabel } from "./label";
import { downloadData, uploadData, } from "./networks";
import { element2TrayMap } from "./app";
import { onContextMenu } from "./contextMenu";
import { handleKeyDown } from "./keyboardInteraction";
import { setLastFocused } from "./state";
import store from "./store";
export class Tray {
    // Initialize the template once
    static initTemplate() {
        if (Tray.template)
            return;
        const tray = document.createElement("div");
        tray.classList.add("tray");
        tray.setAttribute("draggable", "true");
        tray.style.display = "block";
        const titleContainer = document.createElement("div");
        titleContainer.classList.add("tray-title-container");
        titleContainer.style.display = "flex";
        titleContainer.style.alignItems = "center";
        titleContainer.style.justifyContent = "space-between";
        // Add fold button
        const foldButton = document.createElement("button");
        foldButton.classList.add("tray-fold-button");
        foldButton.textContent = "▼";
        // Add title
        const title = document.createElement("div");
        title.classList.add("tray-title");
        title.setAttribute("contenteditable", "false");
        // Add right fold button
        const rightFoldButton = document.createElement("button");
        rightFoldButton.classList.add("tray-fold-button-right");
        rightFoldButton.textContent = "▼";
        rightFoldButton.style.display = "none";
        // Add context menu button
        const contextMenuButton = document.createElement("button");
        contextMenuButton.classList.add("tray-context-menu-button");
        contextMenuButton.textContent = "⋮";
        // Add created time
        const createdTime = document.createElement("span");
        createdTime.classList.add("tray-created-time");
        createdTime.style.fontSize = "0.8em";
        createdTime.style.color = "#888";
        // Add checkbox container
        const checkboxContainer = document.createElement("div");
        checkboxContainer.classList.add("tray-checkbox-container");
        // Add checkbox
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("tray-checkbox");
        checkboxContainer.appendChild(checkbox);
        // Add labels
        const labelsElement = document.createElement("div");
        labelsElement.classList.add("tray-labels");
        // Network info
        const networkInfoElement = document.createElement("div");
        networkInfoElement.classList.add("network-tray-info");
        // Button container
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("network-tray-buttons");
        buttonContainer.style.display = "flex";
        buttonContainer.style.flexDirection = "column";
        buttonContainer.style.alignItems = "flex-start";
        buttonContainer.style.gap = "5px";
        // URL button
        const urlButton = document.createElement("button");
        urlButton.textContent = "URL";
        // Filename element
        const filenameElement = document.createElement("div");
        // Upload button
        const uploadButton = document.createElement("button");
        uploadButton.textContent = "Upload";
        // Download button
        const downloadButton = document.createElement("button");
        downloadButton.textContent = "Download";
        // Add buttons to container
        buttonContainer.appendChild(urlButton);
        buttonContainer.appendChild(filenameElement);
        buttonContainer.appendChild(uploadButton);
        buttonContainer.appendChild(downloadButton);
        // Assemble title container
        titleContainer.appendChild(foldButton);
        titleContainer.appendChild(title);
        titleContainer.appendChild(rightFoldButton);
        titleContainer.appendChild(contextMenuButton);
        titleContainer.appendChild(createdTime);
        titleContainer.appendChild(checkboxContainer);
        titleContainer.appendChild(labelsElement);
        titleContainer.appendChild(networkInfoElement);
        // Add content container
        const content = document.createElement("div");
        content.classList.add("tray-content");
        // Assemble tray
        tray.appendChild(titleContainer);
        tray.appendChild(content);
        Tray.template = tray;
    }
    constructor(parentId, id, name, color = null, labels = [], created_dt = null, flexDirection = "column", host_url = null, filename = null, isFold = true) {
        this.id = id;
        this.name = name;
        this.children = [];
        this.labels = labels;
        this.parentId = parentId;
        this.isFolded = isFold;
        this.borderColor = color ? color : getWhiteColor();
        this.created_dt = created_dt ? new Date(created_dt) : new Date();
        this.host_url = host_url;
        this.filename = filename;
        this.flexDirection = flexDirection;
        this.isEditing = false;
        this.isSelected = false;
        // Create element from template
        this.element = this.createElement();
        // Update element properties
        this.updateAppearance();
        this.updateBorderColor(this.borderColor);
    }
    createElement() {
        // Initialize template if not already done
        Tray.initTemplate();
        // Clone the template
        const tray = Tray.template.cloneNode(true);
        // Set unique ID
        tray.setAttribute("data-tray-id", this.id);
        // Get components
        const titleContainer = tray.querySelector(".tray-title-container");
        const title = tray.querySelector(".tray-title");
        const foldButton = tray.querySelector(".tray-fold-button");
        const rightFoldButton = tray.querySelector(".tray-fold-button-right");
        const contextMenuButton = tray.querySelector(".tray-context-menu-button");
        const createdTime = tray.querySelector(".tray-created-time");
        const checkbox = tray.querySelector(".tray-checkbox");
        const labelsElement = tray.querySelector(".tray-labels");
        const content = tray.querySelector(".tray-content");
        const networkInfoElement = tray.querySelector(".network-tray-info");
        const buttonContainer = tray.querySelector(".network-tray-buttons");
        // Set properties
        title.textContent = this.name;
        createdTime.textContent = this.formatCreatedTime();
        checkbox.checked = this.isSelected;
        content.style.flexDirection = this.flexDirection;
        // Hide labels if none
        if (!this.labels || this.labels.length === 0) {
            labelsElement.style.display = "none";
        }
        // URL button setup
        if (buttonContainer) {
            const urlButton = buttonContainer.querySelector("button");
            if (urlButton) {
                if (this.host_url && this.host_url.trim() !== "") {
                    urlButton.style.backgroundColor = "green";
                    urlButton.style.color = "white";
                }
                else {
                    urlButton.style.backgroundColor = "gray";
                    urlButton.style.color = "white";
                }
                urlButton.title = this.host_url || "No URL set";
            }
            // Filename setup
            const filenameElement = buttonContainer.children[1];
            if (filenameElement) {
                filenameElement.textContent = this.filename || "";
            }
            // Show button container only if filename exists
            if (this.filename != null) {
                titleContainer.appendChild(buttonContainer);
            }
            else if (buttonContainer.parentNode === titleContainer) {
                titleContainer.removeChild(buttonContainer);
            }
        }
        // Set up event listeners
        foldButton.addEventListener("click", this.toggleFold.bind(this));
        rightFoldButton.addEventListener("click", this.toggleFold.bind(this));
        contextMenuButton.addEventListener("click", this.onContextMenuButtonClick.bind(this));
        checkbox.addEventListener("change", this.onCheckboxChange.bind(this));
        title.addEventListener("contextmenu", (event) => {
            event.stopPropagation();
            onContextMenu(this, event);
        });
        title.addEventListener("dblclick", (event) => {
            title.setAttribute("contenteditable", "true");
            event.stopPropagation();
            const target = event.target;
            target.focus();
        });
        this.setupTitleEditing(title);
        titleContainer.addEventListener("dblclick", this.onDoubleClick.bind(this));
        content.addEventListener("dblclick", this.onDoubleClick.bind(this));
        tray.addEventListener("dragstart", this.onDragStart.bind(this));
        tray.addEventListener("dragover", this.onDragOver.bind(this));
        tray.addEventListener("drop", this.onDrop.bind(this));
        this.setupKeyboardNavigation(tray);
        if (buttonContainer) {
            const uploadButton = buttonContainer.children[2];
            const downloadButton = buttonContainer.children[3];
            if (uploadButton) {
                uploadButton.addEventListener("click", (e) => uploadData(this));
            }
            if (downloadButton) {
                downloadButton.addEventListener("click", (e) => downloadData(this));
            }
        }
        tray.addEventListener("focus", (e) => store.dispatch(setLastFocused(this)));
        tray.addEventListener("click", (e) => store.dispatch(setLastFocused(this)));
        element2TrayMap.set(tray, this);
        return tray;
    }
    setupFocusTracking(tray) {
        tray.element.addEventListener("focus", () => {
            setLastFocused(tray);
        }, true);
        tray.element.addEventListener("click", () => {
            setLastFocused(tray);
        }, true);
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
    onCheckboxChange(event) {
        const isChecked = event.target.checked;
        // 一時的なコピーを作成
        let updated_trays = [...selected_trays]; // 配列のコピー
        if (isChecked) {
            // チェックボックスがチェックされた場合、現在のTrayを追加
            updated_trays.push(this);
        }
        else {
            // チェックボックスが外された場合、現在のTrayを削除
            updated_trays = updated_trays.filter((t) => t.id !== this.id);
        }
        // グローバルな selected_trays 配列を更新
        selected_trays.length = 0; // 配列を空にする
        selected_trays.push(...updated_trays); // 更新した配列を再度追加
        this.isSelected = isChecked; // isSelectedの状態を更新
    }
    toggleFlexDirection() {
        this.flexDirection = this.flexDirection === "column" ? "row" : "column";
        this.updateFlexDirection();
        this.updateChildrenAppearance(); // Add this line
        saveToIndexedDB();
    }
    setupEventListeners(element) {
        let longPressTimer;
        let startX;
        let startY;
        const longPressDuration = 500;
        element.addEventListener("touchstart", (e) => {
            if (this.isEditing) {
                return;
            }
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            longPressTimer = window.setTimeout(() => {
                this.showContextMenu(e);
            }, longPressDuration);
        });
        element.addEventListener("touchmove", (e) => {
            const threshold = 10;
            if (this.isEditing) {
                return;
            }
            if (Math.abs(e.touches[0].clientX - startX) > threshold ||
                Math.abs(e.touches[0].clientY - startY) > threshold) {
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
    // updateLabels(): void {
    //   let labelContainer = this.element.querySelector(
    //     ".tray-labels"
    //   ) as HTMLElement | null;
    //   if (!labelContainer) {
    //     const titleContainer = this.element.querySelector(
    //       ".tray-title-container"
    //     ) as HTMLElement | null;
    //     if (titleContainer) {
    //       labelContainer = document.createElement("div");
    //       labelContainer.classList.add("tray-labels");
    //       titleContainer.appendChild(labelContainer);
    //     }
    //   }
    //   if (labelContainer) {
    //     labelContainer.innerHTML = "";
    //     if (this.labels && this.labels.length > 0) {
    //       labelContainer.style.display = "block";
    //     }
    //     this.labels.forEach((labelName: string) => {
    //       const labelColor = globalLabelManager.getLabel(labelName);
    //       if (labelColor) {
    //         const labelElement = document.createElement("span");
    //         labelElement.classList.add("tray-label");
    //         labelElement.textContent = labelName;
    //         labelElement.style.backgroundColor = labelColor;
    //         labelElement.addEventListener("click", (event: MouseEvent) =>
    //           this.onLabelClick(tray,event, labelName)
    //         );
    //         labelContainer.appendChild(labelElement);
    //         globalLabelManager.registLabeledTray(labelName, this);
    //       }
    //     });
    //     // saveToIndexedDB();
    //   }
    // }
    onLabelClick(tray, event, labelName) {
        event.stopPropagation();
        if (confirm(`Do you want to remove the label "${labelName}"?`)) {
            removeLabel(tray, labelName);
        }
    }
    updateFlexDirection() {
        const content = this.element.querySelector(".tray-content");
        if (content) {
            content.style.flexDirection = this.flexDirection;
            content.style.display = "flex"; // Ensure flex display is set
        }
    }
    updateChildrenAppearance() {
        this.children.forEach((child) => {
            if (this.flexDirection === "row") {
                child.element.style.width = "50%"; // Or any appropriate width
            }
            else {
                child.element.style.width = "100%";
            }
        });
    }
    //   onCheckboxChange(event) {
    //     this.isChecked = event.target.checked;
    //     saveToIndexedDB();
    //   }
    removeChild(childId) {
        this.children = this.children.filter((tray) => tray.id !== childId);
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
    updateBorderColor(color) {
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
    changeBorderColor(color) {
        // this.borderColor = color;
        this.updateBorderColor(color);
        saveToIndexedDB();
    }
    setupTitleEditing(titleElement) {
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
    updateAppearance() {
        const content = this.element.querySelector(".tray-content");
        const foldButton = this.element.querySelector(".tray-fold-button");
        const foldButtonRight = this.element.querySelector(".tray-fold-button-right");
        if (!content || !foldButton || !foldButtonRight) {
            // Exit early if any of the required elements are not found
            return;
        }
        if (!this.children.length) {
            content.style.display = "none";
            foldButton.style.display = "none";
        }
        else {
            foldButton.style.display = "inline-block";
            foldButtonRight.style.display = "inline-block";
            if (this.isFolded) {
                content.style.display = "none";
                foldButton.textContent = "▶";
                foldButton.style.display = "inline-block";
                foldButtonRight.textContent = "▼";
                foldButtonRight.style.display = "none";
            }
            else {
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
    startTitleEdit(titleElement) {
        this.isEditing = true;
        titleElement.setAttribute("contenteditable", "true");
        // titleElement.focus();
        const range = document.createRange();
        range.selectNodeContents(titleElement);
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
        const keyDownHandler = (e) => {
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
    cancelTitleEdit(titleElement) {
        this.isEditing = false;
        titleElement.setAttribute("contenteditable", "false");
        titleElement.textContent = this.name;
    }
    onContextMenuButtonClick(event) {
        event.preventDefault();
        event.stopPropagation();
        this.showContextMenu(event);
    }
    showContextMenu(event) {
        onContextMenu(this, event);
    }
    finishTitleEdit(titleElement) {
        titleElement.setAttribute("contenteditable", "false");
        this.name = (titleElement.textContent || "").trim();
        titleElement.textContent = this.name;
        // titleElement.removeEventListener("keydown", this.keyDownHandler);
        // titleElement.removeEventListener("blur", this.blurHandler);
        this.isEditing = false;
        saveToIndexedDB();
    }
    onDragStart(event) {
        event.stopPropagation();
        if (event.dataTransfer) {
            event.dataTransfer.setData("text/plain", this.id);
            event.dataTransfer.effectAllowed = "move";
        }
    }
    onDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
    }
    setupKeyboardNavigation(element) {
        element.tabIndex = 0;
        element.addEventListener("keydown", (event) => handleKeyDown(this, event));
    }
    addNewChild() {
        const newTray = new Tray(this.id, Date.now().toString(), "New Tray");
        this.addChild(newTray);
        this.isFolded = false;
        this.updateAppearance();
        // newTray.element.focus();
        const newTitleElement = newTray.element.querySelector(".tray-title");
        newTray.startTitleEdit(newTitleElement);
    }
    onDrop(event) {
        var _a;
        event.preventDefault();
        event.stopPropagation();
        if (this.isFolded) {
            this.toggleFold();
        }
        this.updateAppearance();
        const movingId = (_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData("text/plain");
        if (!movingId)
            return; // If there's no data, exit early
        const movingTray = getTrayFromId(movingId);
        if (!movingTray)
            return; // Exit if the tray doesn't exist
        const parentTray = getTrayFromId(movingTray.parentId);
        if (parentTray) {
            parentTray.removeChild(movingId);
        }
        this.children.unshift(movingTray);
        // movingTray.parent = this as Tray;
        movingTray.parentId = this.id;
        const content = this.element.querySelector(".tray-content");
        if (content) {
            content.insertBefore(movingTray.element, content.firstChild);
        }
        movingTray.element.style.display = "block";
        this.isFolded = false;
        this.updateAppearance();
        saveToIndexedDB();
    }
    onDragEnd(event) {
        event.stopPropagation();
        this.element.classList.remove("drag-over");
        this.element.style.display = "block";
    }
    onDoubleClick(event) {
        event.stopPropagation();
        // Assuming Tray is a class with a constructor that accepts these parameters
        const newTray = new Tray(this.id, Date.now().toString(), "New Tray");
        this.addChild(newTray);
        this.isFolded = false;
        this.updateAppearance();
        const newTitleElement = newTray.element.querySelector(".tray-title");
        if (newTitleElement) {
            newTray.startTitleEdit(newTitleElement);
        }
    }
    onMouseOver(event) {
        // Implement functionality or leave empty if no behavior is needed
    }
    addChild(childTray) {
        this.children.unshift(childTray);
        childTray.parentId = this.id;
        const trayContent = this.element.querySelector(".tray-content");
        if (trayContent) {
            trayContent.insertBefore(childTray.element, trayContent.firstChild);
        }
        if (this.children.length === 1) {
            const color = this.borderColor == getWhiteColor()
                ? getRandomColor()
                : this.borderColor;
            console.log(this.borderColor === getWhiteColor(), color, this.borderColor);
            this.borderColor = color;
            this.updateBorderColor(this.borderColor);
            this.updateAppearance();
        }
    }
    moveFocusAfterDelete(parent, deletedIndex) {
        let nextFocus;
        if (parent.children.length > 0) {
            if (deletedIndex < parent.children.length) {
                nextFocus = parent.children[deletedIndex].element;
            }
            else {
                nextFocus = parent.children[parent.children.length - 1].element;
            }
        }
        else {
            nextFocus = parent.element;
        }
        if (nextFocus) {
            nextFocus.focus();
        }
    }
    add_child_from_localStorage() {
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
}
// Static template element that will be cloned for each new Tray
Tray.template = null;
