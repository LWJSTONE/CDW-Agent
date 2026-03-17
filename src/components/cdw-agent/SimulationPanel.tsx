'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { CDWAgent } from '@/lib/cdw-agent';
import { Vector } from '@/lib/cdw-agent/types';

interface SimulationState {
  isRunning: boolean;
  speed: number;
  taskComplexity: number;
  totalProcessed: number;
  fastSystemCount: number;
  slowSystemCount: number;
  currentDecision: { system: 'fast' | 'slow'; confidence: number; reasoning: string } | null;
  stats: { avgConfidence: number; avgPredictionError: number; sparsityRatio: number };
  logs: Array<{ timestamp: number; type: 'fast' | 'slow' | 'learn' | 'sleep'; message: string }>;
}

export function SimulationPanel() {
  const [state, setState] = useState<SimulationState>({
    isRunning: false, speed: 500, taskComplexity: 0.5, totalProcessed: 0, fastSystemCount: 0, slowSystemCount: 0, currentDecision: null,
    stats: { avgConfidence: 0, avgPredictionError: 0, sparsityRatio: 0 }, logs: []
  });

  const agentRef = useRef<CDWAgent | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsRef = useRef({ totalConfidence: 0, totalError: 0, totalSparsity: 0, count: 0 });

  useEffect(() => {
    agentRef.current = new CDWAgent({ inputDimension: 32, numExperts: 4, topK: 1 });
  }, []);

  const generateInput = useCallback((complexity: number): Vector => {
    const dimension = 32;
    const data = Array(dimension).fill(0).map(() => Math.random() < complexity ? Math.random() : Math.random() * 0.2);
    return { data, dimension };
  }, []);

  const processStep = useCallback(() => {
    if (!agentRef.current) return;
    const input = generateInput(state.taskComplexity);
    const result = agentRef.current.process(input);

    statsRef.current.totalConfidence += result.confidence;
    statsRef.current.totalError += result.metrics.predictionError;
    statsRef.current.totalSparsity += result.metrics.sparsity;
    statsRef.current.count++;

    const newLog = { timestamp: Date.now(), type: result.system as 'fast' | 'slow', message: result.decision };

    setState(prev => {
      const newFastCount = result.system === 'fast' ? prev.fastSystemCount + 1 : prev.fastSystemCount;
      const newSlowCount = result.system === 'slow' ? prev.slowSystemCount + 1 : prev.slowSystemCount;
      const count = statsRef.current.count;

      return {
        ...prev, totalProcessed: prev.totalProcessed + 1, fastSystemCount: newFastCount, slowSystemCount: newSlowCount,
        currentDecision: { system: result.system, confidence: result.confidence, reasoning: result.reasoning },
        stats: {
          avgConfidence: statsRef.current.totalConfidence / count,
          avgPredictionError: statsRef.current.totalError / count,
          sparsityRatio: statsRef.current.totalSparsity / count,
        },
        logs: [newLog, ...prev.logs.slice(0, 49)],
      };
    });
  }, [generateInput, state.taskComplexity]);

  const toggleSimulation = useCallback(() => {
    setState(prev => {
      const newRunning = !prev.isRunning;
      if (newRunning) {
        intervalRef.current = setInterval(processStep, prev.speed);
      } else if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return { ...prev, isRunning: newRunning };
    });
  }, [processStep]);

  const handleSpeedChange = useCallback((value: number[]) => {
    const newSpeed = 1100 - value[0];
    setState(prev => ({ ...prev, speed: newSpeed }));
    if (state.isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(processStep, newSpeed);
    }
  }, [state.isRunning, processStep]);

  const handleComplexityChange = useCallback((value: number[]) => {
    setState(prev => ({ ...prev, taskComplexity: value[0] / 100 }));
  }, []);

  const triggerSleep = useCallback(() => {
    if (!agentRef.current) return;
    const result = agentRef.current.sleep();
    setState(prev => ({ ...prev, logs: [{ timestamp: Date.now(), type: 'sleep', message: `睡眠巩固：${result.summary}` }, ...prev.logs] }));
  }, []);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const fastRatio = state.totalProcessed > 0 ? (state.fastSystemCount / state.totalProcessed * 100).toFixed(1) : '0';

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>实时模拟</CardTitle>
            <CardDescription>观察 CDW-Agent 双系统协同工作</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={state.isRunning} onCheckedChange={toggleSimulation} />
            <Label>{state.isRunning ? '运行中' : '已暂停'}</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>处理速度: {state.speed}ms/步</Label>
            <Slider value={[1100 - state.speed]} onValueChange={handleSpeedChange} max={1000} min={100} step={100} />
          </div>
          <div className="space-y-2">
            <Label>任务复杂度: {(state.taskComplexity * 100).toFixed(0)}%</Label>
            <Slider value={[state.taskComplexity * 100]} onValueChange={handleComplexityChange} max={100} min={0} step={10} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="总处理数" value={state.totalProcessed} icon="📊" />
          <StatCard label="快系统" value={state.fastSystemCount} subValue={`${fastRatio}%`} icon="⚡" color="green" />
          <StatCard label="慢系统" value={state.slowSystemCount} subValue={`${(100 - parseFloat(fastRatio)).toFixed(1)}%`} icon="🧠" color="purple" />
          <StatCard label="平均置信度" value={`${(state.stats.avgConfidence * 100).toFixed(1)}%`} icon="🎯" />
        </div>

        {state.currentDecision && (
          <div className={cn("border-2 rounded-lg p-4 transition-all", state.currentDecision.system === 'fast' ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-purple-500 bg-purple-50 dark:bg-purple-950")}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={state.currentDecision.system === 'fast' ? 'default' : 'secondary'}>{state.currentDecision.system === 'fast' ? '快系统' : '慢系统'}</Badge>
              <span className="text-sm">置信度: {(state.currentDecision.confidence * 100).toFixed(1)}%</span>
            </div>
            <p className="text-sm font-mono">{state.currentDecision.reasoning}</p>
          </div>
        )}

        <div className="space-y-3">
          <div><div className="flex justify-between text-sm mb-1"><span>预测误差</span><span>{state.stats.avgPredictionError.toFixed(3)}</span></div><Progress value={Math.min(100, state.stats.avgPredictionError * 100)} className="h-2" /></div>
          <div><div className="flex justify-between text-sm mb-1"><span>稀疏度</span><span>{(state.stats.sparsityRatio * 100).toFixed(1)}%</span></div><Progress value={state.stats.sparsityRatio * 100} className="h-2" /></div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={triggerSleep} disabled={state.isRunning}>🌙 触发睡眠巩固</Button>
          <Button variant="outline" onClick={() => {
            statsRef.current = { totalConfidence: 0, totalError: 0, totalSparsity: 0, count: 0 };
            setState(prev => ({ ...prev, totalProcessed: 0, fastSystemCount: 0, slowSystemCount: 0, currentDecision: null, stats: { avgConfidence: 0, avgPredictionError: 0, sparsityRatio: 0 }, logs: [] }));
            agentRef.current = new CDWAgent({ inputDimension: 32, numExperts: 4, topK: 1 });
          }}>🔄 重置</Button>
        </div>

        <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
          <h4 className="text-sm font-medium mb-2">处理日志</h4>
          <div className="space-y-1">
            {state.logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <Badge variant="outline" className={cn("text-[10px] px-1", log.type === 'fast' && "bg-green-100 text-green-800", log.type === 'slow' && "bg-purple-100 text-purple-800", log.type === 'sleep' && "bg-blue-100 text-blue-800")}>{log.type.toUpperCase()}</Badge>
                <span className="text-muted-foreground">{log.message}</span>
              </div>
            ))}
            {state.logs.length === 0 && <p className="text-xs text-muted-foreground">启动模拟以查看日志</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardProps { label: string; value: number | string; subValue?: string; icon: string; color?: 'green' | 'purple' | 'default'; }

function StatCard({ label, value, subValue, icon, color = 'default' }: StatCardProps) {
  const colorClasses = { default: 'bg-muted', green: 'bg-green-100 dark:bg-green-900', purple: 'bg-purple-100 dark:bg-purple-900' };
  return (
    <div className={cn("rounded-lg p-3", colorClasses[color])}>
      <div className="flex items-center gap-1 mb-1"><span>{icon}</span><span className="text-xs text-muted-foreground">{label}</span></div>
      <div className="text-xl font-bold">{value}</div>
      {subValue && <div className="text-xs text-muted-foreground">{subValue}</div>}
    </div>
  );
}
