import test from 'node:test';
import assert from 'node:assert/strict';
import { addNode, moveNode } from '../dist/graphCore.js';

function createGraph() {
  return {
    nodes: {},
    fromTo: {},
    toFrom: {},
    nodeInfo: { information: {} }
  };
}

test('addNode adds node and initializes edges', () => {
  const graph = createGraph();
  const node = { id: 'a' };
  addNode(graph, { payload: node });
  assert.deepEqual(graph.nodes['a'], node);
  assert.deepEqual(graph.fromTo['a'], []);
});

test('moveNode updates parent relations', () => {
  const graph = createGraph();
  const parent1 = { id: 'p1' };
  const parent2 = { id: 'p2' };
  const child = { id: 'c' };
  // setup initial nodes
  graph.nodes[parent1.id] = parent1;
  graph.nodes[parent2.id] = parent2;
  graph.nodes[child.id] = child;
  graph.fromTo[parent1.id] = [child.id];
  graph.toFrom[child.id] = [parent1.id];
  graph.fromTo[parent2.id] = [];

  moveNode(graph, { payload: { newParent: parent2, dropped: child } });

  assert.deepEqual(graph.fromTo[parent1.id], []);
  assert.deepEqual(graph.fromTo[parent2.id], [child.id]);
  assert.deepEqual(graph.toFrom[child.id], [parent2.id]);
});
