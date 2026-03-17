/**
 * CDW-Agent 核心类型定义
 * Causal Dual-Memory World-Model Agent
 */

// ============================================
// 基础数据结构
// ============================================

export interface Vector {
  data: number[];
  dimension: number;
}

export interface Sample {
  id: string;
  input: Vector;
  label?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface Experience extends Sample {
  predictionError: number;
  energy: number;
  importance: number;
  isConsolidated: boolean;
}

// ============================================
// 预测编码网络类型
// ============================================

export interface PredictiveLayer {
  weights: number[][];
  bias: number[];
  prediction: Vector | null;
  error: Vector | null;
  learningRate: number;
}

export interface PredictiveCodingState {
  layers: PredictiveLayer[];
  totalError: number;
  activeNeurons: number;
  totalNeurons: number;
  sparsityRatio: number;
}

// ============================================
// 原型网络类型
// ============================================

export interface Prototype {
  id: string;
  vector: Vector;
  label: string;
  sampleCount: number;
  lastUpdated: number;
  variance: number;
}

export interface PrototypeMatchResult {
  prototype: Prototype;
  distance: number;
  similarity: number;
  isWithinThreshold: boolean;
}

// ============================================
// 稀疏MoE类型
// ============================================

export interface Expert {
  id: string;
  weights: number[][];
  bias: number[];
  specialization: string;
  activationCount: number;
  lastActive: number;
}

export interface MoEGateOutput {
  selectedExperts: string[];
  weights: number[];
  logits: number[];
  sparsity: number;
}

export interface SparseMoEState {
  experts: Map<string, Expert>;
  gateWeights: number[][];
  topK: number;
  totalActivations: number;
  expertUtilization: Map<string, number>;
}

// ============================================
// 海马体缓冲类型
// ============================================

export interface HippocampalBufferConfig {
  maxSize: number;
  surpriseThreshold: number;
  energyThreshold: number;
  consolidationInterval: number;
}

export interface HippocampalBufferState {
  buffer: Experience[];
  config: HippocampalBufferConfig;
  writeCount: number;
  readCount: number;
  consolidationCount: number;
  rejectionRate: number;
}

// ============================================
// 因果世界模型类型
// ============================================

export interface CausalNode {
  id: string;
  name: string;
  type: 'observable' | 'latent' | 'intervention';
  distribution?: {
    mean: number;
    variance: number;
  };
}

export interface CausalEdge {
  from: string;
  to: string;
  mechanism: (value: number, noise?: number) => number;
  strength: number;
}

export interface CausalGraph {
  nodes: Map<string, CausalNode>;
  edges: CausalEdge[];
  adjacencyMatrix: number[][];
}

export interface InterventionResult {
  variable: string;
  originalValue: number;
  intervenedValue: number;
  effects: Map<string, number>;
  counterfactual: Map<string, number>;
}

export interface EnergyModelState {
  states: Vector[];
  energyFunction: (state: Vector, action: Vector, nextState: Vector) => number;
  currentEnergy: number;
  temperature: number;
}

// ============================================
// 元认知门控类型
// ============================================

export interface MetacognitiveInput {
  fastSystemUncertainty: number;
  predictionError: number;
  energySurprise: number;
  taskRisk: number;
  recentAccuracy: number;
}

export interface MetacognitiveOutput {
  activateSlowSystem: boolean;
  activationProbability: number;
  activationLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
}

export interface MetacognitiveGateState {
  weights: number[];
  bias: number;
  threshold: number;
  history: Array<{
    input: MetacognitiveInput;
    output: MetacognitiveOutput;
    wasCorrect: boolean | null;
    timestamp: number;
  }>;
}

// ============================================
// 持续学习类型
// ============================================

export interface FisherInformation {
  parameterName: string;
  fisherDiagonal: number[];
  importance: number;
}

export interface EWCState {
  fisherInformation: Map<string, FisherInformation>;
  optimalParams: Map<string, number[]>;
  lambda: number;
  taskCount: number;
}

export interface GenerativeReplayState {
  generator: {
    weights: number[][];
    latentDim: number;
    outputDim: number;
  };
  replayBatchSize: number;
  generatedSamples: Sample[];
}

export interface ContinualLearningState {
  ewc: EWCState;
  generativeReplay: GenerativeReplayState;
  taskMemories: Map<string, Experience[]>;
  currentTask: string;
}

// ============================================
// 系统协同类型
// ============================================

export type SystemType = 'fast' | 'slow';

export interface SystemState {
  type: SystemType;
  isActive: boolean;
  lastActivation: number;
  processingTime: number;
  energyConsumption: number;
}

export interface DualSystemState {
  fastSystem: SystemState;
  slowSystem: SystemState;
  gate: MetacognitiveGateState;
  currentDecision: {
    system: SystemType;
    confidence: number;
    reasoning: string;
  } | null;
}

// ============================================
// CDW-Agent完整状态
// ============================================

export interface CDWAgentState {
  predictiveCoding: PredictiveCodingState;
  prototypeNetwork: Prototype[];
  sparseMoE: SparseMoEState;
  hippocampalBuffer: HippocampalBufferState;
  causalWorldModel: {
    graph: CausalGraph;
    energyModel: EnergyModelState;
  };
  semanticMemory: {
    prototypes: Prototype[];
    concepts: Map<string, unknown>;
    rules: string[];
  };
  metacognitiveGate: MetacognitiveGateState;
  continualLearning: ContinualLearningState;
  dualSystem: DualSystemState;
  totalExperiences: number;
  consolidatedMemories: number;
}

// ============================================
// 可视化相关类型
// ============================================

export interface VisualizationData {
  timestamp: number;
  module: string;
  metrics: Record<string, number>;
  events: string[];
}

export interface ArchitectureNode {
  id: string;
  label: string;
  type: 'fast' | 'slow' | 'memory' | 'gate';
  position: { x: number; y: number };
  connections: string[];
  isActive?: boolean;
}

export interface DataFlow {
  from: string;
  to: string;
  data: string;
  active: boolean;
}
