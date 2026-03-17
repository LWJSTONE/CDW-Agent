/**
 * 原型网络 (Prototype Network)
 *
 * 核心原理：为每个任务/概念维护一个"原型向量"。
 * 新输入仅需计算与少量原型的距离即可决策，天然适合少样本学习。
 */

import { Vector, Sample, Prototype, PrototypeMatchResult } from './types';

export class PrototypeNetwork {
  private prototypes: Map<string, Prototype> = [];
  private distanceThreshold: number;
  private learningRate: number;

  constructor(distanceThreshold: number = 0.5, learningRate: number = 0.1) {
    this.distanceThreshold = distanceThreshold;
    this.learningRate = learningRate;
  }

  private euclideanDistance(a: Vector, b: Vector): number {
    if (a.dimension !== b.dimension) return Infinity;
    let sum = 0;
    for (let i = 0; i < a.dimension; i++) {
      sum += Math.pow(a.data[i] - b.data[i], 2);
    }
    return Math.sqrt(sum);
  }

  private cosineSimilarity(a: Vector, b: Vector): number {
    if (a.dimension !== b.dimension) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.dimension; i++) {
      dotProduct += a.data[i] * b.data[i];
      normA += a.data[i] * a.data[i];
      normB += b.data[i] * b.data[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  findNearestPrototype(input: Vector): PrototypeMatchResult | null {
    if (this.prototypes.length === 0) return null;

    let bestMatch: PrototypeMatchResult | null = null;
    let minDistance = Infinity;

    for (const prototype of this.prototypes) {
      const distance = this.euclideanDistance(input, prototype.vector);
      const similarity = this.cosineSimilarity(input, prototype.vector);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = { prototype, distance, similarity, isWithinThreshold: distance < this.distanceThreshold };
      }
    }
    return bestMatch;
  }

  addPrototype(vector: Vector, label: string, initialSampleCount: number = 1): Prototype {
    const prototype: Prototype = {
      id: `proto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      vector, label, sampleCount: initialSampleCount, lastUpdated: Date.now(), variance: 0
    };
    this.prototypes.push(prototype);
    return prototype;
  }

  learnSample(sample: Sample): { action: 'updated' | 'created'; prototype: Prototype; matchResult: PrototypeMatchResult | null } {
    const matchResult = this.findNearestPrototype(sample.input);

    if (matchResult && matchResult.isWithinThreshold && matchResult.prototype.label === sample.label) {
      const prototype = this.prototypes.find(p => p.id === matchResult.prototype.id)!;
      const alpha = this.learningRate;
      prototype.vector = {
        data: prototype.vector.data.map((v, i) => v * (1 - alpha) + sample.input.data[i] * alpha),
        dimension: prototype.vector.dimension
      };
      prototype.sampleCount += 1;
      prototype.lastUpdated = Date.now();
      return { action: 'updated', prototype, matchResult: { ...matchResult, prototype } };
    } else {
      const newPrototype = this.addPrototype(sample.input, sample.label || 'unknown');
      return { action: 'created', prototype: newPrototype, matchResult: null };
    }
  }

  predict(input: Vector): { label: string; confidence: number; prototype: Prototype | null; distances: PrototypeMatchResult[] } {
    const results: PrototypeMatchResult[] = [];
    for (const prototype of this.prototypes) {
      const distance = this.euclideanDistance(input, prototype.vector);
      const similarity = this.cosineSimilarity(input, prototype.vector);
      results.push({ prototype, distance, similarity, isWithinThreshold: distance < this.distanceThreshold });
    }
    results.sort((a, b) => a.distance - b.distance);
    const topK = results.slice(0, 5);

    if (topK.length === 0) return { label: 'unknown', confidence: 0, prototype: null, distances: [] };
    const best = topK[0];
    return { label: best.prototype.label, confidence: Math.exp(-best.distance), prototype: best.prototype, distances: topK };
  }

  getPrototypes(): Prototype[] { return [...this.prototypes]; }
  getPrototypeCount(): number { return this.prototypes.length; }
}

export function demonstrateFewShotLearning(): {
  scenario: string;
  process: string[];
  results: { samplesUsed: number; prototypesCreated: number; testAccuracy: number; comparisonWithDeepLearning: string };
  explanation: string;
} {
  const network = new PrototypeNetwork(0.3, 0.2);
  const dimension = 8;
  const categories = ['cat', 'dog', 'bird'];
  const centroids: Map<string, number[]> = new Map([
    ['cat', [1, 0, 0, 0, 0, 0, 0, 0]],
    ['dog', [0, 1, 0, 0, 0, 0, 0, 0]],
    ['bird', [0, 0, 1, 0, 0, 0, 0, 0]]
  ]);

  const processSteps: string[] = [];
  let sampleCount = 0;

  for (const category of categories) {
    const centroid = centroids.get(category)!;
    for (let i = 0; i < 2; i++) {
      const noisySample: Sample = {
        id: `${category}-${i}`,
        input: { data: centroid.map(v => v + (Math.random() - 0.5) * 0.2), dimension },
        label: category,
        timestamp: Date.now()
      };
      const result = network.learnSample(noisySample);
      sampleCount++;
      processSteps.push(`样本 ${sampleCount}: ${category}, 动作: ${result.action === 'created' ? '创建新原型' : '更新现有原型'}`);
    }
  }

  let correct = 0;
  const testCount = 30;
  for (let i = 0; i < testCount; i++) {
    const category = categories[i % 3];
    const centroid = centroids.get(category)!;
    const testSample: Vector = { data: centroid.map(v => v + (Math.random() - 0.5) * 0.3), dimension };
    const prediction = network.predict(testSample);
    if (prediction.label === category) correct++;
  }

  return {
    scenario: '每类仅2个样本的少样本学习',
    process: processSteps,
    results: {
      samplesUsed: sampleCount,
      prototypesCreated: network.getPrototypeCount(),
      testAccuracy: correct / testCount,
      comparisonWithDeepLearning: `传统深度学习需要每类数百到数千样本，原型网络仅用${sampleCount}个样本。`
    },
    explanation: `原型网络通过存储类别"中心点"实现快速学习。样本效率高，可解释性强。`
  };
}
