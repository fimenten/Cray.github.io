// import {Tray} from "./app"
// export function showTemplateSelectionDialog(tray:Tray): void {
//     // Create the dialog element
//     const dialog = document.createElement("div");
//     dialog.classList.add("template-selection-dialog");

//     // Generate the inner HTML
//     dialog.innerHTML = `
//         <h3>Select a Template:</h3>
//         <select id="template-select">
//           ${Object.keys(Tray.templates)
//             .map(
//               (key) =>
//                 `<option value="${key}">${Tray.templates[key].name}</option>`
//             )
//             .join("")}
//         </select>
//         <button id="create-template-btn">Create</button>
//         <button id="cancel-btn">Cancel</button>
//       `;

//     // Append the dialog to the body
//     document.body.appendChild(dialog);

//     // Add event listener for the create button
//     const createButton = document.getElementById("create-template-btn");
//     const cancelButton = document.getElementById("cancel-btn");
//     const templateSelect = document.getElementById("template-select") as HTMLSelectElement | null;

//     if (createButton) {
//       createButton.addEventListener("click", () => {
//         if (templateSelect) {
//           const selectedTemplate = templateSelect.value;
//           addTemplateTray(tray,selectedTemplate);
//         }
//         dialog.remove();
//       });
//     }

//     // Add event listener for the cancel button
//     if (cancelButton) {
//       cancelButton.addEventListener("click", () => {
//         dialog.remove();
//       });
//     }
//   }

// function showTemplateSelectionPopup(tray:Tray,event: MouseEvent | TouchEvent): void {
//     const popup = document.createElement("div");
//     popup.classList.add("template-selection-popup");
//     popup.style.position = "fixed";
//     popup.style.zIndex = "10000";

//     // Determine the position based on the event type
//     let top: number;
//     let left: number;

//     if (event instanceof MouseEvent) {
//       // For mouse events, use clientX and clientY
//       left = event.clientX;
//       top = event.clientY;
//     } else if (event instanceof TouchEvent && event.touches.length > 0) {
//       // For touch events, use the first touch point's clientX and clientY
//       left = event.touches[0].clientX;
//       top = event.touches[0].clientY;
//     } else {
//       // Default position if event data is not available
//       left = 0;
//       top = 0;
//     }

//     popup.style.top = `${top}px`;
//     popup.style.left = `${left}px`;

//     popup.innerHTML = `
//       <h3>Select a Template:</h3>
//       <div class="template-list">
//         ${Object.keys(Tray.templates)
//           .map(
//             (key) => `
//             <div class="template-item" data-template="${key}">
//               <h4>${Tray.templates[key].name}</h4>
//               <small>${Tray.templates[key].children.length} items</small>
//             </div>
//           `
//           )
//           .join("")}
//       </div>
//     `;

//     document.body.appendChild(popup);

//     popup.addEventListener("click", (e: MouseEvent) => {
//       const target = e.target as HTMLElement;
//       const templateItem = target.closest(".template-item") as HTMLElement | null;
//       if (templateItem) {
//         const selectedTemplate = templateItem.getAttribute("data-template");
//         if (selectedTemplate) {
//           addTemplateTray(tray,selectedTemplate);
//         }
//         popup.remove();
//       }
//     });

//     // Close the popup when clicking outside of it
//     const closePopup = (e: MouseEvent) => {
//       const target = e.target as HTMLElement;
//       if (!popup.contains(target) && !target.closest(".context-menu")) {
//         popup.remove();
//         document.removeEventListener("click", closePopup);
//       }
//     };

//     document.addEventListener("click", closePopup);
//   }

// function  createTemplateTray(templateName:string) {
//     const template = templates[templateName];
//     if (!template) return null;

//     const templateTray = new Tray(
//       this.id,
//       Date.now().toString(),
//       template.name
//     );

//     const createChildren = (parentTray, children) => {
//       children.forEach((child) => {
//         if (typeof child === "string") {
//           const childTray = new Tray(
//             parentTray.id,
//             Date.now().toString(),
//             child
//           );
//           parentTray.addChild(childTray);
//         } else {
//           const childTray = new Tray(
//             parentTray.id,
//             Date.now().toString(),
//             child.name
//           );
//           parentTray.addChild(childTray);
//           if (child.children) {
//             createChildren(childTray, child.children);
//           }
//         }
//       });
//     };

//     createChildren(templateTray, template.children);

//     return templateTray.children;
//   }
// const templates = {
//     // TODO Trayで記述すればいいだろ
//     Task: {
//       name: "tasker",
//       children: ["PLANNING", "PLANNED", "PROGRESS", "DONE"],
//       labels: [],
//     },
//     "Project Structure": {
//       name: "Project Structure",
//       children: [{ name: "思索" }, { name: "実装方針" }, { name: "実装中" }],
//     },
//     importance_urgence: {
//       name: "importance - urgence",
//       children: ["1-1", "1-0", "0-1", "0-0"],
//     },
//     importance: {
//       name: "konsaruImportance",
//       children: ["MUST", "SHOULD", "COULD", "WONT"],
//     },
//   };
