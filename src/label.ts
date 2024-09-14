import { Tray } from "./app";
export type LabelColor = string;

export class LabelManager {
  private labels: Record<string, LabelColor>;
  private label_tray: Set<[string, Tray]>;

  constructor() {
    this.labels = {};
    this.initializeDefaultLabels();
    this.label_tray = new Set<[string, Tray]>();
  }

  private initializeDefaultLabels(): void {
    this.addLabel("DONE", "#4CAF50");
    this.addLabel("WIP", "#FFC107");
    this.addLabel("PLANNING", "#2196F3");
    this.addLabel("ARCHIVE", "#9E9E9E");
  }

  public addLabel(labelName: string, color: LabelColor): void {
    // TODO
    // if (this.labels.hasOwnProperty(labelName)) {
    //   notifyUser("duplicated label name not allowed");
    //   return;
    // }
    this.labels[labelName] = color;
  }

  public getLabel(labelName: string): LabelColor | undefined {
    return this.labels[labelName];
  }

  public getAllLabels(): Record<string, LabelColor> {
    return this.labels;
  }

  public exportLabels(): string {
    return JSON.stringify(this.labels);
  }

  public importLabels(jsonString: string): void {
    this.labels = JSON.parse(jsonString);
  }

  public registLabeledTray(labelName: string, tray: Tray): void {
    this.label_tray.add([labelName, tray]);
  }

  public unregisterLabeledTray(labelName: string, tray: Tray): void {
    this.label_tray.delete([labelName, tray]);
  }
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
