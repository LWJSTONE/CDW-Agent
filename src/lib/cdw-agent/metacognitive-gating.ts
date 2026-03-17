/**
 * 元认知门控网络 (Metacognitive Gating Network)
 *
 * 核心原理：动态、高效地决定何时启动慢系统。
 */

import { MetacognitiveInput, MetacognitiveOutput, MetacognitiveGateState } from './types';

export class MetacognitiveGate {
  private state: MetacognitiveGateState;
  private explorationRate: number;

  constructor(threshold: number = 0.5) {
    this.state = {
      weights: [0.25, 0.25, 0.2, 0.15, 0.15],
      bias: -threshold,
      threshold,
      history: []
    };
    this.explorationRate = 0.1;
  }

  private computeActivationScore(input: MetacognitiveInput): number {
    const features = [input.fastSystemUncertainty, input.predictionError, input.energySurprise, input.taskRisk, 1 - input.recentAccuracy];
    let score = this.state.bias;
    for (let i = 0; i < features.length; i++) score += this.state.weights[i] * features[i];
    return score;
  }

  private determineActivationLevel(score: number): MetacognitiveOutput['activationLevel'] {
    if (score < 0) return 'low';
    if (score < 0.3) return 'medium';
    if (score < 0.6) return 'high';
    return 'critical';
  }

  private generateReasoning(input: MetacognitiveInput, score: number): string {
    const reasons: string[] = [];
    if (input.fastSystemUncertainty > 0.7) reasons.push(`快系统不确定性高(${(input.fastSystemUncertainty * 100).toFixed(0)}%)`);
    if (input.predictionError > 0.5) reasons.push(`预测误差显著(${input.predictionError.toFixed(2)})`);
    if (input.energySurprise > 0.5) reasons.push(`能量惊异度高(${input.energySurprise.toFixed(2)})`);
    if (input.taskRisk > 0.7) reasons.push(`任务风险高(${(input.taskRisk * 100).toFixed(0)}%)`);
    if (input.recentAccuracy < 0.7) reasons.push(`最近准确率低(${(input.recentAccuracy * 100).toFixed(0)}%)`);
    if (reasons.length === 0) return `激活得分=${score.toFixed(3)}，快系统足够可靠，无需启动慢系统。`;
    return `激活得分=${score.toFixed(3)}，触发原因：${reasons.join('、')}。`;
  }

  gate(input: MetacognitiveInput): MetacognitiveOutput {
    const score = this.computeActivationScore(input);
    const activationProbability = 1 / (1 + Math.exp(-score * 5));
    let shouldActivate = score > 0;
    if (Math.random() < this.explorationRate) shouldActivate = Math.random() > 0.5;

    const output: MetacognitiveOutput = {
      activateSlowSystem: shouldActivate,
      activationProbability,
      activationLevel: this.determineActivationLevel(score),
      reasoning: this.generateReasoning(input, score)
    };

    this.state.history.push({ input: { ...input }, output: { ...output }, wasCorrect: null, timestamp: Date.now() });
    if (this.state.history.length > 1000) this.state.history = this.state.history.slice(-500);
    return output;
  }

  updateWithFeedback(decisionId: number, wasCorrect: boolean, performanceGain: number): void {
    const record = this.state.history[decisionId];
    if (!record) return;
    record.wasCorrect = wasCorrect;

    const reward = wasCorrect ? performanceGain : -performanceGain;
    const features = [record.input.fastSystemUncertainty, record.input.predictionError, record.input.energySurprise, record.input.taskRisk, 1 - record.input.recentAccuracy];
    const learningRate = 0.01;
    const sign = record.output.activateSlowSystem ? 1 : -1;

    for (let i = 0; i < this.state.weights.length; i++) {
      this.state.weights[i] += learningRate * sign * reward * features[i];
      this.state.weights[i] = Math.max(0.05, Math.min(0.5, this.state.weights[i]));
    }

    const sum = this.state.weights.reduce((a, b) => a + b, 0);
    this.state.weights = this.state.weights.map(w => w / sum);
  }

