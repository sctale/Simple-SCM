# 随身供应链 Simple-SCM

一款融合 **CPSM（供应管理专业认证）** 与 **PMP（项目管理专业认证）** 理念的移动端供应商战略管理 + 调研工具。

> 装在口袋里的「供应商战略笔记本 + 调研工作台」，延续 TapMood / TapLedger 的暖色极简设计语言，数据本地存储、隐私优先。

## 功能特性

- **供应商管理**：档案 + 五级分级（战略/优选/合格/观察/淘汰）+ 生命周期状态 + 一页画像
- **品类战略**：Kraljic 矩阵四象限定位（供应风险 × 采购影响）+ 战略沉淀 + 象限策略提示
- **供应商调研**：随时记录调研问题/发现/评分/结论，预置 CPSM 视角调研模板（准入评估/QCD/风险）
- **战略洞察**：首页 3 秒记录一句话洞察，自动打标签（战略/风险/机会/观察）
- **AI 智能助手**：**自定义接入模型**，内置 DeepSeek/MiniMax/通义/智谱/Kimi/OpenAI/Ollama 模板，支持自定义 Base URL；调研问题生成、SWOT 分析、战略建议、风险识别
- **风险登记册**（PMP）：概率×影响矩阵 + 应对策略
- **行动项**（PMP）：待办 + 责任人 + 勾选完成
- **数据备份**：JSON 导出/导入（合并/替换），本地存储
- **CSV 批量导入**：供应商 / 品类一键导入 CSV 表格，未知品类自动创建、中文分级/状态自动映射、重复项跳过

## 技术栈

- React Native + Expo SDK 56 + TypeScript（strict）
- expo-sqlite（本地数据存储）
- expo-secure-store（API Key 加密存储）
- react-native-svg（Kraljic 矩阵可视化）
- 原生 fetch（OpenAI 兼容接口调用）

## 安装与运行

```bash
npm install
npx expo start
npx expo start --android
```

## 构建 Android APK

```bash
npx expo prebuild --platform android
cd android
.\gradlew assembleRelease
# 输出：android\app\build\outputs\apk\release\app-release.apk
```

## AI 模型接入

1. 进入「我的 → AI 模型」，选择内置模型（DeepSeek/通义/智谱/Kimi 等）或「添加自定义模型」
2. 点击模型右侧「Key」，粘贴对应平台的 API Key（本地加密存储）
3. 打开「AI 助手」，即可进行调研问题生成、供应商分析、战略建议

兼容 OpenAI Chat Completions 协议（`/chat/completions`），支持任意自定义 Base URL。

## 项目结构

```
src/
├── components/         # TabBar / Modal / Toast / KraljicMatrix / AiChatModal
├── screens/            # 首页 / 供应商 / 品类 / 调研 / 我的
├── database/scmDB.ts   # SQLite 全部 CRUD + 数据导入
├── constants/          # 设计令牌 + 分级/Kraljic/模型模板定义
├── types/              # 类型定义
└── utils/              # 日期 / AI 客户端 / 备份 / 触感
```

## 版本

当前版本：0.1.7
