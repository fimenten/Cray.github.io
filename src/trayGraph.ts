import { 
  DiGraph, 
  Vertex, 
  addNode, 
  addEdge, 
  removeEdge, 
  moveNode, 
  getChildren, 
  getParent 
} from "./graphCore";
import { TrayData, TrayId, AppState } from "./types";
import { PayloadAction } from "@reduxjs/toolkit";

/**
 * TrayGraph - Efficient graph-based tray relationship management
 * Extends the generic DiGraph to provide tray-specific operations
 */

export interface TrayVertex extends Vertex {
  id: TrayId;
}

export interface TrayGraphState extends DiGraph<TrayVertex> {
  // Add tray-specific metadata
  rootId: TrayId | null;
  version: number;
}

export class TrayGraph {
  private state: TrayGraphState;
  
  constructor(rootId: TrayId | null = null) {
    this.state = {
      nodes: {},
      fromTo: {},
      toFrom: {},
      nodeInfo: {
        information: {}
      },
      rootId,
      version: 1
    };
  }

  /**
   * Get current graph state (immutable)
   */
  getState(): Readonly<TrayGraphState> {
    return { ...this.state };
  }

  /**
   * Set graph state (for Redux integration)
   */
  setState(newState: TrayGraphState): void {
    this.state = { ...newState };
  }

  /**
   * Add a tray to the graph
   */
  addTray(trayId: TrayId, parentId: TrayId | null = null): void {
    const vertex: TrayVertex = { id: trayId };
    
    // Add node to graph
    addNode(this.state, { type: 'ADD_NODE', payload: vertex } as PayloadAction<TrayVertex>);
    
    // Set as root if no root exists
    if (!this.state.rootId) {
      this.state.rootId = trayId;
    }
    
    // Add parent-child relationship if parent specified
    if (parentId && this.hasTray(parentId)) {
      this.setParent(trayId, parentId);
    }
  }

  /**
   * Remove a tray and all its descendants
   */
  removeTray(trayId: TrayId): TrayId[] {
    if (!this.hasTray(trayId)) {
      return [];
    }

    const removed: TrayId[] = [];
    const toRemove = [trayId];
    
    // Collect all descendants
    while (toRemove.length > 0) {
      const currentId = toRemove.pop()!;
      const children = this.getChildren(currentId);
      toRemove.push(...children);
      removed.push(currentId);
    }

    // Remove all nodes and edges
    for (const id of removed) {
      // Remove all edges where this node is involved
      const parents = this.getParents(id);
      const children = this.getChildren(id);
      
      for (const parentId of parents) {
        this.removeEdge(parentId, id);
      }
      
      for (const childId of children) {
        this.removeEdge(id, childId);
      }
      
      // Remove node
      delete this.state.nodes[id];
      delete this.state.fromTo[id];
      delete this.state.toFrom[id];
      if (this.state.nodeInfo.information[id]) {
        delete this.state.nodeInfo.information[id];
      }
    }

    // Update root if necessary
    if (this.state.rootId === trayId) {
      this.state.rootId = this.findNewRoot();
    }

    return removed;
  }

  /**
   * Move a tray to a new parent
   */
  moveTray(trayId: TrayId, newParentId: TrayId | null): boolean {
    if (!this.hasTray(trayId)) {
      return false;
    }

    if (newParentId && !this.hasTray(newParentId)) {
      return false;
    }

    // Check for circular reference
    if (newParentId && this.wouldCreateCycle(trayId, newParentId)) {
      return false;
    }

    // Remove existing parent relationships
    const currentParents = this.getParents(trayId);
    for (const parentId of currentParents) {
      this.removeEdge(parentId, trayId);
    }

    // Add new parent relationship
    if (newParentId) {
      this.setParent(trayId, newParentId);
    }

    return true;
  }

  /**
   * Set parent-child relationship
   */
  private setParent(childId: TrayId, parentId: TrayId): void {
    if (!this.hasTray(childId) || !this.hasTray(parentId)) {
      return;
    }

    addEdge(this.state, {
      type: 'ADD_EDGE',
      payload: { from: parentId, to: childId }
    } as PayloadAction<{ from: string; to: string }>);
  }

  /**
   * Remove edge between two trays
   */
  private removeEdge(fromId: TrayId, toId: TrayId): void {
    removeEdge(this.state, {
      type: 'REMOVE_EDGE',
      payload: { from: fromId, to: toId }
    } as PayloadAction<{ from: string; to: string }>);
  }

  /**
   * Get children of a tray
   */
  getChildren(trayId: TrayId): TrayId[] {
    if (!this.hasTray(trayId)) {
      return [];
    }
    return this.state.fromTo[trayId] || [];
  }

  /**
   * Get parents of a tray (should be 0 or 1 in tree structure)
   */
  getParents(trayId: TrayId): TrayId[] {
    if (!this.hasTray(trayId)) {
      return [];
    }
    return this.state.toFrom[trayId] || [];
  }

