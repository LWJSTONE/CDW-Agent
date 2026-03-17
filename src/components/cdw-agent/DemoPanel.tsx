'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  demonstratePredictiveCoding,
  demonstrateFewShotLearning,
  demonstrateSparseMoE,
  demonstrateHippocampalBuffer,
  demonstrateCausalReasoning,
  demonstrateMetacognitiveGating,
  demonstrateContinualLearning,
} from '@/lib/cdw-agent';

interface DemoResult {
  scenario: string;
  results?: Record<string, unknown>;
  explanation: string;
  process?: unknown[];
}

export function DemoPanel() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runDemo = useCallback(async (demoType: string) => {
    setLoading(true);
    setActiveDemo(demoType);
    await new Promise(resolve => setTimeout(resolve, 300));

    let demoResult: DemoResult;
    try {
      switch (demoType) {
        case 'predictive-coding': demoResult = demonstratePredictiveCoding(); break;
        case 'few-shot': demoResult = demonstrateFewShotLearning(); break;
        case 'sparse-moe': demoResult = demonstrateSparseMoE(); break;
        case 'hippocampal': demoResult = demonstrateHippocampalBuffer(); break;
        case 'causal': demoResult = demonstrateCausalReasoning(); break;
        case 'metacognitive': demoResult = demonstrateMetacognitiveGating(); break;
        case 'continual': demoResult = demonstrateContinualLearning(); break;
        default: demoResult = { scenario: 'Unknown', explanation: 'No demo available' };
      }
      setResult(demoResult);
    } catch (error) {
      setResult({ scenario: 'Error', explanation: `演示出错: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
    setLoading(false);
  }, []);

  const demos = [
    { id: 'predictive-coding', title: '预测编码网络', description: '稀疏激活与能量节省', icon: '🧠' },
    { id: 'few-shot', title: '原型网络', description: '少样本学习验证', icon: '🎯' },
    { id: 'sparse-moe', title: '稀疏MoE', description: '专家路由与计算节省', icon: '⚡' },
    { id: 'hippocampal', title: '海马体缓冲', description: '选择性记忆存储', icon: '💾' },
    { id: 'causal', title: '因果世界模型', description: '干预与反事实推理', icon: '🔗' },
    { id: 'metacognitive', title: '元认知门控', description: '双系统动态切换', icon: '🚦' },
    { id: 'continual', title: '持续学习', description: '抗遗忘与终身学习', icon: '📚' },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>核心模块演示</CardTitle>
        <CardDescription>点击运行各模块的验证演示，查看理论效果</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {demos.map((demo) => (
            <Button key={demo.id} variant={activeDemo === demo.id ? 'default' : 'outline'} className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => runDemo(demo.id)} disabled={loading}>
              <span className="text-2xl">{demo.icon}</span>
              <span className="text-sm font-medium">{demo.title}</span>
              <span className="text-xs text-muted-foreground">{demo.description}</span>
            </Button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">运行演示中...</span>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">场景：{result.scenario}</h3>
            </div>

            {result.results && (
              <div className="bg-card border rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2"><Badge variant="secondary">结果</Badge></h4>
                <ResultsDisplay results={result.results} />
              </div>
            )}

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2"><Badge>说明</Badge></h4>
              <p className="text-sm whitespace-pre-line leading-relaxed">{result.explanation}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultsDisplay({ results }: { results: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Object.entries(results).map(([key, value]) => (
        <div key={key} className="bg-muted/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground uppercase mb-1">{formatKey(key)}</div>
          <div className="font-mono text-sm">
            {typeof value === 'number' ? value.toFixed(3) : typeof value === 'object' ? JSON.stringify(value, null, 1) : String(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}
