"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tray = exports.id2TrayData = exports.element2TrayMap = void 0;
// import {exportData,importData} from "./io"
const utils_1 = require("./utils");
const utils_2 = require("./utils");
const utils_3 = require("./utils");
const io_1 = require("./io");
const humberger_1 = require("./humberger");
const label_1 = require("./label");
// export let hamburgerElements;
let last_focused;
var menuOpening = false;
exports.element2TrayMap = new WeakMap();
exports.id2TrayData = new Map();
const TRAY_DATA_KEY = "trayData";
let AUTO_SYNC = false;
// function labelFilteringWithDestruction(labelName:string, tray:Tray) {
//     console.log(tray.labels);
//     console.log(tray.labels.includes(labelName));
//     if (tray.labels.includes(labelName)) {
//       return tray;
//     } else {
//       let children_pre = tray.children;
//       let children_after = [];
//       children_after = children_pre
//         .map((t) => this.labelFilteringWithDestruction(labelName, t))
//         .filter((t) => t != null);
//       console.log(children_after.length);
//       if (children_after.length != 0) {
//         tray.children = [];
//         children_pre.map((t) => {
//           t.element.remove();
//         });
//         console.log(tray.children.length);
//         children_after.map((t) => tray.addChild(t));
//         tray.updateAppearance();
//         return tray;
//       }
//     }
//     return null;
//   }
const globalLabelManager = new label_1.LabelManager();
class Tray {
    constructor(parentId, id, name, color = null, labels = [], created_dt = null) {
        this.id = id;
        this.name = name;
        this.children = [];
        this.labels = labels;
        this.parentId = parentId;
        this.isFolded = true;
        this.borderColor = color || (0, utils_1.getWhiteColor)();
        this.created_dt = created_dt || new Date();
        this.element = this.createElement();
        this.flexDirection = "column";
        this.isEditing = false;
        this.updateLabels();
        this.updateAppearance();
        this.updateBorderColor(this.borderColor);
        this.setupFocusTracking();
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
        const clickArea = document.createElement("div");
        clickArea.classList.add("tray-click-area");
        clickArea.style.flexGrow = "1";
        clickArea.style.cursor = "pointer";
        const createdTime = document.createElement("span");
        createdTime.classList.add("tray-created-time");
        createdTime.textContent = this.formatCreatedTime();
        createdTime.style.fontSize = "0.8em";
        createdTime.style.color = "#888";
        // createdTime.style.marginLeft = '10px';
        // const checkbox = document.createElement("input");
        // checkbox.type = "checkbox";
        // checkbox.classList.add("tray-checkbox");
        // checkbox.checked = this.isChecked;
        // checkbox.addEventListener("change", this.onCheckboxChange.bind(this));
        // checkboxContainer.appendChild(checkbox);
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
        if (!this.labels) {
            labelsElement.style.display = "none";
        }
        tray.addEventListener("contextmenu", this.onContextMenu.bind(this));
        title.addEventListener("contextmenu", (event) => {
            event.stopPropagation();
            this.onContextMenu(event);
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
        // titleContainer.appendChild(checkboxContainer);
        titleContainer.appendChild(title);
        titleContainer.appendChild(rightFoldBotton);
        titleContainer.appendChild(contextMenuButton);
        titleContainer.appendChild(createdTime);
        titleContainer.appendChild(labelsElement);
        // titleContainer.appendChild(clickArea)
        tray.appendChild(titleContainer);
        tray.append(content);
        tray.addEventListener("dragstart", this.onDragStart.bind(this));
        tray.addEventListener("dragover", this.onDragOver.bind(this));
        tray.addEventListener("drop", this.onDrop.bind(this));
        content.addEventListener("dblclick", this.onDoubleClick.bind(this));
        exports.element2TrayMap.set(tray, this);
        this.setupKeyboardNavigation(tray);
        // if (this.isLabelTrayCopy) {
        //   element.classList.add("label-tray-copy");
        //   element.setAttribute("draggable", "false");
        //   const titleElement = element.querySelector(".tray-title");
        //   titleElement.setAttribute("contenteditable", "false");
        //   titleElement.style.pointerEvents = "none";
        // }
        // this.setupEventListeners(tray);
        return tray;
    }
    setupFocusTracking() {
        this.element.addEventListener("focus", () => {
            last_focused = this;
        }, true);
        this.element.addEventListener("click", () => {
            last_focused = this;
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
    // showTemplateSelectionDialog(): void {
    //   // Create the dialog element
    //   const dialog = document.createElement("div");
    //   dialog.classList.add("template-selection-dialog");
    //   // Generate the inner HTML
    //   dialog.innerHTML = `
    //       <h3>Select a Template:</h3>
    //       <select id="template-select">
    //         ${Object.keys(Tray.templates)
    //           .map(
    //             (key) =>
    //               `<option value="${key}">${Tray.templates[key].name}</option>`
    //           )
    //           .join("")}
    //       </select>
    //       <button id="create-template-btn">Create</button>
    //       <button id="cancel-btn">Cancel</button>
    //     `;
    //   // Append the dialog to the body
    //   document.body.appendChild(dialog);
    //   // Add event listener for the create button
    //   const createButton = document.getElementById("create-template-btn");
    //   const cancelButton = document.getElementById("cancel-btn");
    //   const templateSelect = document.getElementById("template-select") as HTMLSelectElement | null;
    //   if (createButton) {
    //     createButton.addEventListener("click", () => {
    //       if (templateSelect) {
    //         const selectedTemplate = templateSelect.value;
    //         this.addTemplateTray(selectedTemplate);
    //       }
    //       dialog.remove();
    //     });
    //   }
    //   // Add event listener for the cancel button
    //   if (cancelButton) {
    //     cancelButton.addEventListener("click", () => {
    //       dialog.remove();
    //     });
    //   }
    // }
    // showTemplateSelectionPopup(event: MouseEvent | TouchEvent): void {
    //   const popup = document.createElement("div");
    //   popup.classList.add("template-selection-popup");
    //   popup.style.position = "fixed";
    //   popup.style.zIndex = "10000";
    //   // Determine the position based on the event type
    //   let top: number;
    //   let left: number;
    //   if (event instanceof MouseEvent) {
    //     // For mouse events, use clientX and clientY
    //     left = event.clientX;
    //     top = event.clientY;
    //   } else if (event instanceof TouchEvent && event.touches.length > 0) {
    //     // For touch events, use the first touch point's clientX and clientY
    //     left = event.touches[0].clientX;
    //     top = event.touches[0].clientY;
    //   } else {
    //     // Default position if event data is not available
    //     left = 0;
    //     top = 0;
    //   }
    //   popup.style.top = `${top}px`;
    //   popup.style.left = `${left}px`;
    //   popup.innerHTML = `
    //     <h3>Select a Template:</h3>
    //     <div class="template-list">
    //       ${Object.keys(Tray.templates)
    //         .map(
    //           (key) => `
    //           <div class="template-item" data-template="${key}">
    //             <h4>${Tray.templates[key].name}</h4>
    //             <small>${Tray.templates[key].children.length} items</small>
    //           </div>
    //         `
    //         )
    //         .join("")}
    //     </div>
    //   `;
    //   document.body.appendChild(popup);
    //   popup.addEventListener("click", (e: MouseEvent) => {
    //     const target = e.target as HTMLElement;
    //     const templateItem = target.closest(".template-item") as HTMLElement | null;
    //     if (templateItem) {
    //       const selectedTemplate = templateItem.getAttribute("data-template");
    //       if (selectedTemplate) {
    //         this.addTemplateTray(selectedTemplate);
    //       }
    //       popup.remove();
    //     }
    //   });
    //   // Close the popup when clicking outside of it
    //   const closePopup = (e: MouseEvent) => {
    //     const target = e.target as HTMLElement;
    //     if (!popup.contains(target) && !target.closest(".context-menu")) {
    //       popup.remove();
    //       document.removeEventListener("click", closePopup);
    //     }
    //   };
    //   document.addEventListener("click", closePopup);
    // }
    // createTemplateTray(templateName:string) {
    //   const template = Tray.templates[templateName];
    //   if (!template) return null;
    //   const templateTray = new Tray(
    //     this.id,
    //     Date.now().toString(),
    //     template.name
    //   );
    //   const createChildren = (parentTray, children) => {
    //     children.forEach((child) => {
    //       if (typeof child === "string") {
    //         const childTray = new Tray(
    //           parentTray.id,
    //           Date.now().toString(),
    //           child
    //         );
    //         parentTray.addChild(childTray);
    //       } else {
    //         const childTray = new Tray(
    //           parentTray.id,
    //           Date.now().toString(),
    //           child.name
    //         );
    //         parentTray.addChild(childTray);
    //         if (child.children) {
    //           createChildren(childTray, child.children);
    //         }
    //       }
    //     });
    //   };
    //   createChildren(templateTray, template.children);
    //   return templateTray.children;
    // }
    // outputAsMarkdown(depth = 0) {
    //   let markdown = "#".repeat(depth + 1) + " " + this.name + "\n\n";
    //   if (this.children.length > 0) {
    //     this.children.forEach((child) => {
    //       markdown += child.outputAsMarkdown(depth + 1);
    //     });
    //   }
    //   return markdown;
    // }
    toggleFlexDirection() {
        this.flexDirection = this.flexDirection === "column" ? "row" : "column";
        this.updateFlexDirection();
        this.updateChildrenAppearance(); // Add this line
        (0, io_1.saveToLocalStorage)();
    }
    addLabel(event) {
        const labelSelector = document.createElement("div");
        labelSelector.classList.add("label-selector");
        console.log(globalLabelManager.getAllLabels());
        labelSelector.innerHTML = `
      <select id="existingLabels">
        <option value="">-- 既存のラベルを選択 --</option>
        ${Object.entries(globalLabelManager.getAllLabels())
            .map(([name, color]) => `<option value="${name}" style="background-color: ${color};">${name}</option>`)
            .join("")}
      </select>
      <button id="selectExistingLabel">選択</button>
      <div>または</div>
      <input type="text" id="newLabelName" placeholder="新しいラベル名">
      <input type="color" id="newLabelColor" value="#000000">
      <button id="addNewLabel">新しいラベルを追加</button>
    `;
        // Set the position of the popup
        const rect = event.target.getBoundingClientRect();
        labelSelector.style.position = "absolute";
        labelSelector.style.top = `${rect.bottom + window.scrollY}px`;
        labelSelector.style.left = `${rect.left + window.scrollX}px`;
        document.body.appendChild(labelSelector);
        const selectExistingLabelButton = document.getElementById("selectExistingLabel");
        const existingLabels = document.getElementById("existingLabels");
        const newLabelName = document.getElementById("newLabelName");
        const newLabelColor = document.getElementById("newLabelColor");
        if (selectExistingLabelButton && existingLabels) {
            selectExistingLabelButton.addEventListener("click", () => {
                const selectedId = existingLabels.value;
                if (selectedId) {
                    this.addExistingLabel(selectedId);
                    labelSelector.remove();
                }
            });
        }
        const addNewLabelButton = document.getElementById("addNewLabel");
        if (addNewLabelButton && newLabelName && newLabelColor) {
            addNewLabelButton.addEventListener("click", () => {
                const name = newLabelName.value;
                const color = newLabelColor.value;
                if (name) {
                    const newId = this.addNewLabelToManager(name, color);
                    this.addExistingLabel(newId);
                    labelSelector.remove();
                }
            });
        }
        // Add click event listener to close the popup when clicking outside
        document.addEventListener("click", (e) => {
            const target = e.target;
            if (!labelSelector.contains(target) && target !== event.target) {
                labelSelector.remove();
            }
        }, { once: true });
    }
    addExistingLabel(labelId) {
        if (!this.labels.includes(labelId)) {
            this.labels.push(labelId);
            this.updateLabels();
            (0, io_1.saveToLocalStorage)(); // Save to local storage after adding the label
        }
    }
    addNewLabelToManager(name, color) {
        globalLabelManager.addLabel(name, color);
        const id = name; // Assuming the name is used as the ID
        this.addExistingLabel(id); // Add the new label to the local list
        (0, io_1.saveToLocalStorage)(); // Save to local storage after adding the label
        return id;
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
    updateLabels() {
        let labelContainer = this.element.querySelector(".tray-labels");
        if (!labelContainer) {
            const titleContainer = this.element.querySelector(".tray-title-container");
            if (titleContainer) {
                labelContainer = document.createElement("div");
                labelContainer.classList.add("tray-labels");
                titleContainer.appendChild(labelContainer);
            }
        }
        if (labelContainer) {
            labelContainer.innerHTML = "";
            if (this.labels && this.labels.length > 0) {
                labelContainer.style.display = "block";
            }
            this.labels.forEach((labelName) => {
                const labelColor = globalLabelManager.getLabel(labelName);
                if (labelColor) {
                    const labelElement = document.createElement("span");
                    labelElement.classList.add("tray-label");
                    labelElement.textContent = labelName;
                    labelElement.style.backgroundColor = labelColor;
                    labelElement.addEventListener("click", (event) => this.onLabelClick(event, labelName));
                    labelContainer.appendChild(labelElement);
                    globalLabelManager.registLabeledTray(labelName, this);
                }
            });
            (0, io_1.saveToLocalStorage)();
        }
    }
    onLabelClick(event, labelName) {
        event.stopPropagation();
        if (confirm(`Do you want to remove the label "${labelName}"?`)) {
            this.removeLabel(labelName);
        }
    }
    removeLabel(labelName) {
        this.labels = this.labels.filter((label) => label !== labelName);
        globalLabelManager.unregisterLabeledTray(labelName, this);
        this.updateLabels();
        (0, io_1.saveToLocalStorage)();
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
    //     saveToLocalStorage();
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
    //   saveToLocalStorage();
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
        (0, io_1.saveToLocalStorage)();
    }
    changeBorderColor(color) {
        // this.borderColor = color;
        this.updateBorderColor(color);
        (0, io_1.saveToLocalStorage)();
    }
    setupTitleEditing(titleElement) {
        titleElement.addEventListener("dblclick", (event) => {
            event.stopPropagation();
            this.startTitleEdit(titleElement);
            (0, io_1.saveToLocalStorage)();
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
        this.onContextMenu(event);
    }
    finishTitleEdit(titleElement) {
        titleElement.setAttribute("contenteditable", "false");
        this.name = (titleElement.textContent || "").trim();
        titleElement.textContent = this.name;
        // titleElement.removeEventListener("keydown", this.keyDownHandler);
        // titleElement.removeEventListener("blur", this.blurHandler);
        this.isEditing = false;
        (0, io_1.saveToLocalStorage)();
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
        element.addEventListener("keydown", this.handleKeyDown.bind(this));
    }
    handleKeyDown(event) {
        if (menuOpening) {
            return;
        }
        event.stopPropagation();
        if (this.isEditing) {
            switch (event.key) {
                case "Enter":
                    if (!event.shiftKey) {
                        event.preventDefault();
                        this.finishTitleEdit(event.target);
                    }
                    break;
                case "Escape":
                    event.preventDefault();
                    this.cancelTitleEdit(event.target);
                    break;
            }
            return;
        }
        this.element.focus();
        switch (event.key) {
            case "ArrowUp":
                event.preventDefault();
                this.moveFocus("up");
                break;
            case "ArrowDown":
                event.preventDefault();
                this.moveFocus("down");
                break;
            case "ArrowLeft":
                event.preventDefault();
                this.moveFocus("left");
                break;
            case "ArrowRight":
                event.preventDefault();
                this.moveFocus("right");
                break;
            case "Enter":
                event.preventDefault();
                if (event.ctrlKey) {
                    this.addNewChild();
                }
                else if (event.shiftKey) {
                    this.toggleEditMode();
                }
                else {
                    this.toggleFold();
                }
                break;
            case "Delete":
                event.preventDefault();
                if (event.ctrlKey) {
                    this.deleteTray();
                }
                break;
            case "c":
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.copyTray();
                }
                break;
            case "x":
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.cutTray();
                }
                break;
            case "v":
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.pasteTray();
                }
                break;
            // case " ":
            //   if (event.ctrlKey) {
            //     event.preventDefault();
            //     this.onContextMenu(event);
            //   }
            //   break;
        }
    }
    moveFocus(direction) {
        if (this.isEditing) {
            return;
        }
        if (menuOpening) {
            return;
        }
        let nextTray;
        switch (direction) {
            case "up":
                nextTray = this.getPreviousSibling();
                break;
            case "down":
                nextTray = this.getNextSibling();
                break;
            case "left":
                nextTray = (0, utils_1.getTrayFromId)(this.parentId);
                break;
            case "right":
                nextTray = this.children[0];
                break;
        }
        if (nextTray) {
            nextTray.element.focus();
        }
    }
    getPreviousSibling() {
        if (this.parentId) {
            const parent = (0, utils_1.getTrayFromId)(this.parentId);
            const index = parent.children.indexOf(this);
            return parent.children[index - 1] || null;
        }
        return null;
    }
    getNextSibling() {
        if (this.parentId) {
            const parent = (0, utils_1.getTrayFromId)(this.parentId);
            const index = parent.children.indexOf(this);
            return parent.children[index + 1] || null;
        }
        return null;
    }
    toggleEditMode() {
        const titleElement = this.element.querySelector(".tray-title");
        if (!titleElement) {
            return;
        }
        if (titleElement.getAttribute("contenteditable") === "true") {
            this.finishTitleEdit(titleElement);
        }
        else {
            this.startTitleEdit(titleElement);
        }
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
        const movingTray = (0, utils_1.getTrayFromId)(movingId);
        if (!movingTray)
            return; // Exit if the tray doesn't exist
        const parentTray = (0, utils_1.getTrayFromId)(movingTray.parentId);
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
        (0, io_1.saveToLocalStorage)();
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
        // Optionally, you can manage border color here if needed
        // if (this.children.length === 1) {
        //   const color = getRandomColor();
        //   this.borderColor = color;
        //   this.updateBorderColor();
        // }
    }
    onContextMenu(event) {
        event.preventDefault();
        event.stopPropagation();
        menuOpening = true;
        // Remove existing context menu
        const existingMenu = document.querySelector(".context-menu");
        existingMenu === null || existingMenu === void 0 ? void 0 : existingMenu.remove();
        // Determine the color to show
        const showColor = this.borderColor || (0, utils_1.getWhiteColor)();
        // Create the context menu
        const menu = document.createElement("div");
        menu.classList.add("context-menu");
        menu.setAttribute("tabindex", "-1");
        menu.innerHTML = `
      <div class="menu-item" data-action="fetchTrayFromServer" tabindex="0">Fetch Tray from Server</div>
      <div class="menu-item" data-action="convertToNetwork" tabindex="1">Convert to NetworkTray</div>
      <div class="menu-item" data-action="open_this_in_other" tabindex="2">Open This in Other</div>
      <div class="menu-item" data-action="toggleFlexDirection" tabindex="3">Toggle Flex Direction</div>
      <div class="menu-item" data-action="copy" tabindex="0">Copy</div>
      <div class="menu-item" data-action="paste" tabindex="0">Paste</div>
      <div class="menu-item" data-action="cut" tabindex="0">Cut</div>
      <div class="menu-item" data-action="delete" tabindex="0">Remove</div>
      <div class="menu-item" data-action="add_fetch_networkTray_to_child" tabindex="0">Add Fetch NetworkTray to Child</div>
      <div class="menu-item" data-action="add_child_from_localStorage" tabindex="0">Add Child from Local Storage</div>
      <div class="menu-item" data-action="addLabelTray" tabindex="0">Add Label Tray</div>
      <div class="menu-item" data-action="addLabel" tabindex="0">Add Label</div>
      <div class="menu-item" data-action="removeLabel" tabindex="0">Edit Labels</div>
      <div class="menu-item" data-action="outputMarkdown" tabindex="0">Output as Markdown</div>
      <div class="menu-item" data-action="addTemplateTray" tabindex="0">Add Template Tray</div>
      <div class="menu-item" tabindex="0">
        <input type="color" id="borderColorPicker" value="${showColor}">
      </div>
    `;
        document.body.appendChild(menu);
        this.positionMenu(event, menu);
        // Add event listeners
        const menuItems = menu.querySelectorAll(".menu-item");
        let currentFocus = 0;
        const handler = (e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                menuItems[currentFocus].classList.remove("focused");
                currentFocus =
                    e.key === "ArrowDown"
                        ? (currentFocus + 1) % menuItems.length
                        : (currentFocus - 1 + menuItems.length) % menuItems.length;
                menuItems[currentFocus].classList.add("focused");
                menuItems[currentFocus].focus();
            }
            else if (e.key === "Enter") {
                menuItems[currentFocus].click();
            }
            else if (e.key === "Escape") {
                menu.remove();
            }
        };
        document.addEventListener("keydown", handler.bind(this));
        menuItems[0].classList.add("focused");
        menuItems[0].focus();
        const colorPicker = menu.querySelector("#borderColorPicker");
        colorPicker.addEventListener("change", (e) => {
            const target = e.target;
            this.borderColor = target.value;
            this.changeBorderColor(target.value);
            this.updateAppearance();
            menu.remove();
        });
        const handleMenuClick = (e) => {
            const action = e.target.getAttribute("data-action");
            if (action)
                this.executeMenuAction(action, event, menu);
        };
        const handleOutsideClick = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener("click", handleOutsideClick);
                menuOpening = false;
            }
        };
        menu.addEventListener("click", handleMenuClick);
        document.addEventListener("click", handleOutsideClick);
        this.setupKeyboardNavigation(this.element);
        menuOpening = false;
    }
    positionMenu(event, menu) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        // Determine the initial position based on the event type
        let left;
        let top;
        if (event instanceof MouseEvent) {
            // For mouse events, use clientX and clientY
            left = event.clientX;
            top = event.clientY;
        }
        else if (event instanceof TouchEvent && event.touches.length > 0) {
            // For touch events, use the first touch point's clientX and clientY
            left = event.touches[0].clientX;
            top = event.touches[0].clientY;
        }
        else {
            // Default position if event data is not available
            left = 0;
            top = 0;
        }
        menu.style.visibility = "hidden";
        menu.style.display = "block";
        menu.style.position = "absolute";
        setTimeout(() => {
            const menuWidth = menu.offsetWidth;
            const menuHeight = menu.offsetHeight;
            // Adjust position to fit within the viewport
            left = left > viewportWidth / 2 ? left - menuWidth : left;
            top = top > viewportHeight / 2 ? top - menuHeight : top;
            left = Math.max(0, Math.min(left, viewportWidth - menuWidth));
            top = Math.max(0, Math.min(top, viewportHeight - menuHeight));
            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;
            menu.style.visibility = "visible";
        }, 0);
    }
    executeMenuAction(action, event, menu) {
        switch (action) {
            case "copy":
                this.copyTray();
                break;
            case "rename":
                this.renameTray();
                break;
            case "cut":
                this.cutTray();
                break;
            case "paste":
                this.pasteTray();
                break;
            case "addLabel":
                this.showLabelSelector(event);
                break;
            case "removeLabel":
                this.showLabelRemover();
                break;
            case "delete":
                this.deleteTray();
                break;
                break;
            case "toggleFlexDirection":
                this.toggleFlexDirection();
                break;
            //   case "convertToNetwork":
            //     this.convertToNetworkTray();
            //     break;
            //   case "add_fetch_networkTray_to_child":
            // this.add_fetch_networkTray_to_child();
            // break;
            // case "open_this_in_other":
            //   this.open_this_in_other();
            //   break;
            case "add_child_from_localStorage":
                this.add_child_from_localStorage();
                break;
            //   case "fetchTrayFromServer":
            //     this.fetchTrayList();
            //     break;
            //   case "addLabelTray":
            //     this.addLabelTray();
            //     break;
            //   case "outputMarkdown":
            //     this.showMarkdownOutput();
            //     break;
            // case "addTemplateTray":
            //   console.log("Add Template Tray clicked");
            //   this.showTemplateSelectionPopup(event);
            //   break;
        }
        menu.remove();
    }
    // Add this method to your class if it doesn't exist
    // changeBorderColor(color) {
    //   this.borderColor = color;
    //   this.style.borderColor = color;
    //   // Add any other logic you need when changing the border color
    // }
    // addTemplateTray(templateName) {
    //   const templateTrays = this.createTemplateTray(templateName);
    //   if (templateTrays) {
    //     templateTrays.map((t) => this.addChild(t));
    //     this.isFolded = false;
    //     this.updateAppearance();
    //     saveToLocalStorage();
    //   }
    // }
    //   addLabelTray(): void {
    //     const labels = Object.keys(globalLabelManager.getAllLabels());
    //     const labelSelector = document.createElement("div");
    //     labelSelector.classList.add("label-selector");
    //     labelSelector.innerHTML = `
    //       <h3>Select a label to create a Label Tray:</h3>
    //       <select id="labelTraySelect">
    //         ${labels
    //           .map((label) => `<option value="${label}">${label}</option>`)
    //           .join("")}
    //       </select>
    //       <button id="createLabelTrayBtn">Create Label Tray</button>
    //     `;
    //     document.body.appendChild(labelSelector);
    //     const createButton = document.getElementById("createLabelTrayBtn") as HTMLButtonElement | null;
    //     const labelSelect = document.getElementById("labelTraySelect") as HTMLSelectElement | null;
    //     if (createButton && labelSelect) {
    //       createButton.addEventListener("click", () => {
    //         const selectedLabel = labelSelect.value;
    //         this.createLabelTray(selectedLabel);
    //         labelSelector.remove();
    //       });
    //     }
    //   }
    //   createLabelTray(selectedLabel) {
    //     const root = this.getRootTray();
    //     const serialized = root.serialize();
    //     console.log(serialized);
    //     let copyied = deserializeDOM(serialized);
    //     console.log(copyied);
    //     copyied = copyied.labelFilteringWithDestruction(selectedLabel, copyied);
    //     console.log(copyied);
    //     if (copyied) {
    //       let ret = new Tray(
    //         this.id,
    //         "LABEL_" + selectedLabel,
    //         selectedLabel + " LABEL_Tray",
    //         [],
    //         globalLabelManager.getLabel(selectedLabel)
    //       );
    //       copyied.children.map((t) => ret.addChild(t));
    //       this.addChild(ret);
    //       this.updateAppearance();
    //     } else {
    //       notifyUser("no tray found");
    //     }
    //   }
    showLabelSelector(event) {
        // Remove existing label selector
        const existingSelector = document.querySelector(".label-selector");
        existingSelector === null || existingSelector === void 0 ? void 0 : existingSelector.remove();
        const labelSelector = document.createElement("div");
        labelSelector.classList.add("label-selector");
        labelSelector.innerHTML = `
      <select id="existingLabels">
        <option value="">-- Select existing label --</option>
        ${Object.entries(globalLabelManager.getAllLabels())
            .map(([labelName, color]) => `<option value="${labelName}" style="background-color: ${color};">${labelName}</option>`)
            .join("")}
      </select>
      <button id="selectExistingLabel">Select</button>
      <div>or</div>
      <input type="text" id="newLabelName" placeholder="New label name">
      <input type="color" id="newLabelColor" value="#000000">
      <button id="addNewLabel">Add new label</button>
    `;
        // Set the popup position
        const [left, top] = this.getEventCoordinates(event);
        labelSelector.style.position = "fixed";
        labelSelector.style.top = `${top}px`;
        labelSelector.style.left = `${left}px`;
        document.body.appendChild(labelSelector);
        const selectButton = document.getElementById("selectExistingLabel");
        const existingLabels = document.getElementById("existingLabels");
        const newLabelNameInput = document.getElementById("newLabelName");
        const newLabelColorInput = document.getElementById("newLabelColor");
        const addButton = document.getElementById("addNewLabel");
        if (selectButton && existingLabels) {
            selectButton.addEventListener("click", () => {
                const selectedId = existingLabels.value;
                if (selectedId) {
                    this.addExistingLabel(selectedId);
                    labelSelector.remove();
                }
            });
        }
        if (addButton && newLabelNameInput && newLabelColorInput) {
            addButton.addEventListener("click", () => {
                const name = newLabelNameInput.value;
                const color = newLabelColorInput.value;
                if (name) {
                    const newId = this.addNewLabelToManager(name, color);
                    this.addExistingLabel(newId);
                    labelSelector.remove();
                }
            });
        }
        // Add event listener to close the popup when clicking outside
        document.addEventListener("click", (e) => {
            const target = e.target;
            if (!labelSelector.contains(target) &&
                !target.closest(".context-menu")) {
                labelSelector.remove();
            }
        }, { once: true });
    }
    getEventCoordinates(event) {
        if (event instanceof MouseEvent) {
            return [event.clientX, event.clientY];
        }
        else if (event instanceof TouchEvent && event.touches.length > 0) {
            return [event.touches[0].clientX, event.touches[0].clientY];
        }
        return [0, 0];
    }
    showLabelRemover() {
        const labelRemover = document.createElement("div");
        labelRemover.classList.add("label-remover");
        labelRemover.innerHTML = `
      <h3>Select labels to remove:</h3>
      ${this.labels
            .map((label) => `
          <div>
            <input type="checkbox" id="${label}" value="${label}">
            <label for="${label}">${label}</label>
          </div>
        `)
            .join("")}
      <button id="removeLabelBtn">Remove Selected Labels</button>
    `;
        document.body.appendChild(labelRemover);
        const removeButton = document.getElementById("removeLabelBtn");
        if (removeButton) {
            removeButton.addEventListener("click", () => {
                const checkboxes = labelRemover.querySelectorAll('input[type="checkbox"]:checked');
                checkboxes.forEach((checkbox) => {
                    this.removeLabel(checkbox.value);
                });
                labelRemover.remove();
            });
        }
    }
    copyTray() {
        const serialized = (0, io_1.serialize)((0, utils_2.cloneTray)(this));
        navigator.clipboard.writeText(serialized);
    }
    renameTray() {
        const title = this.element.querySelector(".tray-title");
        if (!title) {
            return;
        }
        title.setAttribute("contenteditable", "true");
        // title.focus();
        (0, io_1.saveToLocalStorage)();
    }
    cutTray() {
        const serialized = (0, io_1.serialize)((0, utils_2.cloneTray)(this));
        navigator.clipboard.writeText(serialized);
    }
    pasteTray() {
        const serialized = navigator.clipboard.readText().then((str) => {
            try {
                let newTray = (0, io_1.deserialize)(JSON.parse(str));
                if (!newTray) {
                    return;
                }
                this.addChild(newTray);
            }
            catch (_a) {
                const texts = str.split("\n").filter((line) => line.trim() !== "");
                const trays = texts.map((text) => new Tray(this.id, (0, utils_2.generateUUID)(), text));
                trays.map((t) => this.addChild(t));
            }
        });
    }
    deleteTray() {
        const parent = (0, utils_1.getTrayFromId)(this.parentId);
        const indexInParent = parent.children.findIndex((child) => child.id === this.id);
        parent.removeChild(this.id);
        this.element.remove();
        this.moveFocusAfterDelete(parent, indexInParent);
        (0, io_1.saveToLocalStorage)();
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
    //   convertToNetworkTray(url = "", filename = "") {
    //     const networkTray = new NetworkTray(
    //       this.parentId,
    //       this.id,
    //       this.name,
    //       [],
    //       this.borderColor,
    //       this.labels,
    //       this.isChecked,
    //       url,
    //       filename
    //     );
    //     this.children.forEach((childTray) => {
    //       networkTray.addChild(childTray);
    //     });
    //     networkTray.isSplit = this.isSplit;
    //     networkTray.isFolded = this.isFolded;
    //     networkTray.flexDirection = this.flexDirection;
    //     if (this.id == "0") {
    //       document.body.innerHTML = "";
    //       document.body.appendChild(networkTray.element);
    //     } else {
    //       let parent = getTrayFromId(this.parentId);
    //       parent.addChild(networkTray);
    //       parent.removeChild(this);
    //       parent.updateAppearance();
    //     }
    //     networkTray.updateAppearance();
    //     networkTray.updateChildrenAppearance();
    //   }
    //   add_fetch_networkTray_to_child() {
    //     let tmp = new NetworkTray(
    //       this.id,
    //       generateUUID(),
    //       "Existing networkTray",
    //       [],
    //       null,
    //       "",
    //       ""
    //     );
    //     // tmp.showNetworkOptions();
    //     tmp.downloadData().then((tray) => {
    //       this.addChild(tray);
    //       tray.updateAppearance();
    //       tray.updateChildrenAppearance();
    //     });
    //     this.updateAppearance();
    //   }
    // open_this_in_other() {
    //   const data = JSON.stringify(this.serialize());
    //   const id = generateUUID();
    //   localStorage.setItem(id, data);
    //   window.open(window.location.href + "?sessionId=" + id, "_blank");
    // }
    add_child_from_localStorage() {
        const sessionId = prompt("Input the sessionId", "");
        if (!sessionId) {
            return;
        }
        const data = localStorage.getItem(sessionId);
        if (data) {
            const tray = (0, io_1.deserialize)(JSON.parse(data));
            if (tray) {
                this.addChild(tray);
            }
        }
    }
}
exports.Tray = Tray;
Tray.colorPalette = [
    "#FF6B6B", // Red
    "#4ECDC4", // Teal
    "#45B7D1", // Light Blue
    "#FFA07A", // Light Salmon
    "#98D8C8", // Mint
    "#F7DC6F", // Yellow
    "#BB8FCE", // Light Purple
    "#82E0AA", // Light Green
    "#F8C471", // Light Orange
    "#85C1E9", // Sky Blue
    "#f5f5f5", // Tray color
];
Tray.templates = {
    // TODO Trayで記述すればいいだろ
    Task: {
        name: "tasker",
        children: ["PLANNING", "PLANNED", "PROGRESS", "DONE"],
        labels: [],
    },
    "Project Structure": {
        name: "Project Structure",
        children: [{ name: "思索" }, { name: "実装方針" }, { name: "実装中" }],
    },
    importance_urgence: {
        name: "importance - urgence",
        children: ["1-1", "1-0", "0-1", "0-0"],
    },
    importance: {
        name: "konsaruImportance",
        children: ["MUST", "SHOULD", "COULD", "WONT"],
    },
};
// function deserialize(data) {
//   let tray;
//   if (data.host_url == null) {
//     tray = new Tray(
//       data.parentId,
//       data.id,
//       data.name,
//       [],
//       data.borderColor,
//       data.labels,
//       data.isChecked,
//       data.created_dt == null ? new Date() : data.created_dt
//     );
//   } else {
//     tray = new NetworkTray(
//       data.parentId,
//       data.id,
//       data.name,
//       [],
//       data.borderColor,
//       data.labels,
//       data.isChecked,
//       data.host_url,
//       data.filename,
//       data.created_dt == null ? new Date() : data.created_dt
//     );
//   }
//   let children = data.children
//   .map(d => deserialize(d))
//   .sort((a, b) => new Date(a.created_dt) - new Date(b.created_dt));
//   console.log(children)
//   children.forEach(childTray => {
//     tray.addChild(childTray)
//   });
//   tray.isSplit = data.isSplit;
//   tray.flexDirection = data.flexDirection || 'column';
//   tray.updateFlexDirection();
//   if (tray.isSplit) {
//     tray.element.classList.add('split');
//     tray.updateSplitDirection();
//   }
//   return tray;
// }
// class NetworkTray extends Tray {
//   constructor(
//     parentId,
//     id,
//     name,
//     children = [],
//     color = null,
//     labels = [],
//     isChecked = false,
//     url = "",
//     filename = "",
//     created_dt
//   ) {
//     super(parentId, id, name, children, color, labels, isChecked, created_dt);
//     if (url.endsWith("/")) {
//       url = url.slice(0, -1);
//     }
//     this.host_url = url;
//     this.filename = filename;
//     this.autoUpload = false;
//     if ((url.length == 0) | (filename.length == 0)) {
//       this.showNetworkOptions();
//     }
//     this.updateNetworkInfo();
//   }
//   uploadData() {
//     const data = this.serialize();
//     return fetch(`${this.host_url}/tray/save`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         filename: this.filename,
//       },
//       body: JSON.stringify({ data: data }),
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Network response was not ok");
//         }
//         return response.text();
//       })
//       .then((result) => {
//         console.log(result);
//         this.showUploadNotification("Data uploaded successfully.");
//       })
//       .catch((error) => {
//         console.error("Error:", error);
//         this.showUploadNotification("Failed to upload data.", true);
//         throw error;
//       });
//   }
//   downloadData() {
//     return fetch(`${this.host_url}/tray/load`, {
//       method: "GET",
//       headers: {
//         filename: this.filename,
//       },
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Network response was not ok");
//         }
//         return response.json();
//       })
//       .then((data) => {
//         let tray = this.deserialize(data);
//         // let parent = getTrayFromId(this.parentId);
//         // parent.addChild(tray);
//         // parent.updateAppearance()
//         // this.element = tray.element
//         // notifyUser('データのダウンロードに成功しました。');
//         return tray;
//       })
//       .catch((error) => {
//         console.error("Error:", error);
//         notifyUser("データのダウンロードに失敗しました。");
//         throw error;
//       });
//   }
//   serialize() {
//     return {
//       ...super.serialize(),
//       host_url: this.host_url,
//       filename: this.filename,
//     };
//   }
//   deserialize(data) {
//     let tray = deserialize(data);
//     // if (tray.host_url){tray.updateNetworkInfo();}
//     return tray;
//   }
//   createElement() {
//     const element = super.createElement();
//     // const networkInfoElement = document.createElement('div');
//     // networkInfoElement.classList.add('network-tray-info');
//     // this.updateNetworkInfo(networkInfoElement);
//     // Create a container for the buttons
//     const buttonContainer = document.createElement("div");
//     buttonContainer.classList.add("network-tray-buttons");
//     buttonContainer.style.display = "flex";
//     buttonContainer.style.flexDirection = "column";
//     buttonContainer.style.alignItems = "flex-start";
//     buttonContainer.style.gap = "5px"; // Add some space between buttons
//     const uploadButton = document.createElement("button");
//     uploadButton.textContent = "Upload";
//     uploadButton.addEventListener("click", () => this.uploadData());
//     const downloadButton = document.createElement("button");
//     downloadButton.textContent = "Download";
//     downloadButton.addEventListener("click", () =>
//       this.ondownloadButtonPressed()
//     );
//     const autoUploadButton = document.createElement("button");
//     autoUploadButton.textContent = `Auto Upload: ${
//       this.autoUpload ? "On" : "Off"
//     }`;
//     autoUploadButton.style.backgroundColor = this.autoUpload ? "green" : "";
//     autoUploadButton.style.color = this.autoUpload ? "white" : "";
//     autoUploadButton.addEventListener("click", () => this.toggleAutoUpload());
//     // Add buttons to the container
//     buttonContainer.appendChild(uploadButton);
//     buttonContainer.appendChild(downloadButton);
//     // buttonContainer.appendChild(autoUploadButton);
//     // Add network info and button container to the tray
//     const titleContainer = element.querySelector(".tray-title-container");
//     // titleContainer.appendChild(networkInfoElement);
//     titleContainer.appendChild(buttonContainer);
//     // Adjust the layout of the title container
//     titleContainer.style.display = "flex";
//     titleContainer.style.alignItems = "center";
//     titleContainer.style.justifyContent = "space-between";
//     return element;
//   }
//   setupAutoUpload() {
//     this.lastSerializedState = JSON.stringify(this.serialize());
//     this.autoUploadInterval = setInterval(() => {
//       const currentState = JSON.stringify(this.serialize());
//       if (currentState !== this.lastSerializedState) {
//         this.uploadData()
//           .then(() => {
//             this.showUploadNotification("Auto-upload successful.");
//             this.lastSerializedState = currentState;
//           })
//           .catch((error) => {
//             console.error("Auto-upload failed:", error);
//             this.showUploadNotification(
//               "Auto-upload failed. Please check your connection.",
//               true
//             );
//           });
//       }
//     }, 5000); // Check for changes every 5 seconds
//   }
//   showUploadNotification(message, isError = false) {
//     const notification = document.createElement("div");
//     notification.textContent = message;
//     notification.style.position = "fixed";
//     notification.style.bottom = "20px";
//     notification.style.right = "20px";
//     notification.style.padding = "10px";
//     notification.style.borderRadius = "5px";
//     notification.style.color = "white";
//     notification.style.backgroundColor = isError ? "red" : "green";
//     notification.style.zIndex = "1000";
//     document.body.appendChild(notification);
//     setTimeout(() => {
//       notification.style.transition = "opacity 0.5s";
//       notification.style.opacity = "0";
//       setTimeout(() => {
//         document.body.removeChild(notification);
//       }, 500);
//     }, 3000);
//   }
//   removeAutoUpload() {
//     if (this.autoUploadInterval) {
//       clearInterval(this.autoUploadInterval);
//       this.autoUploadInterval = null;
//     }
//     this.lastSerializedState = null;
//   }
//   toggleAutoUpload() {
//     this.autoUpload = !this.autoUpload;
//     const autoUploadButton = this.element.querySelector(
//       ".network-tray-buttons button:last-child"
//     );
//     autoUploadButton.textContent = `Auto Upload: ${
//       this.autoUpload ? "On" : "Off"
//     }`;
//     autoUploadButton.style.backgroundColor = this.autoUpload ? "green" : "";
//     autoUploadButton.style.color = this.autoUpload ? "white" : "";
//     if (this.autoUpload) {
//       this.setupAutoUpload();
//     } else {
//       this.removeAutoUpload();
//     }
//     saveToLocalStorage();
//   }
//   onContextMenu(event) {
//     super.onContextMenu(event);
//     const menu = document.querySelector(".context-menu");
//     const networkOptions = document.createElement("div");
//     networkOptions.classList.add("menu-item");
//     networkOptions.textContent = "Network Options";
//     networkOptions.addEventListener("click", () => this.showNetworkOptions());
//     menu.appendChild(networkOptions);
//   }
//   showNetworkOptions() {
//     let d;
//     if (this.host_url) {
//       d = this.host_url;
//     } else {
//       d = localStorage.getItem("defaultServer");
//     }
//     const url = prompt("Enter URL:", d);
//     const filename = prompt("Enter filename:", this.filename);
//     if (url) this.host_url = url;
//     if (filename) this.filename = filename;
//     this.updateNetworkInfo();
//     saveToLocalStorage();
//   }
//   ondownloadButtonPressed() {
//     // First, show a confirmation dialog
//     if (confirm("Are you sure you want to download?")) {
//       this.downloadData()
//         .then((downloaded) => {
//           // Update the current tray with the downloaded data
//           let parent = getTrayFromId(this.parentId);
//           this.deleteTray();
//           parent.addChild(downloaded);
//           parent.updateAppearance();
//           // Notify user of successful download
//           notifyUser("Download completed successfully.");
//         })
//         .catch((error) => {
//           console.error("Download failed:", error);
//           notifyUser("Download failed. Please check your connection.");
//         });
//     } else {
//       // If user cancels, notify them
//       notifyUser("Download cancelled.");
//     }
//   }
//   updateNetworkInfo(
//     element = this.element.querySelector(".network-tray-buttons")
//   ) {
//     if (element) {
//       // Clear existing content
//       element.innerHTML = "";
//       // Create URL button
//       const urlButton = document.createElement("button");
//       urlButton.textContent = "URL";
//       const uploadButton = document.createElement("button");
//       uploadButton.textContent = "Upload";
//       uploadButton.addEventListener("click", () => this.uploadData());
//       const downloadButton = document.createElement("button");
//       downloadButton.textContent = "Download";
//       downloadButton.addEventListener("click", () =>
//         this.ondownloadButtonPressed()
//       );
//       const autoUploadButton = document.createElement("button");
//       autoUploadButton.textContent = `Auto Upload: ${
//         this.autoUpload ? "On" : "Off"
//       }`;
//       autoUploadButton.style.backgroundColor = this.autoUpload ? "green" : "";
//       autoUploadButton.style.color = this.autoUpload ? "white" : "";
//       autoUploadButton.addEventListener("click", () => this.toggleAutoUpload());
//       // Set button color based on host_url validity
//       if (this.host_url && this.host_url.trim() !== "") {
//         urlButton.style.backgroundColor = "green";
//         urlButton.style.color = "white";
//       } else {
//         urlButton.style.backgroundColor = "gray";
//         urlButton.style.color = "white";
//       }
//       // Add tooltip functionality
//       urlButton.title = this.host_url || "No URL set";
//       // Create filename element
//       const filenameElement = document.createElement("div");
//       filenameElement.textContent = `${this.filename}`;
//       // Append elements to the container
//       element.appendChild(urlButton);
//       element.appendChild(filenameElement);
//       element.appendChild(uploadButton);
//       element.appendChild(downloadButton);
//       // element.appendChild(autoUploadButton)
//       // Add event listeners for custom tooltip (optional, for more control)
//       let tooltip;
//       urlButton.addEventListener("mouseover", (e) => {
//         tooltip = document.createElement("div");
//         tooltip.textContent = this.host_url || "No URL set";
//         tooltip.style.position = "absolute";
//         tooltip.style.backgroundColor = "black";
//         tooltip.style.color = "white";
//         tooltip.style.padding = "5px";
//         tooltip.style.borderRadius = "3px";
//         tooltip.style.zIndex = "1000";
//         document.body.appendChild(tooltip);
//         const rect = e.target.getBoundingClientRect();
//         tooltip.style.left = `${rect.left}px`;
//         tooltip.style.top = `${rect.bottom + 5}px`;
//       });
//       urlButton.addEventListener("mouseout", () => {
//         if (tooltip) {
//           document.body.removeChild(tooltip);
//           tooltip = null;
//         }
//       });
//     }
//   }
//   fetchTrayList() {
//     const defaultServer = localStorage.getItem("defaultServer") || "";
//     const url = prompt("Enter server URL:", defaultServer);
//     if (!url) return;
//     fetch(`${url}/tray/list`, {
//       method: "GET",
//     })
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Network response was not ok");
//         }
//         return response.json();
//       })
//       .then((data) => {
//         this.showTraySelectionDialog(url, data.files);
//       })
//       .catch((error) => {
//         console.error("Error:", error);
//         notifyUser("Failed to fetch tray list from server.");
//       });
//   }
// }
// function observeAndSaveChanges() {
//   const rootElement = getRootElement();
//   observeDOMChanges(rootElement);
//   observeWindowResize();
// }
// function observeWindowResize() {
//   window.addEventListener("resize", () => {
//     // updateAllTrayDirections();
//     saveToLocalStorage();
//   });
// }
// function uploadAllData(tray = getRootElement().__trayInstance) {
//   if (tray.uploadData) {
//     tray.uploadData();
//   }
//   if (tray.children.length) {
//     tray.children.map((t) => uploadAllData(t));
//   }
// }
// function deserializeDOM(data) {
//   let tray;
//   if (data.host_url == null) {
//     tray = new Tray(
//       data.parentId,
//       data.id,
//       data.name,
//       [],
//       data.borderColor,
//       data.labels,
//       data.isChecked,
//       data.created_dt
//     );
//   } else {
//     tray = new NetworkTray(
//       data.parentId,
//       data.id,
//       data.name,
//       [],
//       data.borderColor,
//       data.labels,
//       data.isChecked,
//       data.host_url,
//       data.filename
//     );
//     // tray.host_url = data.host_url
//   }
//   let children = data.children
//     .map((d) => deserialize(d))
//     .sort((a, b) => new Date(a.created_dt) - new Date(b.created_dt));
//   children.forEach((childTray) => {
//     tray.addChild(childTray);
//   });
//   console.log(children);
//   tray.foldChildren();
//   tray.updateAppearance();
//   tray.flexDirection = data.flexDirection || "column";
//   tray.updateFlexDirection();
//   tray.foldChildren();
//   tray.updateAppearance();
//   return tray;
// }
window.addEventListener("DOMContentLoaded", () => {
    let sessionId = (0, utils_3.getUrlParameter)("sessionId");
    if (sessionId == "new") {
        let id = (0, utils_2.generateUUID)();
        window.location.replace(window.location.href.replace("?sessionId=new", "?sessionId=" + id));
    }
    if (sessionId) {
        (0, io_1.loadFromLocalStorage)(sessionId);
    }
    else {
        (0, io_1.loadFromLocalStorage)();
    }
    if (sessionId) {
        const savedTitle = localStorage.getItem(sessionId + "_title");
        if (savedTitle) {
            document.title = savedTitle;
        }
    }
    const { leftBar } = (0, humberger_1.createHamburgerMenu)();
    document.body.insertBefore(leftBar, document.body.firstChild);
    const actionButtons = createActionButtons();
    document.body.appendChild(actionButtons);
    //   updateAllTrayDirections();
    //   window.addEventListener("resize", updateAllTrayDirections);
    const root = (0, utils_2.getRootElement)();
    last_focused = exports.element2TrayMap.get(root);
    root.focus();
});
// function updateAllTrayDirections() {
//   const allTrays = document.querySelectorAll(".tray");
//   allTrays.forEach((trayElement) => {
//     const trayInstance = trayElement.__trayInstance;
//     if (
//       trayInstance &&
//       typeof trayInstance.updateSplitDirection === "function"
//     ) {
//       trayInstance.updateSplitDirection();
//     }
//   });
// }
// function uploadAllData(tray = getRootElement().__trayInstance) {
//   if (tray.uploadData) {
//     tray.uploadData();
//   }
//   if (tray.children.length) {
//     tray.children.map((t) => uploadAllData(t));
//   }
// }
// function downloadAllData(tray = getRootElement().__trayInstance) {
//   if (tray.downloadData) {
//     tray.ondownloadBottonPressed();
//   }
//   if (tray.children.length) {
//     tray.children.map((t) => downloadAllData(t));
//   }
// }
// function import_network_tray_directly_as_root() {
//   let url = prompt("server host?", localStorage.getItem("defaultServer"));
//   let name = prompt("name?");
//   let tray_data;
//   fetch(`${url}/tray/load`, {
//     method: "GET",
//     headers: {
//       filename: name,
//     },
//   })
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error("Network response was not ok");
//       }
//       return response.json();
//     })
//     .then((data) => {
//       console.log(data);
//       localStorage.setItem("downloaded_data", JSON.stringify(data));
//       notifyUser("データのダウンロードに成功しました。");
//       return data;
//     })
//     .catch((error) => {
//       console.error("Error:", error);
//       notifyUser("データのダウンロードに失敗しました。");
//     });
//   document.body.innerHTML = "";
//   loadFromLocalStorage("downloaded_data");
//   saveToLocalStorage();
//   hamburgerElements = createHamburgerMenu();
//   updateAllTrayDirections();
//   window.addEventListener("resize", updateAllTrayDirections);
// }
// function set_default_server() {
//   let url = localStorage.getItem("defaultServer");
//   url = prompt("set default URL", url);
//   localStorage.setItem("defaultServer", url);
// }
// function set_secret() {
//   let secret = localStorage.getItem("secretKey");
//   secret = prompt("set secretKey", secret);
//   localStorage.setItem("secretKey", secret);
// }
// function saveCurrentState() {
//   const currentState = localStorage.getItem("trayData");
//   localStorage.setItem("savedTrayState", currentState);
//   alert("現在の状態を保存しました。");
// }
// function loadSavedState() {
//   const savedState = localStorage.getItem("savedTrayState");
//   if (savedState) {
//     localStorage.setItem("trayData", savedState);
//     loadFromLocalStorage();
//     alert("保存した状態を読み込みました。");
//   } else {
//     alert("保存された状態がありません。");
//   }
// }
// function showLabelManager() {
//   const labelManager = document.createElement("div");
//   labelManager.classList.add("label-manager");
//   labelManager.innerHTML = `
//       <h2>ラベル管理</h2>
//       <div id="labelList"></div>
//       <button id="addLabelBtn">新しいラベルを追加</button>
//       <button id="closeLabelManagerBtn">閉じる</button>
//     `;
//   document.body.appendChild(labelManager);
//   updateLabelList();
//   document
//     .getElementById("addLabelBtn")
//     .addEventListener("click", () => addNewLabel());
//   document
//     .getElementById("closeLabelManagerBtn")
//     .addEventListener("click", () => labelManager.remove());
// }
// function updateLabelList() {
//   const labelList = document.getElementById("labelList");
//   labelList.innerHTML = "";
//   const labels = globalLabelManager.getAllLabels();
//   for (const [id, label] of Object.entries(labels)) {
//     const labelElement = document.createElement("div");
//     labelElement.classList.add("label-item");
//     labelElement.innerHTML = `
//         <input type="text" class="label-name" value="${label.name}">
//         <input type="color" class="label-color" value="${label.color}">
//         <button class="deleteLabelBtn">削除</button>
//       `;
//     labelList.appendChild(labelElement);
//     const nameInput = labelElement.querySelector(".label-name");
//     const colorInput = labelElement.querySelector(".label-color");
//     const deleteBtn = labelElement.querySelector(".deleteLabelBtn");
//     nameInput.addEventListener("change", () =>
//       updateLabel(id, nameInput.value, colorInput.value)
//     );
//     colorInput.addEventListener("change", () =>
//       updateLabel(id, nameInput.value, colorInput.value)
//     );
//     deleteBtn.addEventListener("click", () => deleteLabel(id));
//   }
// }
// function addNewLabel() {
//   const id = Date.now().toString();
//   globalLabelManager.addLabel(id, "New Label", "#000000");
//   updateLabelList();
// }
// function updateLabel(id, name, color) {
//   globalLabelManager.addLabel(id, name, color);
// }
// function deleteLabel(id) {
//   if (confirm("このラベルを削除してもよろしいですか？")) {
//     delete globalLabelManager.labels[id];
//     updateLabelList();
//   }
// }
// function exportLabels() {
//   const labelsJson = globalLabelManager.exportLabels();
//   const blob = new Blob([labelsJson], { type: "application/json" });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = "labels.json";
//   a.click();
// }
// function importLabels() {
//   const input = document.createElement("input");
//   input.type = "file";
//   input.accept = ".json";
//   input.onchange = (event) => {
//     const file = event.target.files[0];
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       const content = e.target.result;
//       globalLabelManager.importLabels(content);
//       updateLabelList();
//     };
//     reader.readAsText(file);
//   };
//   input.click();
// }
// Add this to the end of the window.addEventListener('DOMContentLoaded', ...) function
const actionButtons = createActionButtons();
document.body.appendChild(actionButtons);
function createActionButtons() {
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("action-buttons");
    const addButton = document.createElement("button");
    addButton.textContent = "+";
    addButton.classList.add("action-button", "add-button");
    addButton.addEventListener("click", addNewTrayToParent);
    const insertButton = document.createElement("button");
    insertButton.textContent = "↩";
    insertButton.classList.add("action-button", "insert-button");
    insertButton.addEventListener("click", addNewTrayToFocused);
    buttonContainer.appendChild(addButton);
    buttonContainer.appendChild(insertButton);
    return buttonContainer;
}
function addNewTrayToParent() {
    const parentTray = (0, utils_1.getTrayFromId)(last_focused.parentId);
    if (parentTray) {
        const newTray = new Tray(parentTray.id, Date.now().toString(), "New Tray");
        parentTray.addChild(newTray);
        parentTray.isFolded = false;
        parentTray.updateAppearance();
        newTray.element.focus();
        const newTitleElement = newTray.element.querySelector(".tray-title");
        newTray.startTitleEdit(newTitleElement);
    }
}
function addNewTrayToFocused() {
    if (!last_focused) {
        return;
    }
    const newTray = new Tray(last_focused.id, Date.now().toString(), "New Tray");
    last_focused.addChild(newTray);
    last_focused.isFolded = false;
    last_focused.updateAppearance();
    newTray.element.focus();
    const newTitleElement = newTray.element.querySelector(".tray-title");
    newTray.startTitleEdit(newTitleElement);
}
