'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArchitectureDiagram } from '@/components/cdw-agent/ArchitectureDiagram';
import { DemoPanel } from '@/components/cdw-agent/DemoPanel';
import { SimulationPanel } from '@/components/cdw-agent/SimulationPanel';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const [activeTab, setActiveTab] = useState('architecture');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="text-sm">技术验证</Badge>
            <h1 className="text-2xl sm:text-3xl font-bold">CDW-Agent</h1>
          </div>
          <p className="text-muted-foreground">Causal Dual-Memory World-Model Agent</p>
          <p className="text-sm text-muted-foreground mt-1">因果双记忆世界模型智能体 - 下一代AGI架构的技术蓝图验证</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
            <TabsTrigger value="architecture">架构总览</TabsTrigger>
            <TabsTrigger value="demos">模块演示</TabsTrigger>
            <TabsTrigger value="simulation">实时模拟</TabsTrigger>
          </TabsList>

          <TabsContent value="architecture" className="space-y-6">
            <ArchitectureDiagram />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <AdvantageCard title="数据效率" value="10-100x" description="原型网络+因果模型实现少样本学习" icon="📊" />
              <AdvantageCard title="算力节省" value="70-90%" description="预测编码+稀疏MoE实现事件驱动计算" icon="⚡" />
              <AdvantageCard title="可解释性" value="因果透明" description="显式因果图支持干预与反事实推理" icon="🔍" />
              <AdvantageCard title="持续学习" value="抗遗忘" description="EWC+生成式回放实现终身学习" icon="📚" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>核心创新点</CardTitle>
                <CardDescription>CDW-Agent 相比传统大模型架构的根本性突破</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-green-600 dark:text-green-400">快系统 (System 1)</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2"><span className="text-green-500">✓</span><span><strong>预测编码网络：</strong>仅传递预测误差，实现稀疏激活</span></li>
                      <li className="flex items-start gap-2"><span className="text-green-500">✓</span><span><strong>原型网络：</strong>基于距离的少样本学习，无需反向传播</span></li>
                      <li className="flex items-start gap-2"><span className="text-green-500">✓</span><span><strong>稀疏MoE：</strong>动态专家路由，每次仅激活少数专家</span></li>
                      <li className="flex items-start gap-2"><span className="text-green-500">✓</span><span><strong>海马体缓冲：</strong>选择性存储高信息量样本</span></li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-purple-600 dark:text-purple-400">慢系统 (System 2)</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2"><span className="text-purple-500">✓</span><span><strong>因果世界模型：</strong>支持 P(Y|do(X)) 干预推理</span></li>
                      <li className="flex items-start gap-2"><span className="text-purple-500">✓</span><span><strong>能量模型：</strong>评估状态合理性，检测异常</span></li>
                      <li className="flex items-start gap-2"><span className="text-purple-500">✓</span><span><strong>符号推理器：</strong>链式思维与多步规划</span></li>
                      <li className="flex items-start gap-2"><span className="text-purple-500">✓</span><span><strong>长期语义记忆：</strong>原型库、概念图谱、规则库</span></li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">协同机制</h4>
                  <p className="text-sm text-muted-foreground"><strong>元认知门控网络</strong>动态决定何时启动慢系统：综合快系统不确定性、能量惊讶度、任务风险等级，输出慢系统激活概率。通过上下文多臂赌博机算法在线优化"慢系统调用成本 vs. 性能提升"的长期回报。</p>
                </div>

                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="font-semibold mb-2">睡眠巩固流程</h4>
                  <p className="text-sm text-muted-foreground">模拟人类"日间活动-夜间睡眠"的记忆巩固机制：从海马体缓冲采样，结合生成式回放，重新训练长期语义记忆与因果世界模型。使用弹性权重巩固(EWC)保护对旧任务重要的参数，防止灾难性遗忘。</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demos"><DemoPanel /></TabsContent>
          <TabsContent value="simulation"><SimulationPanel /></TabsContent>
        </Tabs>
      </main>

      <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>CDW-Agent 技术蓝图验证 | 从"计算智能"迈向"认知智能"</p>
          <p className="mt-1">深度契合认知科学原理 · 直面数据与算力瓶颈 · 兼顾理想与现实的工程路径</p>
        </div>
      </footer>
    </div>
  );
}

interface AdvantageCardProps { title: string; value: string; description: string; icon: string; }

function AdvantageCard({ title, value, description, icon }: AdvantageCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-2xl font-bold text-primary mb-1">{value}</div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
