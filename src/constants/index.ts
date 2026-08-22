import type {
  InsightTag, KraljicQuadrant, ResearchType, SupplierGrade, SupplierStatus,
} from '../types';

// ===== 主题色（商务专业 + 延续 TapMood 暖色）=====
export const COLORS = {
  background: '#F8F6F3',     // 暖米白
  bgAlt: '#F3EFE9',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F7FB',     // 冷调卡片底（商务感）
  text: '#2D2D2D',
  textSecondary: '#6E6E6E',
  textTertiary: '#757575',    // 深色化，保证浅色背景对比度 ≥4.5:1（WCAG AA）
  border: '#ECECF0',
  borderSubtle: '#E3E3EA',
  accent: '#3F51B5',         // 深靛蓝（主色，专业可信）
  accentDark: '#303F9F',
  accentLight: '#E8EAF6',
  income: '#26A69A',         // 青绿
  danger: '#EF5350',
  warning: '#FFB74D',
};

// ===== 间距 =====
export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64,
};

// ===== 圆角 =====
export const RADIUS = {
  xs: 8, sm: 12, md: 16, lg: 20, xl: 24, pill: 999,
};

// ===== 通用阴影（卡片/按钮商务质感）=====
export const SHADOW = {
  shadowColor: '#3F3A48',
  shadowOpacity: 0.07,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
};

// 主色按钮阴影（略重，稍带立体感）
export const SHADOW_PRIMARY = {
  shadowColor: '#3F51B5',
  shadowOpacity: 0.28,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 5,
};

// ===== 字号 =====
export const FONT_SIZE = {
  xs: 11, sm: 13, md: 15, lg: 18, xl: 22, xxl: 28, xxxl: 36,
};

// ===== 供应商分级 =====
export const SUPPLIER_GRADES: { key: SupplierGrade; label: string; color: string; desc: string }[] = [
  { key: 'strategic', label: '战略', color: '#5C6BC0', desc: '长期战略伙伴，深度协同' },
  { key: 'preferred', label: '优选', color: '#26A69A', desc: '优先合作，重点培育' },
  { key: 'qualified', label: '合格', color: '#66BB6A', desc: '合格供应，正常交易' },
  { key: 'watch', label: '观察', color: '#FFB74D', desc: '待改进，持续观察' },
  { key: 'eliminated', label: '淘汰', color: '#EF5350', desc: '逐步退出/淘汰' },
];

export function getGradeDef(grade: SupplierGrade) {
  return SUPPLIER_GRADES.find((g) => g.key === grade) ?? SUPPLIER_GRADES[2];
}

// ===== 供应商状态 =====
export const SUPPLIER_STATUSES: { key: SupplierStatus; label: string; color: string }[] = [
  { key: 'potential', label: '潜在', color: '#90A4AE' },
  { key: 'active', label: '合作中', color: '#66BB6A' },
  { key: 'paused', label: '暂停', color: '#FFB74D' },
  { key: 'eliminated', label: '淘汰', color: '#EF5350' },
];

export function getStatusDef(status: SupplierStatus) {
  return SUPPLIER_STATUSES.find((s) => s.key === status) ?? SUPPLIER_STATUSES[0];
}

// ===== Kraljic 矩阵 =====
export const KRALJIC_QUADRANTS: {
  key: KraljicQuadrant; label: string; color: string; strategy: string;
}[] = [
  { key: 'strategic', label: '战略型', color: '#5C6BC0', strategy: '战略联盟、长期合同、双源供应、深度协同' },
  { key: 'bottleneck', label: '瓶颈型', color: '#EF5350', strategy: '保障供应、开发替代、安全库存、关系维护' },
  { key: 'leverage', label: '杠杆型', color: '#26A69A', strategy: '竞争性采购、集中招标、价格谈判、供应商替代' },
  { key: 'routine', label: '常规型', color: '#90A4AE', strategy: '简化流程、电子采购、整合供应商、降低交易成本' },
];

