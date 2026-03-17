'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ArchitectureDiagramProps {
  activeSystem?: 'fast' | 'slow' | 'both' | null;
  activeModule?: string | null;
}

export function ArchitectureDiagram({ activeSystem, activeModule }: ArchitectureDiagramProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">CDW-Agent 架构图</CardTitle>
        <CardDescription>双系统协同框架：快系统(直觉引擎) + 慢系统(推理引擎)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={cn("border-2 rounded-lg p-4 transition-all duration-300", activeSystem === 'fast' || activeSystem === 'both' ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-gray-300 dark:border-gray-700")}>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">System 1</Badge>
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">快系统 - 直觉引擎</h3>
            </div>
            <div className="space-y-3">
              <ModuleCard title="感知编码器" subtitle="预测编码网络/SNN" active={activeModule === 'predictive-coding'} description="每层预测下一层输入，仅传递预测误差" color="blue" />
              <ModuleCard title="直觉决策器" subtitle="原型网络 + 稀疏MoE" active={activeModule === 'prototype' || activeModule === 'moe'} description="原型距离匹配，稀疏专家路由" color="cyan" />
              <ModuleCard title="海马体缓冲" subtitle="高惊异样本存储" active={activeModule === 'hippocampal'} description="选择性存储关键事件，短期记忆仓库" color="teal" />
            </div>
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200"><strong>特点：</strong>低能耗、高速度、处理90%+日常输入</p>
            </div>
          </div>

          <div className={cn("border-2 rounded-lg p-4 transition-all duration-300", activeSystem === 'slow' || activeSystem === 'both' ? "border-purple-500 bg-purple-50 dark:bg-purple-950" : "border-gray-300 dark:border-gray-700")}>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">System 2</Badge>
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-400">慢系统 - 推理引擎</h3>
            </div>
            <div className="space-y-3">
              <ModuleCard title="因果世界模型" subtitle="结构因果模型 + 能量模型" active={activeModule === 'causal'} description="支持干预查询P(Y|do(X))与反事实推理" color="violet" />
              <ModuleCard title="符号/语言推理器" subtitle="LLM/符号引擎" active={activeModule === 'reasoning'} description="链式思维、多步规划、逻辑验证" color="fuchsia" />
              <ModuleCard title="长期语义记忆" subtitle="原型/规则/概念库" active={activeModule === 'memory'} description="经巩固的抽象知识，快系统的先验库" color="pink" />
            </div>
            <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <p className="text-sm text-purple-800 dark:text-purple-200"><strong>特点：</strong>深度推理、可解释、处理复杂/新颖场景</p>
            </div>
          </div>
        </div>

        <div className={cn("mt-6 border-2 rounded-lg p-4 transition-all duration-300", activeModule === 'gate' ? "border-orange-500 bg-orange-50 dark:bg-orange-950" : "border-gray-300 dark:border-gray-700")}>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">门控</Badge>
            <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-400">元认知门控网络</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">动态决定何时启动慢系统：输入快系统不确定性、能量惊讶度、任务风险等级 → 输出慢系统激活概率</p>
        </div>

        <div className={cn("mt-4 border-2 rounded-lg p-4 transition-all duration-300", activeModule === 'continual' ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "border-gray-300 dark:border-gray-700")}>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">学习</Badge>
            <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-400">持续学习机制 (睡眠巩固)</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">日间活动：快系统交互 + 海马体选择性存储 → 夜间睡眠：回放整合 + EWC抗遗忘 + 原型优化</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ModuleCardProps {
  title: string;
  subtitle: string;
  description: string;
  active?: boolean;
  color?: string;
}

function ModuleCard({ title, subtitle, description, active, color = 'blue' }: ModuleCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
    cyan: 'bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800',
    teal: 'bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800',
    violet: 'bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800',
    fuchsia: 'bg-fuchsia-50 dark:bg-fuchsia-950 border-fuchsia-200 dark:border-fuchsia-800',
    pink: 'bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800',
  };

  return (
    <div className={cn("border rounded-lg p-3 transition-all duration-200", colorClasses[color] || colorClasses.blue, active && "ring-2 ring-offset-2 ring-yellow-500")}>
      <div className="flex justify-between items-start">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">{title}</h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{description}</p>
    </div>
  );
}
