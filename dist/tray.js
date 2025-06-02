import { getTrayFromId, getRandomColor, getWhiteColor } from "./utils";
import { deserialize, saveToIndexedDB, } from "./io";
import { selected_trays } from "./humberger";
import { uploadData, addTrayFromServer, } from "./networks";
import { element2TrayMap } from "./app";
import { handleKeyDown } from "./keyboardInteraction";
import { setLastFocused } from "./state";
import store from "./store";
import { openContextMenu } from "./contextMenu";
export class Tray {
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
        // this.element = this.createElement();
        // this.element = null
        this.isEditing = false;
        this.isSelected = false;
        this._element = null;
        // this.updateLabels();
        this.updateAppearance();
        this.updateBorderColor(this.borderColor);
        // this.setupFocusTracking(this);
    }
    get element() {
        if (!this._element) {
            const e = this.createElement();
            this._element = e;
        }
        return this._element;
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
        title.textContent = this.name;
        const contextMenuButton = document.createElement("button");
        contextMenuButton.classList.add("tray-context-menu-button");
        contextMenuButton.textContent = "⋮";
        contextMenuButton.addEventListener("click", this.onContextMenuButtonClick.bind(this));
        const labelsElement = document.createElement("div");
        labelsElement.classList.add("tray-labels");
        title.addEventListener("contextmenu", (event) => {
            event.stopPropagation();
            openContextMenu(this, event);
        });
        title.addEventListener("dblclick", (event) => {
            title.setAttribute("contenteditable", "true");
            event.stopPropagation();
            const target = event.target;
            target.focus();
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
        foldButton.addEventListener("click", this.toggleFold.bind(this));
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
        titleContainer.appendChild(createdTime);
        titleContainer.appendChild(checkboxContainer);
        titleContainer.appendChild(labelsElement);
        // titleContainer.appendChild(clickArea)
        tray.appendChild(titleContainer);
        tray.append(content);
        tray.addEventListener("dragstart", this.onDragStart.bind(this));
        tray.addEventListener("dragover", this.onDragOver.bind(this));
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
        const networkInfoElement = document.createElement("div");
        networkInfoElement.classList.add("network-tray-info");
        // this.updateNetworkInfo(networkInfoElement);
        const urlButton = document.createElement("button");
        urlButton.textContent = "URL";
        // Set button color based on host_url validity
        if (this.host_url && this.host_url.trim() !== "") {
            urlButton.style.backgroundColor = "green";
            urlButton.style.color = "white";
        }
        else {
            urlButton.style.backgroundColor = "gray";
            urlButton.style.color = "white";
        }
        // Add tooltip functionality
        urlButton.title = this.host_url || "No URL set";
        // Create filename element
        const filenameElement = document.createElement("div");
        filenameElement.textContent = `${this.filename}`;
        // Append elements to the container
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("network-tray-buttons");
        buttonContainer.style.display = "flex";
        buttonContainer.style.flexDirection = "column";
        buttonContainer.style.alignItems = "flex-start";
        buttonContainer.style.gap = "5px"; // Add some space between buttons
        const uploadButton = document.createElement("button");
        uploadButton.textContent = "Upload";
        uploadButton.addEventListener("click", (e) => uploadData(this));
        const downloadButton = document.createElement("button");
        downloadButton.textContent = "Download";
        downloadButton.addEventListener("click", (e) => {
            if ((this.host_url) && (this.filename)) {
                addTrayFromServer(getTrayFromId(this.parentId), this.host_url, this.filename);
            }
        });
        // const autoUploadButton = document.createElement("button");
        // autoUploadButton.textContent = `Auto Upload: ${
        //   this.autoUpload ? "On" : "Off"
        // }`;
        // autoUploadButton.style.backgroundColor = this.autoUpload ? "green" : "";
        // autoUploadButton.style.color = this.autoUpload ? "white" : "";
        // autoUploadButton.addEventListener("click", () => this.toggleAutoUpload());
        // Add buttons to the container
        buttonContainer.appendChild(urlButton);
        buttonContainer.appendChild(filenameElement);
        buttonContainer.appendChild(uploadButton);
        buttonContainer.appendChild(downloadButton);
        // buttonContainer.appendChild(autoUploadButton);
        titleContainer.appendChild(networkInfoElement);
        if (this.filename != null) {
            titleContainer.appendChild(buttonContainer);
        }
        titleContainer.style.display = "flex";
        titleContainer.style.alignItems = "center";
        titleContainer.style.justifyContent = "space-between";
        tray.addEventListener("focus", (e) => store.dispatch(setLastFocused(this)));
        tray.addEventListener("click", (e) => {
            store.dispatch(setLastFocused(this));
        });
        tray.addEventListener("touchstart", (e) => {
            store.dispatch(setLastFocused(this));
        });
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
        openContextMenu(this, event);
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
