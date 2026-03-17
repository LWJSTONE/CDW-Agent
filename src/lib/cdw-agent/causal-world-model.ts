/**
 * 因果世界模型 (Causal World Model)
 *
 * 核心原理：结构因果模型(SCM)与能量模型的结合。
 * SCM支持干预与反事实推理，能量模型评估状态转移的"合理性"。
 */

import { Vector, CausalNode, CausalEdge, CausalGraph, InterventionResult, EnergyModelState, Sample } from './types';

export class CausalWorldModel {
  private graph: CausalGraph;
  private energyModel: EnergyModelState;

  constructor() {
    this.graph = { nodes: new Map(), edges: [], adjacencyMatrix: [] };
    this.energyModel = { states: [], energyFunction: this.defaultEnergyFunction.bind(this), currentEnergy: 0, temperature: 1.0 };
  }

  private defaultEnergyFunction(state: Vector, action: Vector, nextState: Vector): number {
    let energy = 0;
    for (let i = 0; i < state.dimension; i++) energy += Math.pow(nextState.data[i] - state.data[i], 2);
    const actionMagnitude = Math.sqrt(action.data.reduce((sum, v) => sum + v * v, 0));
    energy += actionMagnitude * 0.1;
    return energy;
  }

  addNode(node: CausalNode): void {
    this.graph.nodes.set(node.id, node);
    this.updateAdjacencyMatrix();
  }

  addEdge(edge: CausalEdge): void {
    this.graph.edges.push(edge);
    this.updateAdjacencyMatrix();
  }

  private updateAdjacencyMatrix(): void {
    const nodeIds = Array.from(this.graph.nodes.keys());
    const n = nodeIds.length;
    const indexMap = new Map<string, number>();
    nodeIds.forEach((id, idx) => indexMap.set(id, idx));
    this.graph.adjacencyMatrix = Array(n).fill(null).map(() => Array(n).fill(0));
    for (const edge of this.graph.edges) {
      const fromIdx = indexMap.get(edge.from);
      const toIdx = indexMap.get(edge.to);
      if (fromIdx !== undefined && toIdx !== undefined) this.graph.adjacencyMatrix[fromIdx][toIdx] = edge.strength;
    }
  }

  observationalQuery(evidence: Map<string, number>, queryVariable: string): { mean: number; variance: number } {
    const node = this.graph.nodes.get(queryVariable);
    if (!node || !node.distribution) return { mean: 0, variance: 1 };
    let adjustedMean = node.distribution.mean;
    const parentEdges = this.graph.edges.filter(e => e.to === queryVariable);
    for (const edge of parentEdges) {
      const parentValue = evidence.get(edge.from);
      if (parentValue !== undefined) adjustedMean += edge.strength * parentValue;
    }
    return { mean: adjustedMean, variance: node.distribution.variance };
  }

  interventionalQuery(interventionVariable: string, interventionValue: number, queryVariable: string, otherEvidence?: Map<string, number>): InterventionResult {
    const values = new Map<string, number>();
    values.set(interventionVariable, interventionValue);
    if (otherEvidence) for (const [k, v] of otherEvidence) if (k !== interventionVariable) values.set(k, v);

    const topologicalOrder = this.getTopologicalOrder();
    for (const nodeId of topologicalOrder) {
      if (nodeId === interventionVariable) continue;
      const node = this.graph.nodes.get(nodeId);
      if (!node) continue;
      const parentEdges = this.graph.edges.filter(e => e.to === nodeId);
      if (!values.has(nodeId)) {
        let value = node.distribution?.mean ?? 0;
        for (const edge of parentEdges) {
          const parentVal = values.get(edge.from);
          if (parentVal !== undefined) value += edge.strength * parentVal;
        }
        values.set(nodeId, value);
      }
    }
    return { variable: interventionVariable, originalValue: 0, intervenedValue: interventionValue, effects: values, counterfactual: new Map() };
  }

  counterfactualReasoning(factualState: Map<string, number>, interventionVariable: string, interventionValue: number, queryVariable: string): { factual: number; counterfactual: number; difference: number; explanation: string } {
    const counterfactualState = new Map(factualState);
    counterfactualState.set(interventionVariable, interventionValue);

    const topologicalOrder = this.getTopologicalOrder();
    const changed = new Set<string>([interventionVariable]);

    for (const nodeId of topologicalOrder) {
      if (nodeId === interventionVariable) continue;
      const parentEdges = this.graph.edges.filter(e => e.to === nodeId);
      const hasChangedParent = parentEdges.some(e => changed.has(e.from));
      if (hasChangedParent) {
        let newValue = 0;
        for (const edge of parentEdges) newValue += edge.strength * (counterfactualState.get(edge.from) || 0);
        counterfactualState.set(nodeId, newValue);
        changed.add(nodeId);
      }
    }

    const factual = factualState.get(queryVariable) || 0;
    const counterfactual = counterfactualState.get(queryVariable) || 0;

    return {
      factual,
      counterfactual,
      difference: counterfactual - factual,
      explanation: `将${interventionVariable}从${factualState.get(interventionVariable) || 0}改为${interventionValue}，${queryVariable}从${factual.toFixed(3)}变为${counterfactual.toFixed(3)}。`
    };
  }

  private getTopologicalOrder(): string[] {
    const nodeIds = Array.from(this.graph.nodes.keys());
    const inDegree = new Map<string, number>();
    const result: string[] = [];
    for (const id of nodeIds) inDegree.set(id, 0);
    for (const edge of this.graph.edges) inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);

