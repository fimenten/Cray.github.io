"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelManager = void 0;
class LabelManager {
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
exports.LabelManager = LabelManager;