// 根据 x(风险) y(影响) 判断象限（1-5，>3 视为高）
export function getKraljicQuadrant(risk: number, impact: number): KraljicQuadrant {
  const highRisk = risk > 3;
  const highImpact = impact > 3;
  if (highRisk && highImpact) return 'strategic';
  if (highRisk && !highImpact) return 'bottleneck';
  if (!highRisk && highImpact) return 'leverage';
  return 'routine';
}

export function getQuadrantDef(q: KraljicQuadrant) {
  return KRALJIC_QUADRANTS.find((x) => x.key === q) ?? KRALJIC_QUADRANTS[3];
}

// ===== 洞察标签 =====
export const INSIGHT_TAGS: { key: InsightTag; label: string; color: string }[] = [
  { key: 'strategy', label: '战略', color: '#5C6BC0' },
  { key: 'risk', label: '风险', color: '#EF5350' },
  { key: 'opportunity', label: '机会', color: '#26A69A' },
  { key: 'observation', label: '观察', color: '#FFB74D' },
];

export function getInsightTagDef(tag: InsightTag) {
  return INSIGHT_TAGS.find((t) => t.key === tag) ?? INSIGHT_TAGS[3];
}

// ===== 调研类型 =====
export const RESEARCH_TYPES: { key: ResearchType; label: string; emoji: string }[] = [
  { key: 'quality', label: '质量', emoji: '✅' },
  { key: 'cost', label: '成本', emoji: '💰' },
  { key: 'delivery', label: '交付', emoji: '🚚' },
  { key: 'technology', label: '技术', emoji: '🔬' },
  { key: 'service', label: '服务', emoji: '🤝' },
  { key: 'finance', label: '财务', emoji: '🏦' },
  { key: 'risk', label: '风险', emoji: '⚠️' },
  { key: 'esg', label: 'ESG', emoji: '🌱' },
  { key: 'other', label: '其他', emoji: '📌' },
];

export function getResearchTypeDef(type: ResearchType) {
  return RESEARCH_TYPES.find((t) => t.key === type) ?? RESEARCH_TYPES[RESEARCH_TYPES.length - 1];
}

// ===== AI 内置模型模板 =====
// 所有模板均为 OpenAI 兼容接口（POST {baseUrl}/chat/completions，Bearer 鉴权）
// MiniMax：国内站用 api.minimax.chat（国际账号才用 api.minimaxi.com，国内不可达会导致报错）
export const AI_MODEL_PRESETS: { name: string; baseUrl: string; model: string }[] = [
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: 'MiniMax', baseUrl: 'https://api.minimax.chat/v1', model: 'MiniMax-Text-01' },
  { name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { name: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'Ollama 本地', baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
];

// ===== 全局事件 =====
export const SCM_EVENTS = {
  SUPPLIER_CHANGED: 'scm:supplier_changed',
  CATEGORY_CHANGED: 'scm:category_changed',
  INSIGHT_CHANGED: 'scm:insight_changed',
  RESEARCH_CHANGED: 'scm:research_changed',
  DATA_IMPORTED: 'scm:data_imported',
} as const;

// ===== 调研模板（CPSM 视角预置）=====
export const BUILTIN_RESEARCH_TEMPLATES: { name: string; questions: string[] }[] = [
  {
    name: '供应商准入评估',
    questions: [
      '供应商的基本资质与认证情况如何？',
      '质量体系（如 ISO9001）是否完备？',
      '主要生产设备与产能规模？',
      '财务状况是否稳健？',
      '主要客户与行业口碑？',
    ],
  },
  {
    name: '质量与交付（QCD）',
    questions: [
      '来料合格率与质量历史表现？',
      '交期准时率如何？',
      '是否有质量问题处理与追溯机制？',
      '价格竞争力与成本结构？',
      '产能弹性与突发订单响应能力？',
    ],
  },
  {
    name: '供应风险评估',
    questions: [
      '是否单一供应来源？',
      '供应链地理集中风险？',
      '财务脆弱性与持续经营风险？',
      '关键原材料供应稳定性？',
      '合规、环境与社会责任表现？',
    ],
  },
];
