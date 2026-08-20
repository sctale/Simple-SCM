// ===== 供应商 =====
export type SupplierGrade = 'strategic' | 'preferred' | 'qualified' | 'watch' | 'eliminated';
export type SupplierStatus = 'potential' | 'active' | 'paused' | 'eliminated';

export interface Supplier {
  id: number;
  name: string;
  code: string;
  categoryId: number | null;
  grade: SupplierGrade;
  status: SupplierStatus;
  contact: string;
  phone: string;
  email: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

// ===== 品类 =====
export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  kraljicX: number;  // 供应风险 1-5
  kraljicY: number;  // 采购影响 1-5
  strategy: string;  // 品类战略
  note: string;
  createdAt: number;
}

// Kraljic 象限
export type KraljicQuadrant = 'strategic' | 'bottleneck' | 'leverage' | 'routine';

// ===== 洞察 / 战略记录 =====
export type InsightTargetType = 'supplier' | 'category' | 'general';
export type InsightTag = 'strategy' | 'risk' | 'opportunity' | 'observation';

export interface Insight {
  id: number;
  content: string;
  targetType: InsightTargetType;
  targetId: number | null;
  tag: InsightTag;
  createdAt: number;
}

// ===== 调研 =====
export type ResearchType = 'quality' | 'cost' | 'delivery' | 'technology' | 'service' | 'finance' | 'risk' | 'esg' | 'other';

export interface ResearchEntry {
  id: number;
  supplierId: number | null;
  categoryId: number | null;
  type: ResearchType;
  question: string;
  content: string;
  rating: number | null;  // 1-5 评分
  conclusion: string;
  createdAt: number;
}

export interface ResearchTemplate {
  id: number;
  name: string;
  questions: string; // JSON 字符串数组
  createdAt: number;
}

// ===== AI 模型 =====
export interface AiModel {
  id: number;
  name: string;
  baseUrl: string;
  model: string;
  isBuiltin: boolean;
  temperature: number;
  createdAt: number;
}

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ===== 风险（PMP 风险登记册，精简版）=====
export interface Risk {
  id: number;
  title: string;
  targetType: InsightTargetType;
  targetId: number | null;
  probability: number; // 1-5
  impact: number;      // 1-5
  strategy: string;
  status: 'open' | 'mitigating' | 'closed';
  createdAt: number;
}

// ===== 行动项（PMP）=====
export interface ActionItem {
  id: number;
  title: string;
  owner: string;
  dueDate: string | null;
  done: boolean;
  createdAt: number;
}
