/**
 * 海马体缓冲 (Hippocampal Buffer)
 *
 * 核心原理：快速存储关键事件，作为短期记忆仓库。
 * 仅存储具有高信息量的样本，90%以上的日常输入在此完成闭环。
 */

import { Sample, Experience, HippocampalBufferConfig, HippocampalBufferState, Vector } from './types';

export class HippocampalBuffer {
  private state: HippocampalBufferState;
  private prototypeCentroids: Map<string, Vector>;

  constructor(config?: Partial<HippocampalBufferConfig>) {
    this.state = {
      buffer: [],
      config: {
        maxSize: config?.maxSize ?? 1000,
        surpriseThreshold: config?.surpriseThreshold ?? 0.5,
        energyThreshold: config?.energyThreshold ?? 0.3,
        consolidationInterval: config?.consolidationInterval ?? 100
      },
      writeCount: 0, readCount: 0, consolidationCount: 0, rejectionRate: 0
    };
    this.prototypeCentroids = new Map();
  }

  private euclideanDistance(a: Vector, b: Vector): number {
    if (a.dimension !== b.dimension) return Infinity;
    let sum = 0;
    for (let i = 0; i < a.dimension; i++) sum += Math.pow(a.data[i] - b.data[i], 2);
    return Math.sqrt(sum);
  }

  private computeImportance(sample: Sample, predictionError: number, energy: number): { importance: number; factors: Record<string, number>; shouldStore: boolean; reason: string } {
    const factors = {
      predictionError: Math.min(1, predictionError / this.state.config.surpriseThreshold),
      energy: Math.min(1, energy / this.state.config.energyThreshold),
      novelty: 0,
      failure: sample.metadata?.failure ? 1 : 0
    };

    let maxNovelty = 0;
    if (this.prototypeCentroids.size > 0) {
      for (const [, centroid] of this.prototypeCentroids) {
        const distance = this.euclideanDistance(sample.input, centroid);
        maxNovelty = Math.max(maxNovelty, Math.min(1, distance / 2));
      }
    } else {
      maxNovelty = 1;
    }
    factors.novelty = maxNovelty;

    const importance = factors.predictionError * 0.3 + factors.energy * 0.25 + factors.novelty * 0.25 + factors.failure * 0.2;
    const shouldStore = factors.predictionError > 0.5 || factors.energy > 0.5 || factors.novelty > 0.7 || factors.failure > 0;

    const reasons: string[] = [];
    if (factors.predictionError > 0.5) reasons.push('高预测误差');
    if (factors.energy > 0.5) reasons.push('高能量惊异');
    if (factors.novelty > 0.7) reasons.push('高新颖度');
    if (factors.failure > 0) reasons.push('任务失败');

    return { importance, factors, shouldStore, reason: reasons.length > 0 ? reasons.join(', ') : '不满足存储条件' };
  }

  tryWrite(sample: Sample, predictionError: number, energy: number): { accepted: boolean; experience: Experience | null; importance: number; reason: string; bufferStatus: { size: number; capacity: number; fillRate: number } } {
    this.state.writeCount++;
    const importanceResult = this.computeImportance(sample, predictionError, energy);
    const bufferStatus = { size: this.state.buffer.length, capacity: this.state.config.maxSize, fillRate: this.state.buffer.length / this.state.config.maxSize };

    if (!importanceResult.shouldStore) {
      const totalAttempts = this.state.writeCount;
      this.state.rejectionRate = (this.state.rejectionRate * (totalAttempts - 1) + 0) / totalAttempts;
      return { accepted: false, experience: null, importance: importanceResult.importance, reason: importanceResult.reason, bufferStatus };
    }

    const experience: Experience = { ...sample, predictionError, energy, importance: importanceResult.importance, isConsolidated: false };

    if (this.state.buffer.length >= this.state.config.maxSize) {
      this.state.buffer.sort((a, b) => b.importance - a.importance);
      this.state.buffer.pop();
    }

    this.state.buffer.push(experience);
    if (sample.label) {
      const existing = this.prototypeCentroids.get(sample.label);
      if (existing) {
        const newCentroid = existing.data.map((v, i) => (v * existing.dimension + sample.input.data[i]) / (existing.dimension + 1));
        this.prototypeCentroids.set(sample.label, { data: newCentroid, dimension: newCentroid.length });
      } else {
        this.prototypeCentroids.set(sample.label, { ...sample.input });
      }
    }

    const totalAttempts = this.state.writeCount;
    this.state.rejectionRate = (this.state.rejectionRate * (totalAttempts - 1)) / totalAttempts;

    return { accepted: true, experience, importance: importanceResult.importance, reason: importanceResult.reason, bufferStatus };
  }

