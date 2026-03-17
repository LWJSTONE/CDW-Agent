/**
 * 稀疏 Mixture of Experts (Sparse MoE)
 *
 * 核心原理：引入"齿状回(DG)"式的稀疏编码门控，
 * 实现专家网络的动态稀疏路由，确保每次仅激活极少数专家。
 */

import { Vector, Expert, MoEGateOutput, SparseMoEState, Sample } from './types';

export class SparseMoENetwork {
  private state: SparseMoEState;
  private inputDimension: number;
  private expertHiddenDim: number;
  private expertOutputDim: number;
  private noiseStd: number;

  constructor(inputDim: number, numExperts: number, topK: number, expertHiddenDim: number = 64, expertOutputDim: number = 32) {
    this.inputDimension = inputDim;
    this.expertHiddenDim = expertHiddenDim;
    this.expertOutputDim = expertOutputDim;
    this.noiseStd = 0.1;
    this.state = this.initializeState(numExperts, topK);
  }

  private initializeState(numExperts: number, topK: number): SparseMoEState {
    const experts = new Map<string, Expert>();
    const specializations = ['pattern-recognition', 'sequence-processing', 'spatial-reasoning', 'temporal-prediction', 'anomaly-detection', 'feature-extraction', 'noise-filtering', 'context-modeling'];

    for (let i = 0; i < numExperts; i++) {
      const expert: Expert = {
        id: `expert-${i}`,
        weights: this.initializeExpertWeights(),
        bias: new Array(this.expertOutputDim).fill(0),
        specialization: specializations[i % specializations.length],
        activationCount: 0,
        lastActive: 0
      };
      experts.set(expert.id, expert);
    }

    const gateWeights: number[][] = [];
    for (let i = 0; i < numExperts; i++) {
      const row: number[] = [];
      for (let j = 0; j < this.inputDimension; j++) {
        row.push((Math.random() * 2 - 1) * Math.sqrt(2.0 / this.inputDimension));
      }
      gateWeights.push(row);
    }

    const utilization = new Map<string, number>();
    experts.forEach((_, id) => utilization.set(id, 0));

    return { experts, gateWeights, topK, totalActivations: 0, expertUtilization: utilization };
  }

  private initializeExpertWeights(): number[][] {
    const weights: number[][] = [];
    for (let i = 0; i < this.expertHiddenDim; i++) {
      const row: number[] = [];
      for (let j = 0; j < this.inputDimension; j++) {
        row.push((Math.random() * 2 - 1) * Math.sqrt(2.0 / this.inputDimension));
      }
      weights.push(row);
    }
    for (let i = 0; i < this.expertOutputDim; i++) {
      const row: number[] = [];
      for (let j = 0; j < this.expertHiddenDim; j++) {
        row.push((Math.random() * 2 - 1) * Math.sqrt(2.0 / this.expertHiddenDim));
      }
      weights.push(row);
    }
    return weights;
  }

