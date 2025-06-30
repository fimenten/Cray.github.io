import { ITrayData, ITrayUIState, TrayId } from "../types";
import { TrayData } from "../dataModel";
import { TrayUIState } from "../uiState";

export interface ITrayRenderer {
  render(data: ITrayData, uiState: ITrayUIState): HTMLElement;
  update(element: HTMLElement, data: ITrayData, uiState: ITrayUIState): void;
  destroy(element: HTMLElement): void;
}

export class TrayRenderer implements ITrayRenderer {
  private readonly classList = {
    tray: "tray",
    trayTitle: "tray-title",
    trayFoldButton: "tray-fold-button",
    trayChildren: "tray-children",
    trayCheckbox: "tray-checkbox",
    trayDragHandle: "tray-drag-handle",
    editing: "editing",
    selected: "selected",
    focused: "focused",
    folded: "folded",
    done: "done",
    autoUpload: "auto-upload"
  };

  render(data: ITrayData, uiState: ITrayUIState): HTMLElement {
    const element = this.createElement(data, uiState);
    this.updateElement(element, data, uiState);
    return element;
  }

  update(element: HTMLElement, data: ITrayData, uiState: ITrayUIState): void {
    this.updateElement(element, data, uiState);
  }

  destroy(element: HTMLElement): void {
    // Remove all event listeners and clean up
    const clone = element.cloneNode(true) as HTMLElement;
    element.parentNode?.replaceChild(clone, element);
  }

  private createElement(data: ITrayData, uiState: ITrayUIState): HTMLElement {
    const trayElement = document.createElement("div");
    trayElement.className = this.classList.tray;
    trayElement.dataset.trayId = data.id;

    // Create fold button
    const foldButton = document.createElement("button");
    foldButton.className = this.classList.trayFoldButton;
    foldButton.textContent = uiState.isExpanded ? "▼" : "▶";
    trayElement.appendChild(foldButton);

    // Create title element
    const titleElement = document.createElement("div");
    titleElement.className = this.classList.trayTitle;
    titleElement.contentEditable = "false";
    titleElement.textContent = data.name;
    trayElement.appendChild(titleElement);

    // Create checkbox (if tray has checkbox property)
    if ((data as any).checkbox !== undefined) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = this.classList.trayCheckbox;
      checkbox.checked = (data as any).checkbox;
      trayElement.appendChild(checkbox);
    }

    // Create drag handle
    const dragHandle = document.createElement("div");
    dragHandle.className = this.classList.trayDragHandle;
    dragHandle.textContent = "⋮⋮";
    trayElement.appendChild(dragHandle);

    // Create children container
    const childrenContainer = document.createElement("div");
    childrenContainer.className = this.classList.trayChildren;
    trayElement.appendChild(childrenContainer);

    return trayElement;
  }

  private updateElement(element: HTMLElement, data: ITrayData, uiState: ITrayUIState): void {
    // Update data attributes
    element.dataset.trayId = data.id;

    // Update classes based on UI state
    this.updateClasses(element, uiState, data);

    // Update fold button
    const foldButton = element.querySelector(`.${this.classList.trayFoldButton}`) as HTMLButtonElement;
    if (foldButton) {
      foldButton.textContent = uiState.isExpanded ? "▼" : "▶";
      foldButton.style.display = data.children.length > 0 ? "inline-block" : "none";
    }

    // Update title
    const titleElement = element.querySelector(`.${this.classList.trayTitle}`) as HTMLDivElement;
    if (titleElement && !uiState.isEditing) {
      titleElement.textContent = data.name;
      titleElement.contentEditable = uiState.isEditing ? "true" : "false";
    }

    // Update checkbox
    const checkbox = element.querySelector(`.${this.classList.trayCheckbox}`) as HTMLInputElement;
    if (checkbox && (data as any).checkbox !== undefined) {
      checkbox.checked = (data as any).checkbox;
    }

    // Update children visibility
    const childrenContainer = element.querySelector(`.${this.classList.trayChildren}`) as HTMLDivElement;
    if (childrenContainer) {
      childrenContainer.style.display = uiState.isExpanded ? "block" : "none";
    }

    // Update done marker visibility
    if (uiState.showDoneMarker && (data as any).done) {
      this.addDoneMarker(element);
    } else {
      this.removeDoneMarker(element);
    }
  }

  private updateClasses(element: HTMLElement, uiState: ITrayUIState, data: ITrayData): void {
    // UI state classes
    element.classList.toggle(this.classList.editing, uiState.isEditing);
    element.classList.toggle(this.classList.selected, uiState.isSelected);
    element.classList.toggle(this.classList.focused, uiState.isFocused);
    element.classList.toggle(this.classList.folded, !uiState.isExpanded);
    
    // Data state classes
    element.classList.toggle(this.classList.done, (data as any).done === true);
    element.classList.toggle(this.classList.autoUpload, uiState.autoUpload);
  }

  private addDoneMarker(element: HTMLElement): void {
    if (!element.querySelector(".done-marker")) {
      const doneMarker = document.createElement("span");
      doneMarker.className = "done-marker";
      doneMarker.textContent = " ✓";
      const titleElement = element.querySelector(`.${this.classList.trayTitle}`);
      titleElement?.appendChild(doneMarker);
    }
  }

  private removeDoneMarker(element: HTMLElement): void {
    const doneMarker = element.querySelector(".done-marker");
    doneMarker?.remove();
  }

  // Utility method to render markdown content
  renderMarkdown(content: string): HTMLElement {
    const container = document.createElement("div");
    container.className = "markdown-content";
    
    // Simple markdown parsing (can be enhanced with a proper markdown parser)
    const lines = content.split("\n");
    let html = "";
    
    for (const line of lines) {
      if (line.startsWith("# ")) {
        html += `<h1>${this.escapeHtml(line.slice(2))}</h1>`;
      } else if (line.startsWith("## ")) {
        html += `<h2>${this.escapeHtml(line.slice(3))}</h2>`;
      } else if (line.startsWith("### ")) {
        html += `<h3>${this.escapeHtml(line.slice(4))}</h3>`;
      } else if (line.startsWith("- ")) {
        html += `<li>${this.escapeHtml(line.slice(2))}</li>`;
      } else if (line.trim()) {
        html += `<p>${this.escapeHtml(line)}</p>`;
      }
    }
    
    container.innerHTML = html;
    return container;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Singleton instance
export const trayRenderer = new TrayRenderer();