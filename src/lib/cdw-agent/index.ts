/**
 * CDW-Agent 核心模块导出
 * Causal Dual-Memory World-Model Agent
 */

export * from './types';
export { PredictiveCodingNetwork, demonstratePredictiveCoding } from './predictive-coding';
export { PrototypeNetwork, demonstrateFewShotLearning } from './prototype-network';
export { SparseMoENetwork, demonstrateSparseMoE } from './sparse-moe';
export { HippocampalBuffer, demonstrateHippocampalBuffer } from './hippocampal-buffer';
export { CausalWorldModel, createDemoCausalModel, demonstrateCausalReasoning } from './causal-world-model';
export { MetacognitiveGate, demonstrateMetacognitiveGating } from './metacognitive-gating';
export { ContinualLearningSystem, demonstrateContinualLearning } from './continual-learning';

import { PredictiveCodingNetwork } from './predictive-coding';
import { PrototypeNetwork } from './prototype-network';
import { SparseMoENetwork } from './sparse-moe';
import { HippocampalBuffer } from './hippocampal-buffer';
import { CausalWorldModel, createDemoCausalModel } from './causal-world-model';
import { MetacognitiveGate } from './metacognitive-gating';
import { ContinualLearningSystem } from './continual-learning';
import { Sample, Vector, CDWAgentState, Experience } from './types';

export class CDWAgent {
  private predictiveCoding: PredictiveCodingNetwork;
  private prototypeNetwork: PrototypeNetwork;
  private sparseMoE: SparseMoENetwork;
  private hippocampalBuffer: HippocampalBuffer;
  private causalWorldModel: CausalWorldModel;
  private continualLearning: ContinualLearningSystem;
  private metacognitiveGate: MetacognitiveGate;
  private totalExperiences: number = 0;

  constructor(config?: { inputDimension?: number; numExperts?: number; topK?: number; bufferMaxSize?: number }) {
    const inputDim = config?.inputDimension ?? 64;
    const numExperts = config?.numExperts ?? 8;
    const topK = config?.topK ?? 2;

    this.predictiveCoding = new PredictiveCodingNetwork(inputDim);
    this.prototypeNetwork = new PrototypeNetwork(0.3, 0.1);
    this.sparseMoE = new SparseMoENetwork(inputDim, numExperts, topK);
    this.hippocampalBuffer = new HippocampalBuffer({ maxSize: config?.bufferMaxSize ?? 1000 });
    this.causalWorldModel = createDemoCausalModel();
    this.continualLearning = new ContinualLearningSystem();
    this.metacognitiveGate = new MetacognitiveGate(0.4);
  }

  process(input: Vector): { decision: string; system: 'fast' | 'slow'; confidence: number; reasoning: string; metrics: { predictionError: number; sparsity: number; activeExperts: string[] } } {
    const sample: Sample = { id: `sample-${Date.now()}`, input, timestamp: Date.now() };

    const pcResult = this.predictiveCoding.processSample(sample);
    const predictionError = pcResult.totalError;
    const surprisal = this.predictiveCoding.computeSurprisal(sample);
    const prototypeMatch = this.prototypeNetwork.findNearestPrototype(input);
    const moeResult = this.sparseMoE.processSample(sample);
    const energy = this.causalWorldModel.evaluateEnergy(input, { data: moeResult.output.data, dimension: moeResult.output.dimension }, input);

    const gateInput = {
      fastSystemUncertainty: prototypeMatch ? 1 - prototypeMatch.similarity : 1,
      predictionError: Math.min(1, predictionError),
      energySurprise: Math.min(1, energy),
      taskRisk: 0.5,
      recentAccuracy: 0.85
    };

    const gateDecision = this.metacognitiveGate.gate(gateInput);
    this.hippocampalBuffer.tryWrite(sample, predictionError, energy);

    let decision: string, system: 'fast' | 'slow', confidence: number;

    if (gateDecision.activateSlowSystem) {
      system = 'slow';
      const causalResult = this.causalWorldModel.interventionalQuery('action', 1, 'outcome');
      decision = `慢系统推理：${causalResult.effects.get('outcome')?.toFixed(3) || 'unknown'}`;
      confidence = gateDecision.activationProbability;
    } else {
      system = 'fast';
      decision = prototypeMatch ? `快系统匹配：${prototypeMatch.prototype.label} (距离: ${prototypeMatch.distance.toFixed(3)})` : '快系统：未知模式';
      confidence = prototypeMatch ? prototypeMatch.similarity : 0.5;
    }

    this.totalExperiences++;

    return { decision, system, confidence, reasoning: gateDecision.reasoning, metrics: { predictionError, sparsity: pcResult.sparsityRatio, activeExperts: moeResult.activeExperts } };
  }

  learn(sample: Sample): { prototypeAction: 'created' | 'updated'; stored: boolean; consolidated: boolean } {
    const protoResult = this.prototypeNetwork.learnSample(sample);
    const pcResult = this.predictiveCoding.processSample(sample);
    const energy = this.causalWorldModel.evaluateEnergy(sample.input, sample.input, sample.input);
    const bufferResult = this.hippocampalBuffer.tryWrite(sample, pcResult.totalError, energy);
    this.totalExperiences++;
    return { prototypeAction: protoResult.action, stored: bufferResult.accepted, consolidated: false };
  }

  sleep(): { consolidatedExperiences: number; newPrototypes: number; summary: string } {
    const experiences = this.hippocampalBuffer.read(50);
    const clResult = this.continualLearning.consolidate(experiences);
    this.hippocampalBuffer.markConsolidated(experiences.map(e => e.id));
    const bufferConsolidation = this.hippocampalBuffer.consolidate();
    return { consolidatedExperiences: experiences.length, newPrototypes: this.prototypeNetwork.getPrototypeCount(), summary: clResult.summary + ` 缓冲区剩余${bufferConsolidation.remainingCount}条记录。` };
  }

  getState(): CDWAgentState {
    return {
      predictiveCoding: this.predictiveCoding.getState(),
      prototypeNetwork: this.prototypeNetwork.getPrototypes(),
      sparseMoE: this.sparseMoE.getState(),
      hippocampalBuffer: this.hippocampalBuffer.getState(),
      causalWorldModel: { graph: this.causalWorldModel.getGraph(), energyModel: this.causalWorldModel.getEnergyModelState() },
      semanticMemory: { prototypes: this.prototypeNetwork.getPrototypes(), concepts: new Map(), rules: [] },
      metacognitiveGate: this.metacognitiveGate.getState(),
      continualLearning: this.continualLearning.getState(),
      dualSystem: {
        fastSystem: { type: 'fast', isActive: true, lastActivation: Date.now(), processingTime: 1, energyConsumption: 0.1 },
        slowSystem: { type: 'slow', isActive: false, lastActivation: 0, processingTime: 10, energyConsumption: 1.0 },
        gate: this.metacognitiveGate.getState(),
        currentDecision: null
      },
      totalExperiences: this.totalExperiences,
      consolidatedMemories: this.continualLearning.getState().ewc.taskCount
    };
  }

  getStats(): { totalExperiences: number; prototypeCount: number; bufferSize: number; expertUtilization: Map<string, number>; gateStats: ReturnType<MetacognitiveGate['getStats']> } {
    return {
      totalExperiences: this.totalExperiences,
      prototypeCount: this.prototypeNetwork.getPrototypeCount(),
      bufferSize: this.hippocampalBuffer.getStats().bufferSize,
      expertUtilization: this.sparseMoE.getExpertUtilization() as unknown as Map<string, number>,
      gateStats: this.metacognitiveGate.getStats()
    };
  }
}