  getStats(): { totalDecisions: number; activationRate: number; avgActivationProbability: number; correctnessRate: number; weightDistribution: Record<string, number> } {
    const history = this.state.history;
    const activationRate = history.length > 0 ? history.filter(h => h.output.activateSlowSystem).length / history.length : 0;
    const avgActivationProbability = history.length > 0 ? history.reduce((sum, h) => sum + h.output.activationProbability, 0) / history.length : 0;
    const recordsWithFeedback = history.filter(h => h.wasCorrect !== null);
    const correctnessRate = recordsWithFeedback.length > 0 ? recordsWithFeedback.filter(h => h.wasCorrect).length / recordsWithFeedback.length : 0;

    return {
      totalDecisions: history.length,
      activationRate,
      avgActivationProbability,
      correctnessRate,
      weightDistribution: {
        uncertainty: this.state.weights[0],
        predictionError: this.state.weights[1],
        energySurprise: this.state.weights[2],
        taskRisk: this.state.weights[3],
        accuracyFactor: this.state.weights[4]
      }
    };
  }

  getState(): MetacognitiveGateState { return { ...this.state, history: this.state.history.slice(-100) }; }
}

export function demonstrateMetacognitiveGating(): {
  scenario: string;
  process: Array<{ step: number; input: MetacognitiveInput; output: MetacognitiveOutput }>;
  results: { totalDecisions: number; slowSystemActivations: number; activationRate: number; costSaving: number };
  explanation: string;
} {
  const gate = new MetacognitiveGate(0.4);
  const process: Array<{ step: number; input: MetacognitiveInput; output: MetacognitiveOutput }> = [];

  const scenarios = [
    { uncertainty: 0.1, error: 0.05, surprise: 0.1, risk: 0.2, accuracy: 0.95 },
    { uncertainty: 0.15, error: 0.1, surprise: 0.15, risk: 0.2, accuracy: 0.92 },
    { uncertainty: 0.2, error: 0.1, surprise: 0.2, risk: 0.3, accuracy: 0.9 },
    { uncertainty: 0.4, error: 0.3, surprise: 0.35, risk: 0.4, accuracy: 0.85 },
    { uncertainty: 0.45, error: 0.35, surprise: 0.4, risk: 0.5, accuracy: 0.8 },
    { uncertainty: 0.7, error: 0.6, surprise: 0.5, risk: 0.6, accuracy: 0.7 },
    { uncertainty: 0.8, error: 0.7, surprise: 0.6, risk: 0.7, accuracy: 0.6 },
    { uncertainty: 0.9, error: 0.8, surprise: 0.7, risk: 0.9, accuracy: 0.5 },
    { uncertainty: 0.95, error: 0.9, surprise: 0.8, risk: 1.0, accuracy: 0.4 }
  ];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const input: MetacognitiveInput = {
      fastSystemUncertainty: s.uncertainty,
      predictionError: s.error,
      energySurprise: s.surprise,
      taskRisk: s.risk,
      recentAccuracy: s.accuracy
    };
    const output = gate.gate(input);
    process.push({ step: i + 1, input, output });

    const wasCorrect = output.activateSlowSystem === (s.risk > 0.5 || s.uncertainty > 0.5);
    gate.updateWithFeedback(i, wasCorrect, wasCorrect ? 0.1 : -0.1);
  }

  const stats = gate.getStats();
  const fastSystemOnlyCount = process.filter(p => !p.output.activateSlowSystem).length;
  const costSaving = (fastSystemOnlyCount / process.length) * 100;

  return {
    scenario: '不同复杂度场景下的门控决策',
    process,
    results: { totalDecisions: stats.totalDecisions, slowSystemActivations: process.filter(p => p.output.activateSlowSystem).length, activationRate: stats.activationRate * 100, costSaving },
    explanation: `元认知门控网络动态决定是否启动慢系统，${costSaving.toFixed(0)}%的决策仅使用快系统完成。`
  };
}
