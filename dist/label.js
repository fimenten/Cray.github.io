import { globalLabelManager } from "./app";
import { getEventCoordinates } from "./utils";
export class LabelManager {
    constructor() {
        this.labels = {};
        this.initializeDefaultLabels();
        this.label_tray = new Set();
    }
    initializeDefaultLabels() {
        this.addLabel("DONE", "#4CAF50");
        this.addLabel("WIP", "#FFC107");
        this.addLabel("PLANNING", "#2196F3");
        this.addLabel("ARCHIVE", "#9E9E9E");
    }
    addLabel(labelName, color) {
        // TODO
        // if (this.labels.hasOwnProperty(labelName)) {
        //   notifyUser("duplicated label name not allowed");
        //   return;
        // }
        this.labels[labelName] = color;
    }
    getLabel(labelName) {
        return this.labels[labelName];
    }
    getAllLabels() {
        return this.labels;
    }
    exportLabels() {
        return JSON.stringify(this.labels);
    }
    importLabels(jsonString) {
        this.labels = JSON.parse(jsonString);
    }
    registLabeledTray(labelName, tray) {
        this.label_tray.add([labelName, tray]);
    }
    unregisterLabeledTray(labelName, tray) {
        this.label_tray.delete([labelName, tray]);
    }
}
export function addLabel(tray, event) {
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
                addExistingLabel(tray, selectedId);
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
                const newId = addNewLabelToManager(tray, name, color);
                addExistingLabel(tray, newId);
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
export function addExistingLabel(tray, labelId) {
    if (!tray.labels.includes(labelId)) {
        tray.labels.push(labelId);
        // tray.updateLabels();
    }
}
export function addNewLabelToManager(tray, name, color) {
    globalLabelManager.addLabel(name, color);
    const id = name; // Assuming the name is used as the ID
    addExistingLabel(tray, id); // Add the new label to the local list
    return id;
}
export function showLabelSelector(tray, event) {
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
    const [left, top] = getEventCoordinates(event);
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
                addExistingLabel(tray, selectedId);
                labelSelector.remove();
            }
        });
    }
    if (addButton && newLabelNameInput && newLabelColorInput) {
        addButton.addEventListener("click", () => {
            const name = newLabelNameInput.value;
            const color = newLabelColorInput.value;
            if (name) {
                const newId = addNewLabelToManager(tray, name, color);
                addExistingLabel(tray, newId);
                labelSelector.remove();
            }
        });
    }
    // Add event listener to close the popup when clicking outside
    document.addEventListener("click", (e) => {
        const target = e.target;
        if (!labelSelector.contains(target) && !target.closest(".context-menu")) {
            labelSelector.remove();
        }
    }, { once: true });
}
export function showLabelRemover(tray) {
    const labelRemover = document.createElement("div");
    labelRemover.classList.add("label-remover");
    labelRemover.innerHTML = `
    <h3>Select labels to remove:</h3>
    ${tray.labels
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
                removeLabel(tray, checkbox.value);
            });
            labelRemover.remove();
        });
    }
}
export function removeLabel(tray, labelName) {
    tray.labels = tray.labels.filter((label) => label !== labelName);
    globalLabelManager.unregisterLabeledTray(labelName, tray);
    // tray.updateLabels();
}
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