  /**
   * Get parent of a tray (convenience method for tree structure)
   */
  getParent(trayId: TrayId): TrayId | null {
    const parents = this.getParents(trayId);
    return parents.length > 0 ? parents[0] : null;
  }

  /**
   * Get all descendants of a tray
   */
  getDescendants(trayId: TrayId): TrayId[] {
    if (!this.hasTray(trayId)) {
      return [];
    }

    const descendants: TrayId[] = [];
    const queue = [...this.getChildren(trayId)];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      descendants.push(currentId);
      queue.push(...this.getChildren(currentId));
    }

    return descendants;
  }

  /**
   * Get all ancestors of a tray
   */
  getAncestors(trayId: TrayId): TrayId[] {
    if (!this.hasTray(trayId)) {
      return [];
    }

    const ancestors: TrayId[] = [];
    let currentId: TrayId | null = trayId;
    
    while (currentId) {
      const parent = this.getParent(currentId);
      if (parent) {
        ancestors.push(parent);
        currentId = parent;
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * Get siblings of a tray
   */
  getSiblings(trayId: TrayId): TrayId[] {
    const parent = this.getParent(trayId);
    if (!parent) {
      return [];
    }
    
    return this.getChildren(parent).filter(id => id !== trayId);
  }

  /**
   * Get root tray ID
   */
  getRootId(): TrayId | null {
    return this.state.rootId;
  }

  /**
   * Set root tray ID
   */
  setRootId(trayId: TrayId | null): void {
    if (trayId && !this.hasTray(trayId)) {
      return;
    }
    this.state.rootId = trayId;
  }

  /**
   * Check if tray exists in graph
   */
  hasTray(trayId: TrayId): boolean {
    return trayId in this.state.nodes;
  }

  /**
   * Get all tray IDs
   */
  getAllTrayIds(): TrayId[] {
    return Object.keys(this.state.nodes);
  }

  /**
   * Get depth of a tray (distance from root)
   */
  getDepth(trayId: TrayId): number {
    return this.getAncestors(trayId).length;
  }

  /**
   * Check if moving a tray would create a cycle
   */
  private wouldCreateCycle(trayId: TrayId, newParentId: TrayId): boolean {
    // If new parent is a descendant of the tray, it would create a cycle
    const descendants = this.getDescendants(trayId);
    return descendants.includes(newParentId);
  }

  /**
   * Find a new root when current root is removed
   */
  private findNewRoot(): TrayId | null {
    const allIds = this.getAllTrayIds();
    if (allIds.length === 0) {
      return null;
    }

    // Find a node with no parents
    for (const id of allIds) {
      if (this.getParents(id).length === 0) {
        return id;
      }
    }

    // If all nodes have parents (shouldn't happen in a tree), pick the first one
    return allIds[0];
  }

  /**
   * Get tree structure as nested object
   */
  getTreeStructure(rootId?: TrayId): TreeNode | null {
    const root = rootId || this.state.rootId;
    if (!root || !this.hasTray(root)) {
      return null;
    }

    const buildTree = (trayId: TrayId): TreeNode => {
      const children = this.getChildren(trayId);
      return {
        id: trayId,
        children: children.map(childId => buildTree(childId))
      };
    };

    return buildTree(root);
  }

  /**
   * Flatten tree to array with depth information
   */
  flattenTree(rootId?: TrayId): FlatTreeNode[] {
    const root = rootId || this.state.rootId;
    if (!root || !this.hasTray(root)) {
      return [];
    }

    const result: FlatTreeNode[] = [];
    
    const traverse = (trayId: TrayId, depth: number) => {
      result.push({ id: trayId, depth });
      const children = this.getChildren(trayId);
      for (const childId of children) {
        traverse(childId, depth + 1);
      }
    };

    traverse(root, 0);
    return result;
  }

  /**
   * Get next sibling of a tray
   */
  getNextSibling(trayId: TrayId): TrayId | null {
    const parent = this.getParent(trayId);
    if (!parent) return null;
    
    const siblings = this.getChildren(parent);
    const currentIndex = siblings.indexOf(trayId);
    
    return currentIndex >= 0 && currentIndex < siblings.length - 1 
      ? siblings[currentIndex + 1] 
      : null;
  }

  /**
   * Get previous sibling of a tray
   */
  getPreviousSibling(trayId: TrayId): TrayId | null {
    const parent = this.getParent(trayId);
    if (!parent) return null;
    
    const siblings = this.getChildren(parent);
    const currentIndex = siblings.indexOf(trayId);
    
    return currentIndex > 0 ? siblings[currentIndex - 1] : null;
  }

  /**
   * Move tray up in sibling order
   */
  moveUp(trayId: TrayId): boolean {
    const parent = this.getParent(trayId);
    if (!parent) return false;
    
    const children = this.state.fromTo[parent];
    if (!children) return false;
    
    const currentIndex = children.indexOf(trayId);
    if (currentIndex <= 0) return false;
    
    // Swap with previous sibling
    [children[currentIndex - 1], children[currentIndex]] = 
    [children[currentIndex], children[currentIndex - 1]];
    
    return true;
  }

  /**
   * Move tray down in sibling order
   */
  moveDown(trayId: TrayId): boolean {
    const parent = this.getParent(trayId);
    if (!parent) return false;
    
    const children = this.state.fromTo[parent];
    if (!children) return false;
    
    const currentIndex = children.indexOf(trayId);
    if (currentIndex < 0 || currentIndex >= children.length - 1) return false;
    
    // Swap with next sibling
    [children[currentIndex], children[currentIndex + 1]] = 
    [children[currentIndex + 1], children[currentIndex]];
    
    return true;
  }

  /**
   * Validate graph integrity
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for orphaned references
    for (const [fromId, toIds] of Object.entries(this.state.fromTo)) {
      if (!this.hasTray(fromId)) {
        errors.push(`fromTo references non-existent tray: ${fromId}`);
        continue;
      }
      
      for (const toId of toIds) {
        if (!this.hasTray(toId)) {
          errors.push(`fromTo[${fromId}] references non-existent tray: ${toId}`);
        }
      }
    }
    
    for (const [toId, fromIds] of Object.entries(this.state.toFrom)) {
      if (!this.hasTray(toId)) {
        errors.push(`toFrom references non-existent tray: ${toId}`);
        continue;
      }
      
      for (const fromId of fromIds) {
        if (!this.hasTray(fromId)) {
          errors.push(`toFrom[${toId}] references non-existent tray: ${fromId}`);
        }
      }
    }
    
    // Check for consistency between fromTo and toFrom
    for (const [fromId, toIds] of Object.entries(this.state.fromTo)) {
      for (const toId of toIds) {
        const reverseRefs = this.state.toFrom[toId] || [];
        if (!reverseRefs.includes(fromId)) {
          errors.push(`Inconsistent reference: ${fromId} -> ${toId} exists but reverse doesn't`);
        }
      }
    }
    
    // Check root exists and is valid
    if (this.state.rootId && !this.hasTray(this.state.rootId)) {
      errors.push(`Root tray ${this.state.rootId} does not exist`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create from existing hierarchy data
   */
  static fromHierarchy(hierarchy: {
    rootId: TrayId | null;
    parentToChildren: Record<TrayId, TrayId[]>;
    childToParent: Record<TrayId, TrayId>;
  }): TrayGraph {
    const graph = new TrayGraph(hierarchy.rootId);
    
    // Add all nodes first
    const allIds = new Set<TrayId>();
    if (hierarchy.rootId) allIds.add(hierarchy.rootId);
    
    Object.keys(hierarchy.parentToChildren).forEach(id => allIds.add(id));
    Object.values(hierarchy.parentToChildren).flat().forEach(id => allIds.add(id));
    Object.keys(hierarchy.childToParent).forEach(id => allIds.add(id));
    Object.values(hierarchy.childToParent).forEach(id => allIds.add(id));
    
    // Add nodes
    for (const id of allIds) {
      if (id) {
        graph.addTray(id);
      }
    }
    
    // Add edges from parentToChildren
    for (const [parentId, childIds] of Object.entries(hierarchy.parentToChildren)) {
      for (const childId of childIds) {
        graph.setParent(childId, parentId);
      }
    }
    
    return graph;
  }

  /**
   * Convert to hierarchy format for state management
   */
  toHierarchy(): {
    rootId: TrayId | null;
    parentToChildren: Record<TrayId, TrayId[]>;
    childToParent: Record<TrayId, TrayId>;
  } {
    const parentToChildren: Record<TrayId, TrayId[]> = {};
    const childToParent: Record<TrayId, TrayId> = {};
    
    // Build parentToChildren from fromTo
    for (const [parentId, childIds] of Object.entries(this.state.fromTo)) {
      if (childIds.length > 0) {
        parentToChildren[parentId] = [...childIds];
      }
    }
    
    // Build childToParent from toFrom
    for (const [childId, parentIds] of Object.entries(this.state.toFrom)) {
      if (parentIds.length > 0) {
        childToParent[childId] = parentIds[0]; // Tree structure, only one parent
      }
    }
    
    return {
      rootId: this.state.rootId,
      parentToChildren,
      childToParent
    };
  }
}

// Helper types
export interface TreeNode {
  id: TrayId;
  children: TreeNode[];
}

export interface FlatTreeNode {
  id: TrayId;
  depth: number;
}

// Create singleton instance
export const trayGraph = new TrayGraph();