  private computeGate(input: Vector): MoEGateOutput {
    const numExperts = this.state.experts.size;
    const logits: number[] = [];

    for (let i = 0; i < numExperts; i++) {
      let logit = 0;
      for (let j = 0; j < this.inputDimension; j++) {
        logit += input.data[j] * this.state.gateWeights[i][j];
      }
      logit += (Math.random() - 0.5) * 2 * this.noiseStd;
      logits.push(logit);
    }

    const indexed = logits.map((logit, idx) => ({ logit, idx }));
    indexed.sort((a, b) => b.logit - a.logit);

    const topKIndices = indexed.slice(0, this.state.topK);
    const selectedExperts = topKIndices.map(item => `expert-${item.idx}`);
    const topKLogits = topKIndices.map(item => item.logit);

    const maxLogit = Math.max(...topKLogits);
    const expLogits = topKLogits.map(l => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const weights = expLogits.map(e => e / sumExp);

    return { selectedExperts, weights, logits, sparsity: 1 - (this.state.topK / numExperts) };
  }

  private expertForward(expert: Expert, input: Vector): Vector {
    const hidden: number[] = [];
    for (let i = 0; i < this.expertHiddenDim; i++) {
      let sum = 0;
      for (let j = 0; j < this.inputDimension; j++) {
        sum += input.data[j] * expert.weights[i][j];
      }
      hidden.push(Math.max(0, sum));
    }

    const output: number[] = [];
    const secondLayerStart = this.expertHiddenDim;
    for (let i = 0; i < this.expertOutputDim; i++) {
      let sum = expert.bias[i];
      for (let j = 0; j < this.expertHiddenDim; j++) {
        sum += hidden[j] * expert.weights[secondLayerStart + i][j];
      }
      output.push(sum);
    }
    return { data: output, dimension: output.length };
  }

  forward(input: Vector): { output: Vector; gateOutput: MoEGateOutput; expertOutputs: Map<string, Vector>; computationSavings: number } {
    const gateOutput = this.computeGate(input);
    const expertOutputs = new Map<string, Vector>();
    const outputDim = this.expertOutputDim;
    const combinedOutput: number[] = new Array(outputDim).fill(0);

    for (let i = 0; i < gateOutput.selectedExperts.length; i++) {
      const expertId = gateOutput.selectedExperts[i];
      const expert = this.state.experts.get(expertId);
      if (expert) {
        const expertOutput = this.expertForward(expert, input);
        expertOutputs.set(expertId, expertOutput);
        for (let j = 0; j < outputDim; j++) {
          combinedOutput[j] += gateOutput.weights[i] * expertOutput.data[j];
        }
        expert.activationCount++;
        expert.lastActive = Date.now();
      }
    }
    this.state.totalActivations++;

    const totalExperts = this.state.experts.size;
    const computationSavings = (1 - this.state.topK / totalExperts) * 100;

    return { output: { data: combinedOutput, dimension: outputDim }, gateOutput, expertOutputs, computationSavings };
  }

  processSample(sample: Sample): { output: Vector; activeExperts: string[]; sparsity: number; computationSavings: number } {
    const result = this.forward(sample.input);
    for (const expertId of result.gateOutput.selectedExperts) {
      const currentUtil = this.state.expertUtilization.get(expertId) || 0;
      this.state.expertUtilization.set(expertId, currentUtil + 1);
    }
    return { output: result.output, activeExperts: result.gateOutput.selectedExperts, sparsity: result.gateOutput.sparsity, computationSavings: result.computationSavings };
  }

  getExpertUtilization(): Map<string, { id: string; specialization: string; activations: number; utilizationRate: number }> {
    const result = new Map<string, { id: string; specialization: string; activations: number; utilizationRate: number }>();
    const total = this.state.totalActivations || 1;
    this.state.experts.forEach((expert, id) => {
      result.set(id, { id, specialization: expert.specialization, activations: expert.activationCount, utilizationRate: expert.activationCount / total });
    });
    return result;
  }

  getSparsityStats(): { topK: number; totalExperts: number; sparsityRatio: number; avgActiveExperts: number; computationReduction: string } {
    return {
      topK: this.state.topK,
      totalExperts: this.state.experts.size,
      sparsityRatio: 1 - (this.state.topK / this.state.experts.size),
      avgActiveExperts: this.state.topK,
      computationReduction: `${((1 - this.state.topK / this.state.experts.size) * 100).toFixed(1)}%`
    };
  }

  getState(): SparseMoEState {
    return { ...this.state, experts: new Map(this.state.experts), expertUtilization: new Map(this.state.expertUtilization) };
  }
}

export function demonstrateSparseMoE(): {
  scenario: string;
  results: { traditionalDense: { activeParams: number; computeUnits: number }; sparseMoE: { activeParams: number; computeUnits: number }; savings: number };
  expertUtilization: Array<{ id: string; specialization: string; rate: number }>;
  explanation: string;
} {
  const inputDim = 64;
  const numExperts = 8;
  const topK = 2;
  const moe = new SparseMoENetwork(inputDim, numExperts, topK);

  const samples: Sample[] = [];
  for (let i = 0; i < 100; i++) {
    const pattern = i % 4;
    const data = new Array(inputDim).fill(0);
    for (let j = pattern * 16; j < (pattern + 1) * 16; j++) {
      data[j] = Math.random();
    }
    samples.push({ id: `sample-${i}`, input: { data, dimension: inputDim }, timestamp: Date.now() });
  }

  let totalSavings = 0;
  for (const sample of samples) {
    const result = moe.processSample(sample);
    totalSavings += result.computationSavings;
  }

  const expertParamCount = inputDim * 64 + 64 * 32;
  const traditionalActiveParams = expertParamCount * numExperts;
  const sparseActiveParams = expertParamCount * topK;

  const utilization = moe.getExpertUtilization();
  const utilizationArray = Array.from(utilization.values()).map(u => ({ id: u.id, specialization: u.specialization, rate: u.utilizationRate }));

  return {
    scenario: `${numExperts}个专家中每次仅激活${topK}个`,
    results: {
      traditionalDense: { activeParams: traditionalActiveParams, computeUnits: traditionalActiveParams },
      sparseMoE: { activeParams: sparseActiveParams, computeUnits: sparseActiveParams },
      savings: ((1 - sparseActiveParams / traditionalActiveParams) * 100)
    },
    expertUtilization: utilizationArray,
    explanation: `稀疏MoE通过门控机制，每次只激活${topK}/${numExperts}的专家网络。计算节省约${(totalSavings / 100).toFixed(1)}%。`
  };
}