  read(batchSize: number): Experience[] {
    this.state.readCount++;
    const unconsolidated = this.state.buffer.filter(e => !e.isConsolidated).sort((a, b) => b.importance - a.importance);
    const consolidated = this.state.buffer.filter(e => e.isConsolidated).sort((a, b) => b.importance - a.importance);
    const unconsBatch = Math.min(Math.floor(batchSize * 0.7), unconsolidated.length);
    const consBatch = Math.min(batchSize - unconsBatch, consolidated.length);
    return [...unconsolidated.slice(0, unconsBatch), ...consolidated.slice(0, consBatch)];
  }

  markConsolidated(experienceIds: string[]): void {
    for (const id of experienceIds) {
      const exp = this.state.buffer.find(e => e.id === id);
      if (exp) exp.isConsolidated = true;
    }
    this.state.consolidationCount++;
  }

  consolidate(): { consolidatedCount: number; removedCount: number; remainingCount: number; importanceDistribution: { high: number; medium: number; low: number } } {
    const toRemove = this.state.buffer.filter(e => e.isConsolidated && e.importance < 0.3);
    this.state.buffer = this.state.buffer.filter(e => !(e.isConsolidated && e.importance < 0.3));

    return {
      consolidatedCount: this.state.buffer.filter(e => e.isConsolidated).length,
      removedCount: toRemove.length,
      remainingCount: this.state.buffer.length,
      importanceDistribution: {
        high: this.state.buffer.filter(e => e.importance > 0.7).length,
        medium: this.state.buffer.filter(e => e.importance >= 0.3 && e.importance <= 0.7).length,
        low: this.state.buffer.filter(e => e.importance < 0.3).length
      }
    };
  }

  getStats(): { bufferSize: number; capacity: number; writeCount: number; readCount: number; consolidationCount: number; rejectionRate: number; avgImportance: number; unconsolidatedRatio: number } {
    const avgImportance = this.state.buffer.length > 0 ? this.state.buffer.reduce((sum, e) => sum + e.importance, 0) / this.state.buffer.length : 0;
    const unconsolidatedCount = this.state.buffer.filter(e => !e.isConsolidated).length;
    return {
      bufferSize: this.state.buffer.length,
      capacity: this.state.config.maxSize,
      writeCount: this.state.writeCount,
      readCount: this.state.readCount,
      consolidationCount: this.state.consolidationCount,
      rejectionRate: this.state.rejectionRate,
      avgImportance,
      unconsolidatedRatio: this.state.buffer.length > 0 ? unconsolidatedCount / this.state.buffer.length : 0
    };
  }

  getState(): HippocampalBufferState { return { ...this.state }; }
  clear(): void { this.state.buffer = []; this.prototypeCentroids.clear(); }
}

export function demonstrateHippocampalBuffer(): {
  scenario: string;
  process: Array<{ sampleId: string; accepted: boolean; reason: string }>;
  results: { totalSamples: number; acceptedSamples: number; rejectedSamples: number; rejectionRate: number; avgImportance: number };
  explanation: string;
} {
  const buffer = new HippocampalBuffer({ maxSize: 50, surpriseThreshold: 0.5, energyThreshold: 0.3 });
  const dimension = 16;
  const totalSamples = 100;
  const process: Array<{ sampleId: string; accepted: boolean; reason: string }> = [];

  for (let i = 0; i < totalSamples; i++) {
    let predictionError: number, energy: number, label: string;
    if (i < 70) { predictionError = Math.random() * 0.3; energy = Math.random() * 0.2; label = 'common'; }
    else if (i < 85) { predictionError = 0.3 + Math.random() * 0.4; energy = 0.2 + Math.random() * 0.3; label = 'moderate'; }
    else { predictionError = 0.7 + Math.random() * 0.3; energy = 0.5 + Math.random() * 0.5; label = 'novel'; }

    const sample: Sample = {
      id: `sample-${i}`,
      input: { data: Array(dimension).fill(0).map(() => Math.random()), dimension },
      label,
      timestamp: Date.now() + i,
      metadata: i >= 95 ? { failure: true } : undefined
    };

    const result = buffer.tryWrite(sample, predictionError, energy);
    process.push({ sampleId: sample.id, accepted: result.accepted, reason: result.reason });
  }

  const stats = buffer.getStats();

  return {
    scenario: '处理100个样本，其中70%为常见模式',
    process: process.slice(-20),
    results: {
      totalSamples,
      acceptedSamples: stats.bufferSize,
      rejectedSamples: totalSamples - stats.bufferSize,
      rejectionRate: stats.rejectionRate * 100,
      avgImportance: stats.avgImportance
    },
    explanation: `海马体缓冲选择性存储高信息量样本，${stats.bufferSize}/${totalSamples}的样本被存储。`
  };
}