    const queue: string[] = [];
    for (const [id, degree] of inDegree) if (degree === 0) queue.push(id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      for (const edge of this.graph.edges) {
        if (edge.from === current) {
          const newDegree = (inDegree.get(edge.to) || 1) - 1;
          inDegree.set(edge.to, newDegree);
          if (newDegree === 0) queue.push(edge.to);
        }
      }
    }
    return result;
  }

  evaluateEnergy(state: Vector, action: Vector, nextState: Vector): number {
    const energy = this.energyModel.energyFunction(state, action, nextState);
    this.energyModel.currentEnergy = energy;
    return energy;
  }

  searchOptimalState(currentState: Vector, action: Vector, candidateStates: Vector[]): { optimalState: Vector; energy: number; rankings: Array<{ state: Vector; energy: number }> } {
    const rankings = candidateStates.map(state => ({ state, energy: this.evaluateEnergy(currentState, action, state) }));
    rankings.sort((a, b) => a.energy - b.energy);
    return { optimalState: rankings[0].state, energy: rankings[0].energy, rankings };
  }

  learnFromData(samples: Sample[]): { discoveredEdges: Array<{ from: string; to: string; strength: number }>; confidence: number } {
    const discoveredEdges: Array<{ from: string; to: string; strength: number }> = [];
    if (samples.length < 2) return { discoveredEdges, confidence: 0 };

    const dim = samples[0].input.dimension;
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        if (i === j) continue;
        const correlation = this.computeCorrelation(samples, i, j);
        if (Math.abs(correlation) > 0.5) discoveredEdges.push({ from: `var-${i}`, to: `var-${j}`, strength: correlation });
      }
    }
    return { discoveredEdges, confidence: Math.min(1, samples.length / 100) };
  }

  private computeCorrelation(samples: Sample[], i: number, j: number): number {
    const n = samples.length;
    if (n < 2) return 0;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (const sample of samples) {
      const x = sample.input.data[i];
      const y = sample.input.data[j];
      sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; sumY2 += y * y;
    }
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return denominator === 0 ? 0 : numerator / denominator;
  }

  getGraph(): CausalGraph { return { nodes: new Map(this.graph.nodes), edges: [...this.graph.edges], adjacencyMatrix: this.graph.adjacencyMatrix.map(row => [...row]) }; }
  getEnergyModelState(): EnergyModelState { return { ...this.energyModel }; }
}

export function createDemoCausalModel(): CausalWorldModel {
  const model = new CausalWorldModel();

  model.addNode({ id: 'environment', name: '环境状态', type: 'observable', distribution: { mean: 0.5, variance: 0.1 } });
  model.addNode({ id: 'sensor', name: '传感器读数', type: 'observable', distribution: { mean: 0, variance: 0.05 } });
  model.addNode({ id: 'belief', name: '内部信念', type: 'latent', distribution: { mean: 0, variance: 0.1 } });
  model.addNode({ id: 'action', name: '行动决策', type: 'intervention', distribution: { mean: 0, variance: 0.2 } });
  model.addNode({ id: 'outcome', name: '结果', type: 'observable', distribution: { mean: 0, variance: 0.1 } });

  model.addEdge({ from: 'environment', to: 'sensor', mechanism: (v) => v + (Math.random() - 0.5) * 0.1, strength: 0.9 });
  model.addEdge({ from: 'sensor', to: 'belief', mechanism: (v) => v * 0.8, strength: 0.8 });
  model.addEdge({ from: 'belief', to: 'action', mechanism: (v) => v > 0.5 ? 1 : 0, strength: 0.7 });
  model.addEdge({ from: 'action', to: 'outcome', mechanism: (v) => v * 0.6, strength: 0.6 });
  model.addEdge({ from: 'environment', to: 'outcome', mechanism: (v) => v * 0.4, strength: 0.4 });

  return model;
}

export function demonstrateCausalReasoning(): {
  scenario: string;
  results: { observational: { query: string; mean: number; variance: number }; interventional: { intervention: string; effects: Map<string, number> }; counterfactual: { factual: number; counterfactual: number; difference: number } };
  explanation: string;
} {
  const model = createDemoCausalModel();

  const evidence = new Map<string, number>();
  evidence.set('environment', 0.8);
  const observational = model.observationalQuery(evidence, 'outcome');

  const interventional = model.interventionalQuery('action', 1.0, 'outcome', evidence);

  const factualState = new Map<string, number>();
  factualState.set('environment', 0.8);
  factualState.set('sensor', 0.72);
  factualState.set('belief', 0.58);
  factualState.set('action', 0);
  factualState.set('outcome', 0.32);
  const counterfactual = model.counterfactualReasoning(factualState, 'action', 1.0, 'outcome');

  return {
    scenario: '智能体决策的因果分析',
    results: {
      observational: { query: 'P(outcome | environment=0.8)', mean: observational.mean, variance: observational.variance },
      interventional: { intervention: 'do(action=1.0)', effects: interventional.effects },
      counterfactual: { factual: counterfactual.factual, counterfactual: counterfactual.counterfactual, difference: counterfactual.difference }
    },
    explanation: `因果世界模型支持干预查询P(Y|do(X))和反事实推理。事实结果：${counterfactual.factual.toFixed(3)}，反事实结果：${counterfactual.counterfactual.toFixed(3)}。`
  };
}
