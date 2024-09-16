// import {exportData,importData} from "./io"
import {getTrayFromId,getRandomColor,getWhiteColor} from "./utils"
import { generateUUID,getRootElement,cloneTray} from "./utils";
import { getUrlParameter } from "./utils";
import { serialize,deserialize, loadFromIndexedDB, saveToIndexedDB } from "./io";
import { createHamburgerMenu,selected_trays } from "./humberger";
import { LabelManager } from "./label";
import { downloadData,showUploadNotification,uploadData,fetchTrayList, setNetworkOption } from "./networks";
// export let hamburgerElements;
let last_focused: Tray;

var menuOpening = false;

export const element2TrayMap = new WeakMap<HTMLElement, Tray>();
export const id2TrayData = new Map<TrayId, Tray>();
const TRAY_DATA_KEY = "trayData";
let AUTO_SYNC = false;
type TrayId = string;


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






const globalLabelManager = new LabelManager();

export class Tray {
  static colorPalette = [
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
  id: TrayId;
  name: string;
  children: Tray[];
  labels: string[];
  parentId: TrayId;
  borderColor: string;
  created_dt: Date;
  flexDirection: "column" | "row";
  host_url:string|null;
  filename:string|null;
  isFolded: boolean;

  isEditing: boolean;
  isSelected:boolean;
  element: HTMLDivElement;

  constructor(
    parentId: TrayId,
    id: TrayId,
    name: string,
    color : string|null = null,
    labels :string[] = [],
    created_dt:Date|null = null,
    flexDirection:"column"|"row" = "column",
    host_url:string|null = null,
    filename:string|null = null,
    isFold:boolean = true
  ) {
    this.id = id;
    this.name = name;
    this.children = [];
    this.labels = labels;

    this.parentId = parentId;
    this.isFolded = isFold;
    this.borderColor = color ? color: getWhiteColor();
    this.created_dt = created_dt? new Date(created_dt) : new Date();
    this.host_url = host_url
    this.filename = filename
    this.flexDirection = flexDirection;
    this.element = this.createElement();
    this.isEditing = false;
    this.isSelected = false;
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
    contextMenuButton.addEventListener(
      "click",
      this.onContextMenuButtonClick.bind(this)
    );
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

    title.addEventListener("dblclick", (event: MouseEvent) => {
      title.setAttribute("contenteditable", "true");
      event.stopPropagation();
      const target = event.target as HTMLElement;
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
    titleContainer.appendChild(checkboxContainer);
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
    const networkInfoElement = document.createElement('div');
    networkInfoElement.classList.add('network-tray-info');
    // this.updateNetworkInfo(networkInfoElement);
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

    // Append elements to the container



    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("network-tray-buttons");
    buttonContainer.style.display = "flex";
    buttonContainer.style.flexDirection = "column";
    buttonContainer.style.alignItems = "flex-start";
    buttonContainer.style.gap = "5px"; // Add some space between buttons

    const uploadButton = document.createElement("button");
    uploadButton.textContent = "Upload";
    uploadButton.addEventListener("click", () => uploadData(this));

    const downloadButton = document.createElement("button");
    downloadButton.textContent = "Download";
    downloadButton.addEventListener("click", () =>
      downloadData(this)
    );

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

    // Add network info and button container to the tray
    // const titleContainer = element.querySelector(".tray-title-container");
    titleContainer.appendChild(networkInfoElement);
    if (this.filename !=null){
      titleContainer.appendChild(buttonContainer);
    }

    // Adjust the layout of the title container
    titleContainer.style.display = "flex";
    titleContainer.style.alignItems = "center";
    titleContainer.style.justifyContent = "space-between";

    return tray;
  }
  static templates = {
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
  setupFocusTracking() {
    this.element.addEventListener(
      "focus",
      () => {
        last_focused = this;
      },
      true
    );

    this.element.addEventListener(
      "click",
      () => {
        last_focused = this;
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
      updated_trays = updated_trays.filter(t => t.id !== this.id);
    }

    // グローバルな selected_trays 配列を更新
    selected_trays.length = 0; // 配列を空にする
    selected_trays.push(...updated_trays); // 更新した配列を再度追加

    this.isSelected = isChecked; // isSelectedの状態を更新
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
    saveToIndexedDB();
  }
  addLabel(event: MouseEvent): void {
    const labelSelector = document.createElement("div");
    labelSelector.classList.add("label-selector");
    console.log(globalLabelManager.getAllLabels());

    labelSelector.innerHTML = `
      <select id="existingLabels">
        <option value="">-- 既存のラベルを選択 --</option>
        ${Object.entries(globalLabelManager.getAllLabels())
          .map(
            ([name, color]) =>
              `<option value="${name}" style="background-color: ${color};">${name}</option>`
          )
          .join("")}
      </select>
      <button id="selectExistingLabel">選択</button>
      <div>または</div>
      <input type="text" id="newLabelName" placeholder="新しいラベル名">
      <input type="color" id="newLabelColor" value="#000000">
      <button id="addNewLabel">新しいラベルを追加</button>
    `;

    // Set the position of the popup
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    labelSelector.style.position = "absolute";
    labelSelector.style.top = `${rect.bottom + window.scrollY}px`;
    labelSelector.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(labelSelector);

    const selectExistingLabelButton = document.getElementById(
      "selectExistingLabel"
    );
    const existingLabels = document.getElementById(
      "existingLabels"
    ) as HTMLSelectElement | null;
    const newLabelName = document.getElementById(
      "newLabelName"
    ) as HTMLInputElement | null;
    const newLabelColor = document.getElementById(
      "newLabelColor"
    ) as HTMLInputElement | null;

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
    document.addEventListener(
      "click",
      (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!labelSelector.contains(target) && target !== event.target) {
          labelSelector.remove();
        }
      },
      { once: true }
    );
  }

  addExistingLabel(labelId: string): void {
    if (!this.labels.includes(labelId)) {
      this.labels.push(labelId);
      this.updateLabels();
      saveToIndexedDB(); // Save to local storage after adding the label
    }
  }

  addNewLabelToManager(name: string, color: string): string {
    globalLabelManager.addLabel(name, color);
    const id = name; // Assuming the name is used as the ID
    this.addExistingLabel(id); // Add the new label to the local list
    saveToIndexedDB(); // Save to local storage after adding the label
    return id;
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

  updateLabels(): void {
    let labelContainer = this.element.querySelector(
      ".tray-labels"
    ) as HTMLElement | null;

    if (!labelContainer) {
      const titleContainer = this.element.querySelector(
        ".tray-title-container"
      ) as HTMLElement | null;
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

      this.labels.forEach((labelName: string) => {
        const labelColor = globalLabelManager.getLabel(labelName);
        if (labelColor) {
          const labelElement = document.createElement("span");
          labelElement.classList.add("tray-label");
          labelElement.textContent = labelName;
          labelElement.style.backgroundColor = labelColor;
          labelElement.addEventListener("click", (event: MouseEvent) =>
            this.onLabelClick(event, labelName)
          );
          labelContainer.appendChild(labelElement);
          globalLabelManager.registLabeledTray(labelName, this);
        }
      });

      // saveToIndexedDB();
    }
  }

  onLabelClick(event: MouseEvent, labelName: string): void {
    event.stopPropagation();
    if (confirm(`Do you want to remove the label "${labelName}"?`)) {
      this.removeLabel(labelName);
    }
  }

  removeLabel(labelName: string): void {
    this.labels = this.labels.filter((label: string) => label !== labelName);
    globalLabelManager.unregisterLabeledTray(labelName, this);
    this.updateLabels();
    saveToIndexedDB();
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
        child.element.style.width = "50%"; // Or any appropriate width
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
    titleElement.setAttribute("contenteditable", "true");
    // titleElement.focus();

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
    titleElement.setAttribute("contenteditable", "false");
    titleElement.textContent = this.name;
  }
  onContextMenuButtonClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.showContextMenu(event);
  }

  showContextMenu(event: MouseEvent | TouchEvent) {
    this.onContextMenu(event);
  }

  finishTitleEdit(titleElement: HTMLDivElement) {
    titleElement.setAttribute("contenteditable", "false");
    this.name = (titleElement.textContent || "").trim();
    titleElement.textContent = this.name;
    // titleElement.removeEventListener("keydown", this.keyDownHandler);
    // titleElement.removeEventListener("blur", this.blurHandler);
    this.isEditing = false;
    saveToIndexedDB();
  }

  onDragStart(event: DragEvent): void {
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.setData("text/plain", this.id);
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
    element.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (menuOpening) {
      return;
    }
    event.stopPropagation();

    if (this.isEditing) {
      switch (event.key) {
        case "Enter":
          if (!event.shiftKey) {
            event.preventDefault();
            this.finishTitleEdit(event.target as HTMLDivElement);
          }
          break;
        case "Escape":
          event.preventDefault();
          this.cancelTitleEdit(event.target as HTMLDivElement);
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
        } else if (event.shiftKey) {
          this.toggleEditMode();
        } else {
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

  moveFocus(direction:"up"|"down"|"left"|"right") {
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
        nextTray = getTrayFromId(this.parentId);
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
      const parent = getTrayFromId(this.parentId) as Tray;
      const index = parent.children.indexOf(this);
      return parent.children[index - 1] || null;
    }
    return null;
  }

  getNextSibling() {
    if (this.parentId) {
      const parent = getTrayFromId(this.parentId) as Tray;
      const index = parent.children.indexOf(this);
      return parent.children[index + 1] || null;
    }
    return null;
  }

  toggleEditMode() {
    const titleElement = this.element.querySelector(
      ".tray-title"
    ) as HTMLDivElement;
    if (!titleElement) {
      return;
    }
    if (titleElement.getAttribute("contenteditable") === "true") {
      this.finishTitleEdit(titleElement);
    } else {
      this.startTitleEdit(titleElement);
    }
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

    const movingId = event.dataTransfer?.getData("text/plain");
    if (!movingId) return; // If there's no data, exit early

    const movingTray = getTrayFromId(movingId);
    if (!movingTray) return; // Exit if the tray doesn't exist

    const parentTray = getTrayFromId(movingTray.parentId);
    if (parentTray) {
      parentTray.removeChild(movingId);
    }

    this.children.unshift(movingTray);
    // movingTray.parent = this as Tray;
    movingTray.parentId = this.id;

    const content = this.element.querySelector(
      ".tray-content"
    ) as HTMLElement | null;
    if (content) {
      content.insertBefore(movingTray.element, content.firstChild);
    }

    movingTray.element.style.display = "block";
    this.isFolded = false;
    this.updateAppearance();

    saveToIndexedDB();
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

    if (this.children.length ===1) {
      const color = this.borderColor==getWhiteColor()?getRandomColor():this.borderColor;
      console.log(this.borderColor===getWhiteColor(),color,this.borderColor)
      this.borderColor = color;
      this.updateBorderColor(this.borderColor);
      this.updateAppearance()
    }
  }

  onContextMenu(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();
    menuOpening = true;
    // Remove existing context menu
    const existingMenu = document.querySelector(
      ".context-menu"
    ) as HTMLElement | null;
    existingMenu?.remove();

    // Determine the color to show
    const showColor = this.borderColor || getWhiteColor();

    // Create the context menu
    const menu = document.createElement("div");
    menu.classList.add("context-menu");
    menu.setAttribute("tabindex", "-1");
    menu.innerHTML = `
      <div class="menu-item" data-action="fetchTrayFromServer" tabindex="0">Fetch Tray from Server</div>
      <div class="menu-item" data-action="networkSetting" tabindex="1">networkSetting</div>
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
    const menuItems = menu.querySelectorAll(
      ".menu-item"
    ) as NodeListOf<HTMLElement>;
    let currentFocus = 0;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        menuItems[currentFocus].classList.remove("focused");
        currentFocus =
          e.key === "ArrowDown"
            ? (currentFocus + 1) % menuItems.length
            : (currentFocus - 1 + menuItems.length) % menuItems.length;
        menuItems[currentFocus].classList.add("focused");
        menuItems[currentFocus].focus();
      } else if (e.key === "Enter") {
        menuItems[currentFocus].click();
      } else if (e.key === "Escape") {
        menu.remove();
      }
    };

    document.addEventListener("keydown", handler.bind(this));

    menuItems[0].classList.add("focused");
    menuItems[0].focus();

    const colorPicker = menu.querySelector(
      "#borderColorPicker"
    ) as HTMLInputElement;
    colorPicker.addEventListener("change", (e: Event) => {
      const target = e.target as HTMLInputElement;
      this.borderColor = target.value;
      this.changeBorderColor(target.value);
      this.updateAppearance();
      menu.remove();
    });

    const handleMenuClick = (e: MouseEvent) => {
      const action = (e.target as HTMLElement).getAttribute("data-action");
      if (action) this.executeMenuAction(action, event, menu);
    };

    const handleOutsideClick = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
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

  private positionMenu(
    event: MouseEvent | TouchEvent,
    menu: HTMLElement
  ): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Determine the initial position based on the event type
    let left: number;
    let top: number;

    if (event instanceof MouseEvent) {
      // For mouse events, use clientX and clientY
      left = event.clientX;
      top = event.clientY;
    } else if (event instanceof TouchEvent && event.touches.length > 0) {
      // For touch events, use the first touch point's clientX and clientY
      left = event.touches[0].clientX;
      top = event.touches[0].clientY;
    } else {
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

  private executeMenuAction(
    action: string,
    event: MouseEvent | TouchEvent,
    menu: HTMLElement
  ): void {
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
      case "toggleFlexDirection":
        this.toggleFlexDirection();
        break;
      case "networkSetting":
        setNetworkOption(this);
        saveToIndexedDB()
        break;

        //   case "add_fetch_networkTray_to_child":
      // this.add_fetch_networkTray_to_child();
      // break;
      // case "open_this_in_other":
      //   this.open_this_in_other();
      //   break;
      case "add_child_from_localStorage":
        this.add_child_from_localStorage();
        break;
      case "fetchTrayFromServer":
        fetchTrayList(this)
        break;
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


  showLabelSelector(event: MouseEvent | TouchEvent): void {
    // Remove existing label selector
    const existingSelector = document.querySelector(
      ".label-selector"
    ) as HTMLElement | null;
    existingSelector?.remove();

    const labelSelector = document.createElement("div");
    labelSelector.classList.add("label-selector");
    labelSelector.innerHTML = `
      <select id="existingLabels">
        <option value="">-- Select existing label --</option>
        ${Object.entries(globalLabelManager.getAllLabels())
          .map(
            ([labelName, color]) =>
              `<option value="${labelName}" style="background-color: ${color};">${labelName}</option>`
          )
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

    const selectButton = document.getElementById(
      "selectExistingLabel"
    ) as HTMLButtonElement | null;
    const existingLabels = document.getElementById(
      "existingLabels"
    ) as HTMLSelectElement | null;
    const newLabelNameInput = document.getElementById(
      "newLabelName"
    ) as HTMLInputElement | null;
    const newLabelColorInput = document.getElementById(
      "newLabelColor"
    ) as HTMLInputElement | null;
    const addButton = document.getElementById(
      "addNewLabel"
    ) as HTMLButtonElement | null;

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
    document.addEventListener(
      "click",
      (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
          !labelSelector.contains(target) &&
          !target.closest(".context-menu")
        ) {
          labelSelector.remove();
        }
      },
      { once: true }
    );
  }

  private getEventCoordinates(
    event: MouseEvent | TouchEvent
  ): [number, number] {
    if (event instanceof MouseEvent) {
      return [event.clientX, event.clientY];
    } else if (event instanceof TouchEvent && event.touches.length > 0) {
      return [event.touches[0].clientX, event.touches[0].clientY];
    }
    return [0, 0];
  }
  showLabelRemover(): void {
    const labelRemover = document.createElement("div");
    labelRemover.classList.add("label-remover");
    labelRemover.innerHTML = `
      <h3>Select labels to remove:</h3>
      ${this.labels
        .map(
          (label) => `
          <div>
            <input type="checkbox" id="${label}" value="${label}">
            <label for="${label}">${label}</label>
          </div>
        `
        )
        .join("")}
      <button id="removeLabelBtn">Remove Selected Labels</button>
    `;

    document.body.appendChild(labelRemover);

    const removeButton = document.getElementById(
      "removeLabelBtn"
    ) as HTMLButtonElement | null;

    if (removeButton) {
      removeButton.addEventListener("click", () => {
        const checkboxes = labelRemover.querySelectorAll(
          'input[type="checkbox"]:checked'
        ) as NodeListOf<HTMLInputElement>;
        checkboxes.forEach((checkbox) => {
          this.removeLabel(checkbox.value);
        });
        labelRemover.remove();
      });
    }
  }

  copyTray() {
    const serialized = serialize(cloneTray(this));
    navigator.clipboard.writeText(serialized);
  }

  renameTray() {
    const title = this.element.querySelector(".tray-title");
    if (!title) {
      return;
    }
    title.setAttribute("contenteditable", "true");
    // title.focus();
    saveToIndexedDB();
  }

  cutTray() {
    const serialized = serialize(cloneTray(this));
    navigator.clipboard.writeText(serialized);
  }

  pasteTray() {
    const serialized = navigator.clipboard.readText().then((str) => {
      try {
        let newTray = deserialize(str);
        if (!newTray) {
          return;
        }
        this.addChild(newTray);
      } catch {
        const texts = str.split("\n").filter((line) => line.trim() !== "");
        const trays = texts.map(
          (text) => new Tray(this.id, generateUUID(), text)
        );
        trays.map((t) => this.addChild(t));
      }
    });
  }

  deleteTray() {
    const parent = getTrayFromId(this.parentId) as Tray;
    const indexInParent = parent.children.findIndex(
      (child) => child.id === this.id
    );

    parent.removeChild(this.id);
    this.element.remove();

    this.moveFocusAfterDelete(parent, indexInParent);

    saveToIndexedDB();
  }

  moveFocusAfterDelete(parent:Tray, deletedIndex:number) {
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

  showNetworkOptions() {
    let d;
    if (this.host_url) {
      d = this.host_url;
    } else {
      d = localStorage.getItem("defaultServer");
      }
    
    const url = prompt("Enter URL:", d? d:"");
    const filename = prompt("Enter filename:", this.filename ? this.filename : "");

    if (url) this.host_url = url;
    if (filename) this.filename = filename;

    saveToIndexedDB();
  }

  //   showMarkdownOutput() {
  //     const markdown = this.outputAsMarkdown();
  //     const blob = new Blob([markdown], { type: "text/markdown" });
  //     const url = URL.createObjectURL(blob);

  //     const outputWindow = window.open("", "_blank");
  //     outputWindow.document.write(`
  //         <html>
  //           <head>
  //             <title>Tray Structure as Markdown</title>
  //             <style>
  //               body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
  //               pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; }
  //               button { margin: 10px 5px; padding: 10px 15px; cursor: pointer; }
  //             </style>
  //           </head>
  //           <body>
  //             <h1>Tray Structure as Markdown</h1>
  //             <pre>${markdown}</pre>
  //             <button onclick="copyToClipboard()">Copy to Clipboard</button>
  //             <button onclick="downloadMarkdown()">Download Markdown</button>
  //             <script>
  //               function copyToClipboard() {
  //                 const pre = document.querySelector('pre');
  //                 const textArea = document.createElement('textarea');
  //                 textArea.value = pre.textContent;
  //                 document.body.appendChild(textArea);
  //                 textArea.select();
  //                 document.execCommand('copy');
  //                 document.body.removeChild(textArea);
  //                 alert('Copied to clipboard!');
  //               }

  //               function downloadMarkdown() {
  //                 const link = document.createElement('a');
  //                 link.href = '${url}';
  //                 link.download = 'tray_structure.md';
  //                 document.body.appendChild(link);
  //                 link.click();
  //                 document.body.removeChild(link);
  //               }
  //             </script>
  //           </body>
  //         </html>
  //       `);
  //   }
}


function ondownloadButtonPressed(tray:Tray) {
    // First, show a confirmation dialog
    if (confirm("Are you sure you want to download?")) {
      downloadData(tray)
        .then((downloaded) => {
          // Update the current tray with the downloaded data
          let parent = getTrayFromId(tray.parentId) as Tray;
          tray.deleteTray();
          parent.addChild(downloaded as Tray);
          parent.updateAppearance();

          // Notify user of successful download
          showUploadNotification("Download completed successfully.");
        })
        .catch((error) => {
          console.error("Download failed:", error);
          showUploadNotification("Download failed. Please check your connection.");
        });
    } else {
      // If user cancels, notify them
      showUploadNotification("Download cancelled.");
    }
  }





window.addEventListener("DOMContentLoaded", () => {
  let sessionId = getUrlParameter("sessionId");
  if (sessionId == "new") {
    let id = generateUUID();
    window.location.replace(
      window.location.href.replace("?sessionId=new", "?sessionId=" + id)
    );
  }
  if (sessionId) {
    loadFromIndexedDB(sessionId);
  } else {
    loadFromIndexedDB();
  }
  console.log("loaded")
  if (sessionId) {
    const savedTitle = localStorage.getItem(sessionId + "_title");
    if (savedTitle) {
      document.title = savedTitle;
    }
  }

  const { leftBar } = createHamburgerMenu();
  document.body.insertBefore(leftBar, document.body.firstChild);
  const actionButtons = createActionButtons();
  document.body.appendChild(actionButtons);
  //   updateAllTrayDirections();
  //   window.addEventListener("resize", updateAllTrayDirections);
  const root = getRootElement() as HTMLDivElement;
  last_focused = element2TrayMap.get(root) as Tray;
  root.focus();
});




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
  insertButton.addEventListener("click", addNewTrayToFocused)

  buttonContainer.appendChild(addButton);
  buttonContainer.appendChild(insertButton);

  return buttonContainer;
}

function addNewTrayToParent() {

  const parentTray = getTrayFromId(last_focused.parentId);

  if (parentTray) {
    const newTray = new Tray(parentTray.id, Date.now().toString(), "New Tray");
    parentTray.addChild(newTray);
    parentTray.isFolded = false;
    parentTray.updateAppearance();
    newTray.element.focus();
    const newTitleElement = newTray.element.querySelector(
      ".tray-title"
    ) as HTMLDivElement;
    newTray.startTitleEdit(newTitleElement);
  }
}

function addNewTrayToFocused() {
  if (!last_focused){return}
  const newTray = new Tray(last_focused.id, Date.now().toString(), "New Tray");
  last_focused.addChild(newTray);
  last_focused.isFolded = false;
  last_focused.updateAppearance();
  newTray.element.focus();
  const newTitleElement = newTray.element.querySelector(
    ".tray-title"
  ) as HTMLDivElement;
  newTray.startTitleEdit(newTitleElement);
}


